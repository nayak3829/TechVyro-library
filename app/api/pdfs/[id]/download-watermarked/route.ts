import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib"
import { applyPublicPdfVisibility, canDownloadPDF, canViewPDF, getPDFRequestIdentity } from "@/lib/pdf-access"
import { isValidAnalyticsEventKey } from "@/lib/analytics-events"
import { getWatermarkSettings } from "@/lib/watermark-settings"

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const identity = await getPDFRequestIdentity(request)

    // Get PDF metadata from database
    let pdfQuery = supabase
      .from("pdfs")
      .select("*")
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

    const { data: storedSettings, error: settingsError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general_settings")
      .maybeSingle()
    if (settingsError) {
      console.error("[pdf/download-watermarked] Failed to load watermark settings:", settingsError)
    }
    const watermark = getWatermarkSettings(storedSettings?.value)

    // Download the original PDF from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("pdfs")
      .download(pdf.file_path)

    if (downloadError || !fileData) {
      console.error("[v0] Error downloading PDF:", downloadError)
      return NextResponse.json({ error: "Failed to download PDF" }, { status: 500 })
    }

    // Convert Blob to ArrayBuffer
    const originalPdfBytes = await fileData.arrayBuffer()

    let responseBytes: Uint8Array<ArrayBufferLike> = new Uint8Array(originalPdfBytes)
    if (watermark.enabled) {
      const pdfDoc = await PDFDocument.load(originalPdfBytes, {
        ignoreEncryption: true,
        updateMetadata: false,
      })
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      for (const page of pdfDoc.getPages()) {
        const { width, height } = page.getSize()
        const fontSize = Math.min(width, height) * 0.08
        const textWidth = helveticaFont.widthOfTextAtSize(watermark.text, fontSize)
        const x = Math.max(15, (width - textWidth) / 2)
        const y = watermark.position === "header"
          ? height - fontSize - 20
          : watermark.position === "footer"
            ? 20
            : height / 2
        page.drawText(watermark.text, {
          x,
          y,
          size: fontSize,
          font: helveticaFont,
          color: rgb(0.55, 0.55, 0.55),
          opacity: watermark.opacity,
          rotate: watermark.position === "diagonal" ? degrees(-35) : degrees(0),
        })
      }
      pdfDoc.setTitle(pdf.title)
      pdfDoc.setCreator(`${watermark.siteName} PDF Library`)
      pdfDoc.setProducer(watermark.siteName)
      responseBytes = await pdfDoc.save()
    }

    const { error: countError } = await supabase.rpc("increment_download_count", {
      pdf_id: id,
      event_key: eventKey,
    })
    if (countError) {
      console.error("[pdf/download-watermarked] Atomic counter failed:", countError)
      return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
    }

    // Create filename
    const safeFilename = pdf.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")
    const safeSiteName = watermark.siteName.replace(/[^a-zA-Z0-9]/g, "") || "PDF"
    const filename = `${safeFilename}_${safeSiteName}.pdf`

    // Return the watermarked PDF
    return new NextResponse(Buffer.from(responseBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": responseBytes.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("[v0] Error creating watermarked PDF:", error)
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    )
  }
}
