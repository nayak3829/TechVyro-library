import { createAdminClient } from "@/lib/supabase/admin"

export type PdfJobType = "process" | "notify" | "cleanup"

/** Idempotent enqueue which can also revive terminal jobs without stealing work. */
export async function enqueuePdfJob(
  pdfId: string | null,
  jobType: PdfJobType,
  payload: Record<string, unknown> = {},
  availableAt?: string,
) {
  const db = createAdminClient()
  const identity = jobType === "cleanup" ? String(payload.bucket || "pdfs") + ":" + String(payload.path || "") : pdfId
  const idempotencyKey = `${jobType}:${identity}`
  const now = new Date().toISOString()
  const queuedAt = availableAt || (jobType === "cleanup"
    ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    : now)
  // This conditional update is the important part: queued/running rows are
  // intentionally untouched, including a live worker's lease. Terminal rows
  // are reset in one database mutation before being made available again.
  const reset = await db.from("pdf_jobs").update({
    status: "queued", attempts: 0, last_error: null, completed_at: null,
    leased_at: null, lease_expires_at: null, lease_token: null,
    available_at: queuedAt, payload, updated_at: now,
  }).eq("idempotency_key", idempotencyKey).in("status", ["completed", "failed", "dead"])
    .select().maybeSingle()
  if (reset.error) return reset
  if (reset.data) return reset
  // No terminal row existed. Insert is race-safe: an active row that appears
  // between the conditional update and this insert wins the unique key.
  const { data, error } = await db.from("pdf_jobs").upsert({
    pdf_id: pdfId, job_type: jobType, idempotency_key: idempotencyKey,
    status: "queued",
    available_at: queuedAt,
    payload,
    updated_at: now,
  }, { onConflict: "idempotency_key", ignoreDuplicates: true }).select().maybeSingle()
  return { data, error }
}
