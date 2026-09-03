import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"
import { escapeTelegramHtml, isAdminChatSessionId } from "@/lib/admin-chat-validation"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const sessionId = body?.sessionId
    const reason = body?.reason
    if (!isAdminChatSessionId(sessionId)) {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 })
    }
    if (!isAdminConfigured()) return NextResponse.json({ ok: true })

    const supabase = createAdminClient()
    const { data: session, error: sessionError } = await supabase
      .from("admin_chat_sessions")
      .select("id, student_name")
      .eq("id", sessionId)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (!session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 })
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("admin-chat/end:", err)
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 })
  }
}
