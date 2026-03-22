import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const { sessionId, message, studentName } = await req.json()
    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ error: "sessionId and message required" }, { status: 400 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 })
    }

    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return NextResponse.json({ error: "No bot token" }, { status: 500 })

    const supabase = createAdminClient()

    // Get telegram chat ID from settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general_settings")
      .single()

    const chatId: string | null = (settings?.value as Record<string, string>)?.telegramChatId || null
    if (!chatId) return NextResponse.json({ error: "Telegram not configured" }, { status: 500 })

    // Send to Telegram and get message_id back
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `💬 <b>[#${sessionId}] ${studentName || "Student"}:</b>\n${message.trim()}`,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    })

    const tgData = await tgRes.json()
    const telegramMessageId: number | null = tgData?.result?.message_id || null

    // Save to DB
    const { data, error } = await supabase
      .from("admin_chat_messages")
      .insert({
        session_id: sessionId,
        sender: "student",
        message: message.trim(),
        telegram_message_id: telegramMessageId,
      })
      .select("id, created_at")
      .single()

    if (error) throw error

    // Update session last_message_at
    await supabase
      .from("admin_chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId)

    return NextResponse.json({ success: true, messageId: data.id })
  } catch (err) {
    console.error("admin-chat/send:", err)
    return NextResponse.json({ error: "Failed to send" }, { status: 500 })
  }
}
