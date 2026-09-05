import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { applyPublicPdfVisibility, canViewPDF, getPDFRequestIdentity } from "@/lib/pdf-access"
import { isValidAnalyticsEventKey } from "@/lib/analytics-events"
import { validPdfStorageLocation } from "@/lib/pdf-storage"

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const identity = await getPDFRequestIdentity(request)
    let pdfQuery = supabase
      .from("pdfs")
      .select("file_path, storage_bucket, malware_status, visibility, scheduled_at, publish_status")
      .eq("id", id)
    if (!identity.isAdmin) pdfQuery = applyPublicPdfVisibility(pdfQuery)
    const { data: pdf, error } = await pdfQuery.single()

    if (error || !pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    if (!canViewPDF(pdf, identity.isAdmin)) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }
    if (pdf.storage_bucket === "community-pdfs" && pdf.malware_status !== "clean") {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    if (!validPdfStorageLocation(pdf.storage_bucket, pdf.file_path)) return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    const { data: file, error: downloadError } = await supabase.storage.from(pdf.storage_bucket).download(pdf.file_path)
    if (downloadError || !file) {
      console.error("[pdf/view] Storage download error:", downloadError)
      return NextResponse.json({ error: "Failed to load PDF" }, { status: 500 })
    }

    return new NextResponse(await file.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": pdf.visibility === "private" ? "private, no-store" : "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[pdf/view] PDF view error:", error)
    return NextResponse.json({ error: "Failed to load PDF" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const identity = await getPDFRequestIdentity(request)
    let pdfQuery = supabase
      .from("pdfs")
      .select("visibility, scheduled_at, publish_status, malware_status")
      .eq("id", id)
    if (!identity.isAdmin) pdfQuery = applyPublicPdfVisibility(pdfQuery)
    const { data: pdf, error: pdfError } = await pdfQuery.single()
    if (pdfError || !pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }
    if (!canViewPDF(pdf, identity.isAdmin)) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    const eventKey = request.headers.get("Idempotency-Key")
    if (!isValidAnalyticsEventKey(eventKey, "view", id)) {
      return NextResponse.json({ error: "Invalid idempotency key" }, { status: 400 })
    }
    const { data: count, error } = await supabase.rpc("increment_view_count", {
      pdf_id: id,
      event_key: eventKey,
    })
    if (error || typeof count !== "number") {
      console.error("[pdf/view] Atomic counter failed:", error)
      return NextResponse.json({ error: "Failed to update view count" }, { status: 500 })
    }
    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error("[v0] View count error:", error)
    return NextResponse.json({ error: "Failed to update view count" }, { status: 500 })
  }
}
