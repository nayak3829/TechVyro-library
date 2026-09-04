import { createAdminClient } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { enqueuePdfJob } from "@/lib/pdf-jobs"
import { NextResponse } from "next/server"
import { nextDailyDigestAt } from "@/lib/pdf-job-runner"
import { publishInAppNotification } from "@/lib/notifications"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(extractToken(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = (await params).id
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid PDF id" }, { status: 400 })
  const body = await request.json().catch(() => ({}))
  const action = body.action
  if (!["publish", "reject", "retry"].includes(action)) return NextResponse.json({ error: "Action must be publish, reject, or retry" }, { status: 400 })
  const db = createAdminClient()
  const { data: pdf, error: readError } = await db.from("pdfs").select("id,title,publish_status,visibility,review_warnings,notification_preference,scheduled_at").eq("id", id).maybeSingle()
  if (readError) return NextResponse.json({ error: "Failed to load PDF" }, { status: 500 })
  if (!pdf) return NextResponse.json({ error: "PDF not found" }, { status: 404 })
  if (action === "retry") {
    const result = await db.from("pdfs").update({
      processing_status: "queued", processing_attempts: 0, processing_error: null, processing_completed_at: null,
      notification_state: "not_sent", notification_attempts: 0, notification_error: null,
      notification_sent_at: null, notification_claim_token: null, notification_claimed_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", id).select().single()
    if (result.error) return NextResponse.json({ error: "Failed to retry processing" }, { status: 500 })
    await enqueuePdfJob(id, "process")
    return NextResponse.json({ pdf: result.data })
  }
  const warnings = Array.isArray(pdf.review_warnings) ? pdf.review_warnings : []
  if (action === "publish" && warnings.length && body.acknowledgeWarnings !== true) {
    return NextResponse.json({ error: "Warning acknowledgment is required", warnings }, { status: 409 })
  }
  const status = action === "publish" ? "published" : "rejected"
  const result = await db.from("pdfs").update({
    publish_status: status, visibility: action === "publish" ? "public" : "private",
    ...(action === "publish" ? {
      notification_state: "not_sent", notification_attempts: 0, notification_error: null,
      notification_sent_at: null, notification_claim_token: null, notification_claimed_at: null,
    } : {}),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select().single()
  if (result.error) return NextResponse.json({ error: "Failed to update publish status" }, { status: 500 })
  if (action === "publish" && pdf.notification_preference !== "none") {
    const availableAt = pdf.notification_preference === "daily"
      ? nextDailyDigestAt().toISOString()
      : pdf.scheduled_at || undefined
    await enqueuePdfJob(id, "notify", {}, availableAt)
  }
  // This inbox event is intentionally independent from Telegram delivery.
  // Publish transitions are idempotent at the notification table boundary.
  if (action === "publish" && (pdf.publish_status !== "published" || pdf.visibility !== "public")) {
    try {
      await publishInAppNotification({
        kind: "pdf", entityId: id, title: `New PDF: ${pdf.title}`, body: "A new PDF is now available.",
        href: `/pdf/${id}`, payload: { pdfId: id },
      })
    } catch (error) {
      console.error("[notifications] PDF fan-out failed:", error)
    }
  }
  return NextResponse.json({ pdf: result.data })
}