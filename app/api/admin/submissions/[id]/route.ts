import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { UUID } from "@/lib/community-submissions"
import { publishInAppNotification } from "@/lib/notifications"

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { headers: { "Cache-Control": "no-store" } }
function moderationError(error: { message?: string }) {
  const message = error.message || ""
  if (message.includes("conflicting moderation transition")) return { error: "Submission was already moderated differently", status: 409 }
  if (message.includes("duplicate content")) return { error: "An existing PDF already has this exact file content", status: 409 }
  if (message.includes("reservation-bound storage object")) return { error: "The reserved upload is missing and cannot be approved", status: 422 }
  if (message.includes("safety review prevents approval")) return { error: "Submission did not pass PDF safety checks", status: 422 }
  return { error: "Could not moderate submission", status: 400 }
}
export async function GET(request: Request, { params }: Context) {
  if (!verifyAdminToken(extractToken(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...NO_STORE })
  const id = (await params).id
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid submission id" }, { status: 400, ...NO_STORE })
  const db = createAdminClient()
  const { data: row, error } = await db.from("community_submissions").select(
    "id,title,description,file_size,page_count,content_type,content_category,content_subcategory,subject,submitter_name,submitter_email,submitter_note,user_id,status,submitted_at,reviewed_at,reviewed_by,approved_pdf_id,rejection_reason,malware_status,review_warnings,copyright_confirmed,content_hash",
  ).eq("id", id).maybeSingle()
  if (error) return NextResponse.json({ error: "Could not load submission" }, { status: 500, ...NO_STORE })
  if (!row) return NextResponse.json({ error: "Submission not found" }, { status: 404, ...NO_STORE })
  const { content_hash, ...submission } = row
  // Never interpolate PostgREST's filter grammar. Restrict the search token
  // to alphanumerics before passing it as an ilike value.
  const token = String(submission.title).toLowerCase().match(/[a-z0-9]{4,}/)?.[0] || ""
  let similar: Array<{ id: string; title: string }> = []
  if (token) {
    const result = await db.from("pdfs").select("id,title").ilike("title", `%${token}%`).limit(5)
    if (!result.error) similar = result.data || []
  }
  const exact = await db.from("pdfs").select("id,title").eq("content_hash", content_hash).limit(5)
  const duplicateContentWarning = !exact.error && exact.data?.length
    ? { message: "An existing PDF has this exact file content", matches: exact.data }
    : null
  return NextResponse.json({ submission, duplicateWarning: similar.length ? { message: "Similar title already exists", matches: similar } : null, duplicateContentWarning },
    NO_STORE)
}

export async function PATCH(request: Request, { params }: Context) {
  if (!verifyAdminToken(extractToken(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...NO_STORE })
  const id = (await params).id
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid submission id" }, { status: 400, ...NO_STORE })
  const body = await request.json().catch(() => ({}))
  if (!["approve", "reject"].includes(body.action)) return NextResponse.json({ error: "Action must be approve or reject" }, { status: 400, ...NO_STORE })
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (body.action === "reject" && (!reason || reason.length > 1000)) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400, ...NO_STORE })
  const { data, error } = await createAdminClient().rpc("moderate_community_submission", {
    p_submission_id: id, p_action: body.action, p_reason: reason || null, p_reviewed_by: "admin",
  })
  if (error) {
    const mapped = moderationError(error)
    return NextResponse.json({ error: mapped.error }, { status: mapped.status, ...NO_STORE })
  }
  if (body.action === "approve" && data?.approved_pdf_id) {
    try {
      await publishInAppNotification({
        kind: "pdf", entityId: data.approved_pdf_id, title: `PDF approved: ${data.title}`,
        body: "A new PDF was approved and is queued for processing.", href: `/pdf/${data.approved_pdf_id}`, payload: { pdfId: data.approved_pdf_id },
      })
    } catch { /* Publishing succeeded; notification fan-out is nonfatal. */ }
  }
  return NextResponse.json({ submission: data, approvedPdfId: data?.approved_pdf_id ?? null }, NO_STORE)
}