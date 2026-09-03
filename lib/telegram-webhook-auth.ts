import { createHmac, timingSafeEqual } from "node:crypto"

const WEBHOOK_SECRET_CONTEXT = "techvyro:telegram:webhook:v1"

/**
 * Telegram accepts 1-256 characters from A-Z, a-z, 0-9, _ and -.
 * A SHA-256 hex digest is stable, valid for Telegram, and does not reveal
 * either server-side secret used to derive it.
 */
export function deriveTelegramWebhookSecret(
  sessionSecret = process.env.SESSION_SECRET,
  botToken = process.env.TELEGRAM_BOT_TOKEN
): string | null {
  if (!sessionSecret || !botToken) return null

  return createHmac("sha256", sessionSecret)
    .update(WEBHOOK_SECRET_CONTEXT)
    .update("\0")
    .update(botToken)
    .digest("hex")
}

export function verifyTelegramWebhookSecret(
  suppliedSecret: string | null,
  expectedSecret = deriveTelegramWebhookSecret()
): boolean {
  if (!suppliedSecret || !expectedSecret) return false

  const supplied = Buffer.from(suppliedSecret, "utf8")
  const expected = Buffer.from(expectedSecret, "utf8")
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}