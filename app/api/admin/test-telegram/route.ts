import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

export async function GET() {
  const result: Record<string, unknown> = {}

  // Show all env var NAMES that contain "TELEGRAM" (safe — no values shown)
  const allKeys = Object.keys(process.env)
  result.env_keys_with_telegram = allKeys.filter(k => k.toUpperCase().includes("TELEGRAM"))
  result.env_keys_with_bot = allKeys.filter(k => k.toUpperCase().includes("BOT"))

  // 1. Check token — try multiple possible names
  const token =
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.telegram_bot_token ||
    process.env.TELEGRAM_TOKEN ||
    process.env.BOT_TOKEN

  result.TELEGRAM_BOT_TOKEN = !!process.env.TELEGRAM_BOT_TOKEN
  result.telegram_bot_token_lower = !!process.env.telegram_bot_token
  result.TELEGRAM_TOKEN = !!process.env.TELEGRAM_TOKEN
  result.BOT_TOKEN = !!process.env.BOT_TOKEN
  result.token_found = !!token
  result.token_preview = token ? `${token.slice(0, 12)}...` : "NOT FOUND IN ANY VARIATION"

  // 2. Check Supabase admin
  result.supabase_configured = isAdminConfigured()

  if (!token) {
    return NextResponse.json({
      ...result,
      error: "Token not found. Check env_keys_with_telegram above to see what name Vercel used.",
      fix: "In Vercel, add env var with EXACT name: TELEGRAM_BOT_TOKEN"
    })
  }

  // 3. Verify token with Telegram
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const meData = await meRes.json()
    result.bot_valid = meData.ok
    result.bot_name = meData.result?.first_name || "Unknown"
    result.bot_username = meData.result?.username || "Unknown"
    if (!meData.ok) {
      return NextResponse.json({ ...result, error: "Token invalid — get new one from @BotFather" })
    }
  } catch {
    return NextResponse.json({ ...result, error: "Could not reach Telegram API" })
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
    result.chat_id_value = chatId || "NOT SET — Admin Panel → General Settings → Telegram Chat ID"
  }

  if (!chatId) {
    return NextResponse.json({ ...result, error: "Chat ID missing — set it in Admin Panel → General Settings → Telegram Chat ID" })
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
    result.send_error = sendData.ok ? null : sendData.description
  } catch {
    result.message_sent = false
  }

  return NextResponse.json({ ...result, success: true })
}
