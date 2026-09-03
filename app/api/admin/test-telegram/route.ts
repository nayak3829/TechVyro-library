import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"

export async function GET(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result: Record<string, unknown> = {}

  // Check the documented bot token configuration only.
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.telegram_bot_token ||
    process.env.TELEGRAM_TOKEN ||
    process.env.BOT_TOKEN

  result.supabase_configured = isAdminConfigured()

  if (!token) {
    return NextResponse.json({
      ...result,
      error: "Telegram bot token is not configured.",
    }, { status: 503 })
  }

  // 3. Verify token with Telegram
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const meData = await meRes.json()
    result.bot_valid = meData.ok
    result.bot_name = meData.result?.first_name || "Unknown"
    result.bot_username = meData.result?.username || "Unknown"
    if (!meData.ok) {
      return NextResponse.json({ ...result, error: "Telegram rejected the bot token." }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ ...result, error: "Could not reach Telegram API" }, { status: 502 })
  }

  // 4. Check Chat ID in Supabase
  let chatId = ""
  if (isAdminConfigured()) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general_settings")
      .single()
    chatId = String((data?.value as Record<string, string>)?.telegramChatId || "")
    result.chat_id_configured = !!chatId
  }

  if (!chatId) {
    return NextResponse.json({ ...result, error: "Chat ID is not configured." }, { status: 400 })
  }

  // 5. Send test message
  try {
    const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ <b>TechVyro Bot Test</b>\n\nYour Telegram bot is working!",
        parse_mode: "HTML",
      }),
    })
    const sendData = await sendRes.json()
    result.message_sent = sendData.ok
    if (!sendRes.ok || !sendData.ok) {
      return NextResponse.json({
        ...result,
        success: false,
        error: typeof sendData.description === "string" ? sendData.description : "Telegram rejected the test message.",
      }, { status: 502 })
    }
  } catch {
    return NextResponse.json({
      ...result,
      message_sent: false,
      success: false,
      error: "Could not send the Telegram test message.",
    }, { status: 502 })
  }

  return NextResponse.json({ ...result, success: true })
}
