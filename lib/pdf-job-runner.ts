import { createAdminClient } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"
import { escapeTelegramHtml } from "@/lib/admin-chat-validation"
import { analyzePdfOnServer } from "@/lib/pdf-server-analysis"

const LEASE_MS = 60_000
const MAX_BATCH = 10
const MAX_ATTEMPTS = 5
const MAX_DIGEST_ITEMS = 20
const SAFE_PDF_PATH = /^[0-9]{10,20}-[^/\\]+\.pdf$/i
const SAFE_THUMBNAIL_PATH = /^thumbnails\/[0-9]{10,20}-[^/\\]+\.(?:jpg|jpeg|webp)$/i
const randomUUID = () => globalThis.crypto.randomUUID()

export function isSafePdfJobObjectPath(bucket: unknown, path: unknown): path is string {
  return bucket === "pdfs" && typeof path === "string" && (SAFE_PDF_PATH.test(path) || SAFE_THUMBNAIL_PATH.test(path))
}

export function hasServerVerifiedPdfHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value)
}

/** The next 09:00 wall-clock time in Asia/Kolkata (IST has no DST). */
export function nextDailyDigestAt(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  const localTodayAtNine = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 9)
  // IST is UTC+05:30.
  const candidate = new Date(localTodayAtNine - 330 * 60_000)
  return candidate.getTime() > now.getTime() ? candidate : new Date(candidate.getTime() + 86_400_000)
}

type Job = {
  id: string; pdf_id: string | null; job_type: "process" | "notify" | "cleanup"
  status: "queued" | "running"; attempts: number; max_attempts: number
  payload: Record<string, unknown>; lease_token?: string | null
}

function backoff(attempts: number) {
  return new Date(Date.now() + Math.min(60 * 60_000, 5_000 * 2 ** Math.max(0, attempts - 1))).toISOString()
}

async function fail(db: ReturnType<typeof createAdminClient>, job: Job, token: string, error: unknown) {
  const attempts = job.attempts + 1
  await db.from("pdf_jobs").update({
    status: attempts >= Math.min(job.max_attempts || MAX_ATTEMPTS, MAX_ATTEMPTS) ? "dead" : "queued",
    attempts, last_error: error instanceof Error ? error.message.slice(0, 500) : "Job failed",
    available_at: backoff(attempts), leased_at: null, lease_expires_at: null, lease_token: null,
    updated_at: new Date().toISOString(),
  }).eq("id", job.id).eq("status", "running").eq("lease_token", token)
}

