import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"
import { escapeTelegramHtml } from "@/lib/admin-chat-validation"
import {
  ADMIN_CHAT_SESSION_COOKIE,
  ADMIN_CHAT_SESSION_COOKIE_OPTIONS,
  getAdminChatSessionId,
  isAdminChatSessionSecurityConfigured,
} from "@/lib/admin-chat-security"
import { isRequestOriginAllowed } from "@/lib/request-origin"

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_CHAT_SESSION_COOKIE, "", {
    ...ADMIN_CHAT_SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  })
  return response
}

export async function POST(req: Request) {
  try {
    if (!isRequestOriginAllowed(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!isAdminChatSessionSecurityConfigured()) {
      return NextResponse.json({ error: "Admin chat session security is not configured" }, { status: 500 })
    }
    const sessionId = getAdminChatSessionId(req)
    if (!sessionId) {
      return clearSessionCookie(
        NextResponse.json({ error: "Invalid or missing chat session" }, { status: 401 })
      )
    }
    const body = await req.json().catch(() => null)
    const reason = body?.reason
    if (!isAdminConfigured()) return clearSessionCookie(NextResponse.json({ ok: true }))

    const supabase = createAdminClient()
    const { data: session, error: sessionError } = await supabase
      .from("admin_chat_sessions")
      .select("id, student_name")
      .eq("id", sessionId)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (!session) {
      return clearSessionCookie(
        NextResponse.json({ error: "Unknown session" }, { status: 404 })
      )
    }

    const { count, error: countError } = await supabase
      .from("admin_chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
    if (countError) throw countError

    const msgCount = count ?? 0
    const name = session.student_name || "Student"

    // The deployed table has no closed_at/expires_at column. Delete the
    // messages and capability instead, so send/poll and Telegram replies can
    // no longer use a supposedly ended session.
    const { error: deleteMessagesError } = await supabase
      .from("admin_chat_messages")
      .delete()
      .eq("session_id", sessionId)
    if (deleteMessagesError) throw deleteMessagesError
    const { error: deleteSessionError } = await supabase
      .from("admin_chat_sessions")
      .delete()
      .eq("id", sessionId)
    if (deleteSessionError) throw deleteSessionError

    let icon = "🔴"
    let reasonText = "User left the chat"
    if (reason === "tab_closed") { icon = "🚪"; reasonText = "Tab/browser closed" }
    else if (reason === "ended_by_user") { icon = "✅"; reasonText = "Student ended the chat" }
    else if (reason === "timeout") { icon = "⏱️"; reasonText = "Session timeout" }

    const text =
      `${icon} <b>Chat Ended</b>\n` +
      `━━━━━━━━━━━━━━━━\n` +
       `👤 <b>Student:</b> ${escapeTelegramHtml(name)}\n` +
      `🔑 <b>Session:</b> <code>#${sessionId}</code>\n` +
      `💬 <b>Messages:</b> ${msgCount}\n` +
      `📌 <b>Reason:</b> ${reasonText}\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `<i>This session is now closed.</i>`

    await sendTelegramMessage(text)

    return clearSessionCookie(NextResponse.json({ ok: true }))
  } catch (err) {
    console.error("admin-chat/end:", err)
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 })
  }
}
