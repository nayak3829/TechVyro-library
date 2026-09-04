import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export const NOTIFICATION_KINDS = ["pdf", "quiz", "test"] as const
export type NotificationKind = typeof NOTIFICATION_KINDS[number]

const preferenceColumn: Record<NotificationKind, "pdfs" | "quizzes" | "tests"> = {
  pdf: "pdfs",
  quiz: "quizzes",
  test: "tests",
}
const ENTITY_ID = /^[A-Za-z0-9_-]{1,160}$/

export type PublishInAppNotification = {
  kind: NotificationKind
  entityId: string
  title: string
  body?: string
  href: string
  payload?: Record<string, string | number | boolean | null>
}

function validText(value: unknown, maximum: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= maximum && (allowEmpty || value.trim().length > 0)
}

function validPayload(value: unknown): value is Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value === undefined
  const entries = Object.entries(value)
  return entries.length <= 20 && entries.every(([key, item]) =>
    key.length > 0 && key.length <= 64 &&
    (item === null || typeof item === "string" || typeof item === "boolean" || (typeof item === "number" && Number.isFinite(item))) &&
    (typeof item !== "string" || item.length <= 500),
  ) && JSON.stringify(value).length <= 4096
}

/**
 * Fans a public-content event out to opted-in accounts. The unique
 * (user_id,event_key) constraint makes retries idempotent.
 */
export async function publishInAppNotification(input: PublishInAppNotification): Promise<{ recipients: number }> {
  if (!NOTIFICATION_KINDS.includes(input.kind) || !ENTITY_ID.test(input.entityId)) {
    throw new Error("Invalid notification kind or entity")
  }
  if (!validText(input.title, 160) || !validText(input.body ?? "", 500, true) ||
      input.href.length > 300 || !/^\/[A-Za-z0-9/_-]*$/.test(input.href) || !validPayload(input.payload)) {
    throw new Error("Invalid notification content")
  }

  const db = createAdminClient()
  const eventKey = `${input.kind}:published:${input.entityId}`
  const { data: preferences, error: preferenceError } = await db
    .from("notification_preferences")
    .select("user_id")
    .eq(preferenceColumn[input.kind], true)
  if (preferenceError) throw new Error(`Could not load notification recipients: ${preferenceError.message}`)

  const recipients = preferences || []
  for (let start = 0; start < recipients.length; start += 500) {
    const rows = recipients.slice(start, start + 500).map(({ user_id }: { user_id: string }) => ({
      user_id,
      kind: input.kind,
      event_key: eventKey,
      title: input.title.trim(),
      body: (input.body || "").trim(),
      href: input.href,
      payload: input.payload || {},
    }))
    const { error } = await db.from("notifications").upsert(rows, {
      onConflict: "user_id,event_key",
      ignoreDuplicates: true,
    })
    if (error) throw new Error(`Could not create notifications: ${error.message}`)
  }
  return { recipients: recipients.length }
}