import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"
import {
  ADMIN_CHAT_MESSAGE_MAX_LENGTH,
  escapeTelegramHtml,
  getBoundedText,
  getTelegramSessionCallbackData,
  isAdminChatSessionId,
} from "@/lib/admin-chat-validation"
import {
  checkAdminChatRateLimit,
  getAdminChatSessionState,
  rateLimitedResponse,
} from "@/lib/admin-chat-security"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const sessionId = body?.sessionId
    const message = getBoundedText(body?.message, ADMIN_CHAT_MESSAGE_MAX_LENGTH)
    if (!isAdminChatSessionId(sessionId) || !message) {
      return NextResponse.json({ error: "A valid sessionId and a message of 2,000 characters or fewer are required" }, { status: 400 })
    }
    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 })
    }
    const rateLimit = await checkAdminChatRateLimit("send", req, sessionId)
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfterSeconds)

    const supabase = createAdminClient()
    // Do not trust a client-supplied name. Looking up the capability first
    // also prevents inserts and updates for guessed or expired session IDs.
    const { data: session, error: sessionError } = await supabase
      .from("admin_chat_sessions")
      .select("id, student_name, created_at, last_message_at")
      .eq("id", sessionId)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (!session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 })
    }
    if (getAdminChatSessionState(session) === "expired") {
      return NextResponse.json({ error: "Session expired" }, { status: 410 })
    }

    // Get message count for context
    const { count: msgCount, error: countError } = await supabase
      .from("admin_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
    if (countError) throw countError

    const msgNum = (msgCount ?? 0) + 1
    const name = session.student_name || "Student"
    const quickReplyCallback = getTelegramSessionCallbackData("reply", sessionId)
    if (!quickReplyCallback) {
      throw new Error("Session ID cannot be encoded as Telegram callback data")
    }
    const timeStr = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit", minute: "2-digit", hour12: true,
    })

    // Rich message format with inline Quick Reply button
    const text =
       `📨 <b>${escapeTelegramHtml(name)}</b>  <code>#${sessionId}</code>\n` +
      `━━━━━━━━━━━━━━━━\n` +
       `${escapeTelegramHtml(message)}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🕐 ${timeStr}  •  💬 Msg #${msgNum}`

    const telegramMsgId = await sendTelegramMessage(text, {
      reply_markup: {
        inline_keyboard: [[
          { text: "✏️ Quick Reply", callback_data: quickReplyCallback },
          { text: "📋 Sessions", callback_data: "sessions" },
        ]],
      },
    })

    // Save to DB
    const { data, error } = await supabase
      .from("admin_chat_messages")
      .insert({
        session_id: sessionId,
        sender: "student",
        message,
        telegram_message_id: telegramMsgId,
      })
      .select("id, created_at")
      .single()

    if (error) throw error

    const { error: updateError } = await supabase
      .from("admin_chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId)
    if (updateError) throw updateError

    return NextResponse.json({ success: true, messageId: data.id })
  } catch (err) {
    console.error("admin-chat/send:", err)
    return NextResponse.json({ error: "Failed to send" }, { status: 500 })
  }
}
