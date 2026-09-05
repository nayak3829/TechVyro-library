import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

interface InlineButton {
  text: string
  callback_data?: string
  url?: string
}

interface TelegramOptions {
  parse_mode?: "HTML" | "Markdown"
  disable_web_page_preview?: boolean
  reply_markup?: {
    inline_keyboard?: InlineButton[][]
    force_reply?: boolean
    selective?: boolean
    remove_keyboard?: boolean
  }
  reply_to_message_id?: number
}

type FetchLike = typeof fetch

export async function sendTelegramRequest(
  token: string,
  chatId: string,
  text: string,
  options: TelegramOptions = {},
  fetcher: FetchLike = fetch,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<number | null> {
  const payload = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: options.parse_mode ?? "HTML",
    disable_web_page_preview: options.disable_web_page_preview ?? true,
    ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
    ...(options.reply_to_message_id ? { reply_to_message_id: options.reply_to_message_id } : {}),
  })
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(10_000),
      })
      const data = await response.json().catch(() => null) as {
        ok?: boolean
        result?: { message_id?: number }
        parameters?: { retry_after?: number }
      } | null
      if (response.ok && data?.ok !== false && typeof data?.result?.message_id === "number") {
        return data.result.message_id
      }
      if (response.status !== 429 && response.status < 500) return null
      if (attempt < 2) {
        const headerSeconds = Number(response.headers.get("retry-after"))
        const apiSeconds = Number(data?.parameters?.retry_after)
        const retryMilliseconds = Number.isFinite(apiSeconds) && apiSeconds > 0
          ? apiSeconds * 1000
          : Number.isFinite(headerSeconds) && headerSeconds > 0
            ? headerSeconds * 1000
            : 300 * 2 ** attempt
        await sleep(Math.min(retryMilliseconds, 5_000))
      }
    } catch {
      if (attempt < 2) await sleep(300 * 2 ** attempt)
    }
  }
  return null
}

async function getTelegramConfig(): Promise<{ token: string; chatId: string } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !isAdminConfigured()) return null

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "general_settings")
    .single()

  const chatId: string | null = (data?.value as Record<string, string>)?.telegramChatId || null
  if (!chatId) return null

  return { token, chatId }
}

export async function sendTelegramMessage(
  text: string,
  options: TelegramOptions = {}
): Promise<number | null> {
  try {
    const cfg = await getTelegramConfig()
    if (!cfg) return null

    return await sendTelegramRequest(cfg.token, cfg.chatId, text, options)
  } catch {
    return null
  }
}

export async function sendTelegramToChat(
  token: string,
  chatId: string,
  text: string,
  options: TelegramOptions = {}
): Promise<number | null> {
  try {
    return await sendTelegramRequest(token, chatId, text, options)
  } catch {
    return null
  }
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) {
      await response.body?.cancel().catch(() => {})
      console.error(`[telegram] answerCallbackQuery failed with HTTP ${response.status}`)
      return false
    }
    return true
  } catch {
    return false
  }
}
