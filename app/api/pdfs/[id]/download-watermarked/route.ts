import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { PDFDocument, degrees, rgb, StandardFonts } from "pdf-lib"
import { applyPublicPdfVisibility, canDownloadPDF, canViewPDF, getPDFRequestIdentity } from "@/lib/pdf-access"
import { isValidAnalyticsEventKey } from "@/lib/analytics-events"
import { getWatermarkSettings } from "@/lib/watermark-settings"
import { validPdfStorageLocation } from "@/lib/pdf-storage"

interface RouteProps {
  params: Promise<{ id: string }>
}

const MAX_INLINE_WATERMARK_BYTES = 15 * 1024 * 1024

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const identity = await getPDFRequestIdentity(request)

    // Get PDF metadata from database
    let pdfQuery = supabase
      .from("pdfs")
      .select("id, title, file_path, storage_bucket, malware_status, processing_status, visibility, allow_download, scheduled_at, publish_status")
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

    // Download only from the explicit, validated persisted source bucket.
    if (!validPdfStorageLocation(pdf.storage_bucket, pdf.file_path)) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(pdf.storage_bucket)
      .download(pdf.file_path)

    if (downloadError || !fileData) {
      console.error("[v0] Error downloading PDF:", downloadError)
      return NextResponse.json({ error: "Failed to download PDF" }, { status: 500 })
    }

    // Convert Blob to ArrayBuffer
    const originalPdfBytes = await fileData.arrayBuffer()

    let responseBytes: Uint8Array<ArrayBufferLike> = new Uint8Array(originalPdfBytes)
    if (watermark.enabled) {
      if (originalPdfBytes.byteLength > MAX_INLINE_WATERMARK_BYTES) {
        return NextResponse.json(
          { error: "PDF is too large to watermark safely" },
          { status: 422 },
        )
      }
      try {
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
      } catch (watermarkError) {
        console.error("[pdf/download-watermarked] Watermark processing failed:", watermarkError)
        return NextResponse.json(
          { error: "Unable to watermark PDF" },
          { status: 422 },
        )
      }
    }

    const { error: accountingError } = await supabase.rpc("record_pdf_download", {
      p_pdf_id: id,
      p_event_key: eventKey,
      p_user_id: identity.userId,
    })
    if (accountingError) {
      console.error("[pdf/download-watermarked] Download accounting failed:", accountingError.message)
      return NextResponse.json({ error: "Failed to record download" }, { status: 500 })
    }

    // Create filename
    const safeFilename = pdf.title.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_") || "TechVyro_PDF"
    const safeSiteName = watermark.siteName.replace(/[^a-zA-Z0-9]/g, "") || "PDF"
    const filename = `${safeFilename}_${safeSiteName}.pdf`
    const utf8Filename = encodeURIComponent(`${pdf.title}_${safeSiteName}.pdf`)

    // Return the watermarked PDF
    return new NextResponse(Buffer.from(responseBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${utf8Filename}`,
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
