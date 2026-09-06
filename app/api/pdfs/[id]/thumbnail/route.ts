import { createAdminClient } from "@/lib/supabase/admin"
import { applyPublicPdfVisibility, canViewPDF, getPDFRequestIdentity } from "@/lib/pdf-access"
import { NextResponse } from "next/server"

interface RouteProps {
  params: Promise<{ id: string }>
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character] || character)
}

function generatedCover(title: unknown) {
  const safeTitle = escapeXml(typeof title === "string" && title.trim() ? title.trim() : "TechVyro PDF")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
    <rect width="720" height="960" rx="32" fill="url(#g)"/>
    <rect x="54" y="54" width="612" height="852" rx="24" fill="none" stroke="#93c5fd" stroke-opacity=".45" stroke-width="3"/>
    <text x="360" y="190" text-anchor="middle" fill="#bfdbfe" font-family="Arial, sans-serif" font-size="38" font-weight="700">TECHVYRO</text>
    <foreignObject x="90" y="270" width="540" height="400">
      <div xmlns="http://www.w3.org/1999/xhtml" style="color:white;font:700 54px/1.25 Arial,sans-serif;text-align:center;word-break:break-word;display:flex;align-items:center;justify-content:center;height:100%">${safeTitle}</div>
    </foreignObject>
    <rect x="250" y="770" width="220" height="72" rx="36" fill="#fff" fill-opacity=".14"/>
    <text x="360" y="818" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="30" font-weight="700">PDF</text>
  </svg>`
}

function coverResponse(title: unknown, visibility: unknown) {
  return new NextResponse(generatedCover(title), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": visibility === "private" ? "private, no-store" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  })
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const identity = await getPDFRequestIdentity(request)
    let query = supabase
      .from("pdfs")
      .select("title, thumbnail_path, storage_bucket, malware_status, processing_status, visibility, scheduled_at, publish_status")
      .eq("id", id)
    if (!identity.isAdmin) query = applyPublicPdfVisibility(query)
    const { data: pdf, error } = await query.single()

    if (error || !pdf || !canViewPDF(pdf, identity.isAdmin)) {
      return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 })
    }
    if (!pdf.thumbnail_path) return coverResponse(pdf.title, pdf.visibility)

    const { data: thumbnail, error: downloadError } = await supabase.storage
      .from("pdfs")
      .download(pdf.thumbnail_path)
    if (downloadError || !thumbnail) {
      console.error("[pdf/thumbnail] Storage download error:", downloadError)
      return coverResponse(pdf.title, pdf.visibility)
    }

    const contentType = pdf.thumbnail_path.toLowerCase().endsWith(".svg")
      ? "image/svg+xml; charset=utf-8"
      : thumbnail.type === "image/webp" || pdf.thumbnail_path.toLowerCase().endsWith(".webp")
        ? "image/webp"
        : "image/jpeg"
    return new NextResponse(await thumbnail.arrayBuffer(), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": pdf.visibility === "private" ? "private, no-store" : "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[pdf/thumbnail] Thumbnail error:", error)
    return NextResponse.json({ error: "Failed to load thumbnail" }, { status: 500 })
  }
}