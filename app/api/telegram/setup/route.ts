import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { deriveTelegramWebhookSecret } from "@/lib/telegram-webhook-auth"

const TELEGRAM_TIMEOUT_MS = 10_000

function getWebhookBaseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (!configured) return null
  try {
    const url = new URL(configured)
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    ) return null
    return url.origin
  } catch {
    return null
  }
}

async function telegramRequest(token: string, method: string, init?: RequestInit) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    ...init,
    signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data || data.ok !== true) {
    throw new Error(typeof data?.description === "string" ? data.description : "Telegram API request failed")
  }
  return data
}

export async function POST(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is not configured in secrets" }, { status: 500 })

  const webhookSecret = deriveTelegramWebhookSecret()
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "SESSION_SECRET is not configured; secure Telegram webhook setup cannot continue" },
      { status: 500 }
    )
  }

  const siteUrl = getWebhookBaseUrl()
  if (!siteUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SITE_URL must be a valid HTTPS origin without a path, query, or credentials" },
      { status: 500 }
    )
  }

  const webhookUrl = `${siteUrl}/api/telegram-webhook`

  try {
    const data = await telegramRequest(token, "setWebhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        secret_token: webhookSecret,
        drop_pending_updates: true,
      }),
    })
    return NextResponse.json({ ok: true, webhookUrl, message: data.description || "Webhook set successfully" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set webhook" },
      { status: 502 }
    )
  }
}

export async function GET(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 })

  try {
    const [data, botData] = await Promise.all([
      telegramRequest(token, "getWebhookInfo"),
      telegramRequest(token, "getMe"),
    ])
    return NextResponse.json({
      ok: true,
      webhook: data.result,
      bot: botData.result,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to verify Telegram bot" },
      { status: 502 }
    )
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 })

  try {
    const data = await telegramRequest(token, "deleteWebhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: true }),
    })
    return NextResponse.json({ ok: true, message: data.description })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to deactivate webhook" },
      { status: 502 }
    )
  }
}
