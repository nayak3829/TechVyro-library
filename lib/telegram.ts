import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

export async function sendTelegramMessage(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return
  if (!isAdminConfigured()) return

  try {
    const supabase = createAdminClient()

    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general_settings")
      .single()

    const chatId: string | null = (data?.value as Record<string, string>)?.telegramChatId || null
    if (!chatId) return

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    })
  } catch {
  }
}
