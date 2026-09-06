import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { UUID } from "@/lib/community-submissions"
import { publishInAppNotification } from "@/lib/notifications"

const NO_STORE = { headers: { "Cache-Control": "no-store" } }
function safeModerationError(error: { message?: string }) {
  const message = error.message || ""
  if (message.includes("conflicting moderation transition")) return "Submission was already moderated differently"
  if (message.includes("duplicate content")) return "An existing PDF already has this exact file content"
  if (message.includes("reservation-bound storage object")) return "The reserved upload is missing and cannot be approved"
  if (message.includes("safety review prevents approval")) return "Submission did not pass PDF safety checks"
  return "Could not moderate submission"
}
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
  const moderate = async (id: string) => {
    const { data, error } = await db.rpc("moderate_community_submission", {
      p_submission_id: id, p_action: body.action, p_reason: reason || null, p_reviewed_by: "admin",
    })
    if (error) {
      return { id, success: false, error: safeModerationError(error) }
    }
    if (body.action === "approve" && data?.approved_pdf_id) {
      try {
        await publishInAppNotification({
          kind: "pdf", entityId: data.approved_pdf_id, title: `PDF approved: ${data.title}`,
          body: "A new PDF was approved and is queued for processing.", href: `/pdf/${data.approved_pdf_id}`, payload: { pdfId: data.approved_pdf_id },
        })
      } catch { /* nonfatal */ }
    }
    return { id, success: true, approvedPdfId: data?.approved_pdf_id ?? null }
  }
  const results: Array<{ id: string; success: boolean; approvedPdfId?: string | null; error?: string }> = []
  const concurrency = 5
  for (let index = 0; index < ids.length; index += concurrency) {
    results.push(...await Promise.all(ids.slice(index, index + concurrency).map(moderate)))
  }
  return NextResponse.json({ results, succeeded: results.filter(item => item.success).length, failed: results.filter(item => !item.success).length }, NO_STORE)
}