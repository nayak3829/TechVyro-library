import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const message = body?.message

    if (!message?.text) return NextResponse.json({ ok: true })
    if (!isAdminConfigured()) return NextResponse.json({ ok: true })

    const supabase = createAdminClient()

    // Get admin's telegram chat ID to verify it's really admin
    const { data: settings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general_settings")
      .single()

    const adminChatId = String((settings?.value as Record<string, string>)?.telegramChatId || "")
    const fromChatId = String(message.chat?.id || "")

    // Only process messages from admin's chat
    if (!adminChatId || fromChatId !== adminChatId) {
      return NextResponse.json({ ok: true })
    }

    const text: string = message.text.trim()

    // Find session to reply to:
    // Priority 1: admin used Telegram "Reply" feature → match by telegram_message_id
    // Priority 2: most recent active session
    let sessionId: string | null = null

    const replyToMsgId: number | null = message.reply_to_message?.message_id || null

    if (replyToMsgId) {
      const { data: origMsg } = await supabase
        .from("admin_chat_messages")
        .select("session_id")
        .eq("telegram_message_id", replyToMsgId)
        .maybeSingle()

      if (origMsg?.session_id) sessionId = origMsg.session_id
    }

    // Fallback: most recent session (last 30 min)
    if (!sessionId) {
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: recent } = await supabase
        .from("admin_chat_sessions")
        .select("id")
        .gte("last_message_at", cutoff)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recent?.id) sessionId = recent.id
    }

    if (!sessionId) return NextResponse.json({ ok: true })

    // Save admin's reply to DB
    await supabase.from("admin_chat_messages").insert({
      session_id: sessionId,
      sender: "admin",
      message: text,
    })

    await supabase
      .from("admin_chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("telegram-webhook:", err)
    return NextResponse.json({ ok: true })
  }
}
