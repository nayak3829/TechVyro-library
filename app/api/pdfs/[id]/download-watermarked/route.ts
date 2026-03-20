import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Get PDF metadata from database
    const { data: pdf, error: pdfError } = await supabase
      .from("pdfs")
      .select("*")
      .eq("id", id)
      .single()

    if (pdfError || !pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

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

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(originalPdfBytes, { 
      ignoreEncryption: true,
      updateMetadata: false
    })

    // Get all pages
    const pages = pdfDoc.getPages()
    
    // Embed the font
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    // Watermark text
    const watermarkText = "TechVyro.in"
    const websiteText = "www.techvyro.in"

    // Add watermark to each page
    for (const page of pages) {
      const { width, height } = page.getSize()
      
      // Calculate font sizes relative to page size
      const mainFontSize = Math.min(width, height) * 0.08
      const subFontSize = mainFontSize * 0.4

      // Draw diagonal watermark in center
      page.drawText(watermarkText, {
        x: width / 2 - (mainFontSize * watermarkText.length * 0.25),
        y: height / 2,
        size: mainFontSize,
        font: helveticaFont,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.3,
        rotate: { type: 'degrees', angle: -45 } as const,
      })

      // Draw smaller watermarks in corners
      // Bottom right
      page.drawText(websiteText, {
        x: width - 120,
        y: 15,
        size: 10,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.5,
      })

      // Top left
      page.drawText(websiteText, {
        x: 15,
        y: height - 25,
        size: 10,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.5,
      })
    }

    // Update PDF metadata
    pdfDoc.setTitle(pdf.title)
    pdfDoc.setCreator("TechVyro PDF Library")
    pdfDoc.setProducer("www.techvyro.in")

    // Save the modified PDF
    const watermarkedPdfBytes = await pdfDoc.save()

    // Increment download count
    try {
      await supabase
        .from("pdfs")
        .update({ download_count: (pdf.download_count || 0) + 1 })
        .eq("id", id)
    } catch {
      // Ignore download count errors
    }

    // Create filename
    const safeFilename = pdf.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")
    const filename = `${safeFilename}_TechVyro.pdf`

    // Return the watermarked PDF
    return new NextResponse(watermarkedPdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": watermarkedPdfBytes.byteLength.toString(),
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
