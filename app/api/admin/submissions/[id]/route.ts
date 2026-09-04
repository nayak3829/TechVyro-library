import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { UUID } from "@/lib/community-submissions"
import { publishInAppNotification } from "@/lib/notifications"
import { enqueuePdfJob } from "@/lib/pdf-jobs"

type Context = { params: Promise<{ id: string }> }
const NO_STORE = { headers: { "Cache-Control": "no-store" } }
export async function GET(request: Request, { params }: Context) {
  if (!verifyAdminToken(extractToken(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...NO_STORE })
  const id = (await params).id
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid submission id" }, { status: 400, ...NO_STORE })
  const db = createAdminClient()
  const { data: submission, error } = await db.from("community_submissions").select("*").eq("id", id).maybeSingle()
  if (error) return NextResponse.json({ error: "Could not load submission" }, { status: 500, ...NO_STORE })
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404, ...NO_STORE })
  // Never interpolate PostgREST's filter grammar. Restrict the search token
  // to alphanumerics before passing it as an ilike value.
  const token = String(submission.title).toLowerCase().match(/[a-z0-9]{4,}/)?.[0] || ""
  let similar: Array<{ id: string; title: string }> = []
  if (token) {
    const result = await db.from("pdfs").select("id,title").ilike("title", `%${token}%`).limit(5)
    if (!result.error) similar = result.data || []
  }
  return NextResponse.json({ submission, duplicateWarning: similar.length ? { message: "Similar title already exists", matches: similar } : null },
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
    const conflict = error.message?.includes("conflicting")
    const unsafe = error.message?.includes("safety review prevents approval")
    return NextResponse.json(
      { error: conflict ? "Submission was already moderated differently" : unsafe ? "Submission did not pass PDF safety checks" : "Could not moderate submission" },
      { status: conflict ? 409 : unsafe ? 422 : 400, ...NO_STORE },
    )
  }
  if (body.action === "approve" && data?.approved_pdf_id) {
    await enqueuePdfJob(data.approved_pdf_id, "process").catch(() => {})
    try {
      await publishInAppNotification({
        kind: "pdf", entityId: data.approved_pdf_id, title: `New PDF: ${data.title}`,
        body: "A new PDF is now available.", href: `/pdf/${data.approved_pdf_id}`, payload: { pdfId: data.approved_pdf_id },
      })
    } catch { /* Publishing succeeded; notification fan-out is nonfatal. */ }
  }
  return NextResponse.json({ submission: data, approvedPdfId: data?.approved_pdf_id ?? null }, NO_STORE)
}