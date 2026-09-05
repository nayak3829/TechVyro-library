import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"
import { recordUserPdfActivity, type PdfActivityEvent } from "@/lib/user-pdf-library"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const client = await createClient()
  if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const pdfId = typeof body.pdfId === "string" ? body.pdfId : ""
  const event: PdfActivityEvent = body.event === "download" ? "download" : "view"
  if (!UUID.test(pdfId)) return NextResponse.json({ error: "Invalid PDF" }, { status: 400 })

  let query = createAdminClient().from("pdfs").select("id").eq("id", pdfId)
  query = applyPublicPdfVisibility(query)
  const { data: pdf } = await query.maybeSingle()
  if (!pdf) return NextResponse.json({ error: "PDF not found" }, { status: 404 })

  try {
    await recordUserPdfActivity(user.id, pdfId, event)
  } catch (error) {
    console.error("[library/activity] Failed to record activity:", error)
    return NextResponse.json({ error: "Failed to record activity" }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}