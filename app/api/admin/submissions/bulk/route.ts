import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { UUID } from "@/lib/community-submissions"
import { publishInAppNotification } from "@/lib/notifications"
import { enqueuePdfJob } from "@/lib/pdf-jobs"

const NO_STORE = { headers: { "Cache-Control": "no-store" } }
export async function POST(request: Request) {
  if (!verifyAdminToken(extractToken(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...NO_STORE })
  const body = await request.json().catch(() => ({}))
  const ids = body.ids
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || new Set(ids).size !== ids.length || !ids.every(id => typeof id === "string" && UUID.test(id))) {
    return NextResponse.json({ error: "ids must contain 1 to 50 unique submission ids" }, { status: 400, ...NO_STORE })
  }
  if (!["approve", "reject"].includes(body.action) || (body.action === "reject" && (!reason || reason.length > 1000))) {
    return NextResponse.json({ error: "A valid action and rejection reason are required" }, { status: 400, ...NO_STORE })
  }
  const db = createAdminClient()
  const results = []
  for (const id of ids) {
    const { data, error } = await db.rpc("moderate_community_submission", {
      p_submission_id: id, p_action: body.action, p_reason: reason || null, p_reviewed_by: "admin",
    })
    if (error) {
      results.push({ id, success: false, error: "Could not moderate submission" })
      continue
    }
    results.push({ id, success: true, approvedPdfId: data?.approved_pdf_id ?? null })
    if (body.action === "approve" && data?.approved_pdf_id) {
      await enqueuePdfJob(data.approved_pdf_id, "process").catch(() => {})
      try {
        await publishInAppNotification({
          kind: "pdf", entityId: data.approved_pdf_id, title: `New PDF: ${data.title}`,
          body: "A new PDF is now available.", href: `/pdf/${data.approved_pdf_id}`, payload: { pdfId: data.approved_pdf_id },
        })
      } catch { /* nonfatal */ }
    }
  }
  return NextResponse.json({ results, succeeded: results.filter(item => item.success).length, failed: results.filter(item => !item.success).length }, NO_STORE)
}