async function claimNotification(db: ReturnType<typeof createAdminClient>, id: string, token: string) {
  const staleBefore = new Date(Date.now() - LEASE_MS).toISOString()
  const result = await db.from("pdfs").update({
    notification_state: "sending", notification_claim_token: token,
    notification_claimed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", id).in("notification_state", ["not_sent", "sending"])
    .or(`notification_claim_token.is.null,notification_claimed_at.lt.${staleBefore}`).select("id,title")
    .maybeSingle()
  return result.data
}

async function run(db: ReturnType<typeof createAdminClient>, job: Job, token: string) {
  if (job.job_type === "cleanup") {
    const { bucket, path } = job.payload
    if (!isSafePdfJobObjectPath(bucket, path)) throw new Error("Unsafe cleanup path")
    const { data: refs } = await db.from("pdfs").select("id").or(`file_path.eq.${path},thumbnail_path.eq.${path}`).limit(1)
    if (!refs?.length && (await db.storage.from("pdfs").remove([path])).error) throw new Error("Storage cleanup failed")
    return
  }
  if (!job.pdf_id) throw new Error("PDF job is missing pdf_id")
  const { data: pdf, error } = await db.from("pdfs")
    .select("id,title,description,tags,slug,file_path,thumbnail_path,category_id,structure_location,publish_status,notification_preference,notification_state,processing_status,scheduled_at,content_hash,page_count,review_warnings,malware_status")
    .eq("id", job.pdf_id).maybeSingle()
  if (error || !pdf) throw new Error("PDF not found")
  if (job.job_type === "process") {
    // The save endpoint computes this SHA-256 from bytes downloaded directly
    // from storage. Browser analysis is advisory and may be unavailable.
    if (!hasServerVerifiedPdfHash(pdf.content_hash)) throw new Error("Server PDF verification is absent")
    const { data: source, error: downloadError } = await db.storage.from("pdfs").download(pdf.file_path)
    if (downloadError || !source) throw new Error("Stored PDF could not be read")
    const foldersResult = await db.from("site_settings").select("value").eq("key", "folders").maybeSingle()
    const folders = Array.isArray(foldersResult.data?.value) ? foldersResult.data.value : []
    const location = pdf.structure_location as { categoryId?: string } | null
    const structureCategory = folders.flatMap((folder: any) => Array.isArray(folder.categories) ? folder.categories : [])
      .find((category: any) => category.id === location?.categoryId)
    const categoryName = typeof structureCategory?.name === "string" ? structureCategory.name : null
    let categoryId = pdf.category_id
    if (!categoryId && categoryName) {
      const existing = await db.from("categories").select("id").ilike("name", categoryName).maybeSingle()
      if (existing.data?.id) categoryId = existing.data.id
      else {
        const created = await db.from("categories").insert({
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `category-${Date.now()}`,
        }).select("id").single()
        if (!created.error) categoryId = created.data?.id
      }
    }
    const bytes = new Uint8Array(await source.arrayBuffer())
    const analysis = await analyzePdfOnServer(bytes, pdf.title, pdf.content_hash, categoryName)
    let thumbnailPath = pdf.thumbnail_path
    if (!thumbnailPath) {
      thumbnailPath = `thumbnails/${Date.now()}-${pdf.id}.jpg`
      const uploaded = await db.storage.from("pdfs").upload(thumbnailPath, analysis.thumbnail, {
        contentType: "image/jpeg", cacheControl: "3600", upsert: false,
      })
      if (uploaded.error) thumbnailPath = null
    }
    const previousWarnings = Array.isArray(pdf.review_warnings) ? pdf.review_warnings.filter((warning: unknown) =>
      typeof warning === "string" && !warning.includes("Browser PDF analysis was unavailable")
    ) : []
    const processing = pdf.processing_status === "queued" || pdf.processing_status === "processing"
    const result = await db.from("pdfs").update({
      processing_status: processing ? "completed" : pdf.processing_status,
      processing_completed_at: processing ? new Date().toISOString() : undefined,
      page_count: analysis.pageCount,
      malware_status: analysis.malwareStatus,
      review_warnings: [...previousWarnings, ...analysis.warnings],
      thumbnail_path: thumbnailPath,
      category_id: categoryId,
      description: pdf.description || analysis.description,
      tags: Array.isArray(pdf.tags) && pdf.tags.length ? pdf.tags : analysis.tags,
      slug: pdf.slug || analysis.slug,
      processing_error: null, updated_at: new Date().toISOString(),
    }).eq("id", job.pdf_id).eq("processing_status", pdf.processing_status)
    if (result.error) throw new Error("Processing update failed")
    return
  }
  if (pdf.publish_status !== "published" || pdf.notification_preference === "none" ||
    (pdf.scheduled_at && new Date(pdf.scheduled_at).getTime() > Date.now())) return

  const tokenForPdf = randomUUID()
  const claimed = await claimNotification(db, job.pdf_id, tokenForPdf)
  if (!claimed) return // another worker owns it (or it was already sent)

  let digest = [claimed]
  if (pdf.notification_preference === "daily") {
    const { data: due } = await db.from("pdfs").select("id,title,scheduled_at")
      .eq("publish_status", "published").eq("notification_preference", "daily")
      .eq("notification_state", "not_sent").is("notification_claim_token", null)
      .limit(MAX_DIGEST_ITEMS)
    for (const candidate of (due || []) as Array<{ id: string; title: string; scheduled_at?: string | null }>) {
      if (candidate.id === claimed.id) continue
      if (candidate.scheduled_at && new Date(candidate.scheduled_at).getTime() > Date.now()) continue
      if (await claimNotification(db, candidate.id, tokenForPdf)) digest.push(candidate)
    }
  }
  const heading = pdf.notification_preference === "daily" ? "<b>Daily PDF digest</b>" : "<b>New PDF published</b>"
  const body = digest.map((item) => `• ${escapeTelegramHtml(String(item.title || "Untitled"))}`).join("\n")
  if (!(await sendTelegramMessage(`${heading}\n${body}`))) {
    await db.from("pdfs").update({ notification_state: "not_sent", notification_claim_token: null, notification_claimed_at: null })
      .eq("notification_claim_token", tokenForPdf)
    throw new Error("Telegram notification failed")
  }
  await db.from("pdfs").update({
    notification_state: "sent", notification_sent_at: new Date().toISOString(),
    notification_error: null, notification_claim_token: null, notification_claimed_at: null,
  }).eq("notification_claim_token", tokenForPdf)
}

/** Claim and process a small bounded batch. Safe to call from request paths. */
export async function runDuePdfJobs(limit = MAX_BATCH) {
  const db = createAdminClient()
  const count = Math.min(Math.max(Math.floor(limit), 1), MAX_BATCH)
  const now = new Date().toISOString()
  const { data: rows, error } = await db.from("pdf_jobs").select("*")
    .or(`status.eq.queued,and(status.eq.running,lease_expires_at.lt.${now})`).lte("available_at", now)
    .order("available_at").limit(count)
  if (error) return { processed: 0, failed: 0 }
  let processed = 0; let failed = 0
  for (const row of (rows || []) as Job[]) {
    const token = randomUUID()
    const claim = await db.from("pdf_jobs").update({
      status: "running", attempts: row.attempts + 1, lease_token: token, leased_at: now,
      lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString(), updated_at: now,
    }).eq("id", row.id).eq("status", row.status).eq("attempts", row.attempts)
      .or(`lease_expires_at.is.null,lease_expires_at.lt.${now}`).select().maybeSingle()
    if (!claim.data) continue
    try {
      await run(db, row, token)
      const completed = await db.from("pdf_jobs").update({
        status: "completed", completed_at: new Date().toISOString(), leased_at: null,
        lease_expires_at: null, lease_token: null, updated_at: new Date().toISOString(),
      }).eq("id", row.id).eq("status", "running").eq("lease_token", token).select("id").maybeSingle()
      if (completed.data) processed++
    } catch (error) {
      await fail(db, row, token, error); failed++
    }
  }
  return { processed, failed }
}

export async function maybeRunPdfMaintenance() {
  if (maintenanceAt > Date.now()) return
  maintenanceAt = Date.now() + 30_000
  void runDuePdfJobs().catch(() => {})
}
let maintenanceAt = 0