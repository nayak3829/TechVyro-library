import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"
import {
  ADMIN_CHAT_NAME_MAX_LENGTH,
  escapeTelegramHtml,
  getBoundedText,
} from "@/lib/admin-chat-validation"
import {
  ADMIN_CHAT_ABSOLUTE_LIFETIME_MS,
  ADMIN_CHAT_SESSION_COOKIE,
  ADMIN_CHAT_SESSION_COOKIE_OPTIONS,
  checkAdminChatRateLimit,
  createAdminChatSessionCookieValue,
  isAdminChatSessionSecurityConfigured,
  rateLimitedResponse,
} from "@/lib/admin-chat-security"
import { isRequestOriginAllowed } from "@/lib/request-origin"

export async function POST(req: Request) {
  try {
    if (!isRequestOriginAllowed(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!isAdminChatSessionSecurityConfigured()) {
      return NextResponse.json(
        { error: "Admin chat session security is not configured" },
        { status: 500 }
      )
    }
    const rateLimit = await checkAdminChatRateLimit("start", req)
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfterSeconds)

    const body = await req.json().catch(() => null)
    const studentName = getBoundedText(body?.studentName, ADMIN_CHAT_NAME_MAX_LENGTH)
    if (!studentName) {
      return NextResponse.json({ error: "A name of 80 characters or fewer is required" }, { status: 400 })
    }
    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 })
    }

    const sessionId = crypto.randomUUID()
    const supabase = createAdminClient()

    const { error: insertError } = await supabase.from("admin_chat_sessions").insert({
      id: sessionId,
      student_name: studentName,
    })
    if (insertError) throw insertError

    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    })

    // Count active sessions
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const createdCutoff = new Date(Date.now() - ADMIN_CHAT_ABSOLUTE_LIFETIME_MS).toISOString()
    const { count: activeSessions } = await supabase
      .from("admin_chat_sessions")
      .select("id", { count: "exact", head: true })
      .gte("last_message_at", cutoff)
      .gte("created_at", createdCutoff)

    const text =
      `🟢 <b>New Chat Session!</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
       `👤 <b>Student:</b> ${escapeTelegramHtml(studentName)}\n` +
      `🔑 <b>Session:</b> <code>#${sessionId}</code>\n` +
      `🕐 <b>Time:</b> ${now}\n` +
      `👥 <b>Active chats:</b> ${activeSessions ?? 1}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `<i>Use "✏️ Quick Reply" on the student's message or use the Telegram Reply feature.</i>`

    await sendTelegramMessage(text, {
      reply_markup: {
        inline_keyboard: [[
          { text: "📋 Active Sessions", callback_data: "sessions" },
          { text: "❓ Help", callback_data: "help" },
        ]],
      },
    })

    const response = NextResponse.json({ sessionId })
    response.cookies.set(
      ADMIN_CHAT_SESSION_COOKIE,
      createAdminChatSessionCookieValue(sessionId),
      ADMIN_CHAT_SESSION_COOKIE_OPTIONS
    )
    return response
  } catch (err) {
    console.error("admin-chat/start:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
