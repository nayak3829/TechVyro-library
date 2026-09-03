export const ADMIN_CHAT_NAME_MAX_LENGTH = 80
export const ADMIN_CHAT_MESSAGE_MAX_LENGTH = 2_000

// Sessions are opaque capabilities generated with crypto.randomUUID(). Accept
// only the canonical v4 representation that this service issues.
const ADMIN_CHAT_SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const LEGACY_ADMIN_CHAT_SESSION_ID_PATTERN = /^[A-Z0-9]{6,8}$/i

export function isAdminChatSessionId(value: unknown): value is string {
  return typeof value === "string" && ADMIN_CHAT_SESSION_ID_PATTERN.test(value)
}

/**
 * Telegram messages created before sessions became UUID capabilities can still
 * contain the old short IDs. Keep that compatibility at this boundary only;
 * all browser-facing admin-chat endpoints continue to require UUID v4 IDs.
 */
export function getTelegramAdminChatSessionId(value: unknown): string | null {
  if (isAdminChatSessionId(value)) return value
  if (typeof value === "string" && LEGACY_ADMIN_CHAT_SESSION_ID_PATTERN.test(value)) {
    return value.toUpperCase()
  }
  return null
}

export function getTelegramSessionCallbackData(
  action: "reply" | "end",
  sessionId: unknown
): string | null {
  const validSessionId = getTelegramAdminChatSessionId(sessionId)
  if (!validSessionId) return null

  const callbackData = `${action}:${validSessionId}`
  return new TextEncoder().encode(callbackData).byteLength <= 64 ? callbackData : null
}

export function getBoundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  return text.length > 0 && text.length <= maxLength ? text : null
}

export function isValidPollCursor(value: string | null): boolean {
  if (!value) return true
  const time = Date.parse(value)
  return Number.isFinite(time) && time <= Date.now() + 60_000
}

export function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}