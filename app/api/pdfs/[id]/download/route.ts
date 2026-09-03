import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { applyPublicPdfVisibility, canDownloadPDF, canViewPDF, getPDFRequestIdentity } from "@/lib/pdf-access"
import { isValidAnalyticsEventKey } from "@/lib/analytics-events"

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const identity = await getPDFRequestIdentity(request)

    let pdfQuery = supabase
      .from("pdfs")
      .select("visibility, allow_download, scheduled_at, publish_status")
      .eq("id", id)
    if (!identity.isAdmin) pdfQuery = applyPublicPdfVisibility(pdfQuery)
    const { data: pdf, error: pdfError } = await pdfQuery.single()
    if (pdfError || !pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    if (!canViewPDF(pdf, identity.isAdmin)) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }
    if (!identity.isAuthenticated) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (!canDownloadPDF(pdf)) {
      return NextResponse.json({ error: "Downloads are disabled for this PDF" }, { status: 403 })
    }

    const eventKey = request.headers.get("Idempotency-Key")
    if (!isValidAnalyticsEventKey(eventKey, "download", id)) {
      return NextResponse.json({ error: "Invalid idempotency key" }, { status: 400 })
    }
    const { data: count, error } = await supabase.rpc("increment_download_count", {
      pdf_id: id,
      event_key: eventKey,
    })
    if (error || typeof count !== "number") {
      console.error("[pdf/download] Atomic counter failed:", error)
      return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
    }
    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error("[v0] Error incrementing download count:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
