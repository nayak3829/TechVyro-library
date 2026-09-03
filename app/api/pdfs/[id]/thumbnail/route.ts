import { createAdminClient } from "@/lib/supabase/admin"
import { applyPublicPdfVisibility, canViewPDF, getPDFRequestIdentity } from "@/lib/pdf-access"
import { NextResponse } from "next/server"

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const identity = await getPDFRequestIdentity(request)
    let query = supabase
      .from("pdfs")
      .select("thumbnail_path, visibility, scheduled_at, publish_status")
      .eq("id", id)
    if (!identity.isAdmin) query = applyPublicPdfVisibility(query)
    const { data: pdf, error } = await query.single()

    if (error || !pdf || !canViewPDF(pdf, identity.isAdmin) || !pdf.thumbnail_path) {
      return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 })
    }

    const { data: thumbnail, error: downloadError } = await supabase.storage
      .from("pdfs")
      .download(pdf.thumbnail_path)
    if (downloadError || !thumbnail) {
      console.error("[pdf/thumbnail] Storage download error:", downloadError)
      return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 })
    }

    const contentType = thumbnail.type === "image/webp" || pdf.thumbnail_path.toLowerCase().endsWith(".webp")
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