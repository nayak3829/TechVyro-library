import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { NextRequest, NextResponse } from "next/server"
import { PDF_CONTENT_TYPES, type PdfContentType } from "@/lib/pdf-content-metadata"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"

export async function GET(request: NextRequest) {
  try {
    const isAdmin = verifyAdminToken(extractToken(request))
    const supabase = isAdmin ? createAdminClient() : await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search")?.trim() || ""
    const parseBoundedInteger = (name: string, fallback: number, min: number, max: number) => {
      const raw = searchParams.get(name)
      if (raw === null || raw === "") return fallback
      if (!/^\d+$/.test(raw)) throw new Error(`Invalid ${name}`)
      const value = Number(raw)
      if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`)
      return value
    }
    let limit: number
    let offset: number
    try {
      limit = parseBoundedInteger("limit", 1000, 1, 1000)
      offset = parseBoundedInteger("offset", 0, 0, Number.MAX_SAFE_INTEGER)
    } catch {
      return NextResponse.json({ error: "limit must be an integer from 1 to 1000 and offset must be a non-negative integer" }, { status: 400 })
    }
    const categoryId = searchParams.get("categoryId") || ""
    const contentType = searchParams.get("contentType") || ""
    const contentCategory = searchParams.get("contentCategory") || ""
    const contentSubcategory = searchParams.get("contentSubcategory") || ""
    const subject = searchParams.get("subject") || ""
    const hierarchyFilters = [contentCategory, contentSubcategory, subject]
    if (
      (contentType && !PDF_CONTENT_TYPES.includes(contentType as PdfContentType)) ||
      hierarchyFilters.some((value) => value.length > 160 || value !== value.trim() || /[\u0000-\u001f\u007f]/.test(value)) ||
      (contentCategory && !contentType) ||
      (contentSubcategory && !contentCategory) ||
      (subject && !contentSubcategory)
    ) {
      return NextResponse.json({ error: "Content hierarchy filters are invalid or out of order" }, { status: 400 })
    }

    const publicFields = `
      id, title, description, file_size, category_id, download_count,
      view_count, average_rating, review_count, created_at, updated_at,
      visibility, allow_download, tags, structure_location, thumbnail_path,
      content_type, content_category, content_subcategory, subject, category:categories(*)
    `
    const adminFields = `
      ${publicFields}, scheduled_at, publish_status, processing_status,
      processing_attempts, processing_error, page_count, language,
      review_warnings, malware_status, ocr_status,
      notification_preference, notification_state, notification_attempts,
      notification_error, notification_sent_at, seo_title, seo_description,
      seo_keywords
    `
    let query = supabase
      .from("pdfs")
      .select(isAdmin ? adminFields : publicFields)
      .order("created_at", { ascending: false })

    if (!isAdmin) {
      query = applyPublicPdfVisibility(query)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }
    if (contentType) query = query.eq("content_type", contentType)
    if (contentCategory) query = query.eq("content_category", contentCategory)
    if (contentSubcategory) query = query.eq("content_subcategory", contentSubcategory)
    if (subject) query = query.eq("subject", subject)

    if (limit < 1000) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error("[pdfs] Error fetching PDFs:", error)
      return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 })
    }

    // Prevent caching to ensure fresh data after uploads
    const rows = (data || []) as unknown as Record<string, unknown>[]
    const pdfs = rows.map((pdf) => {
      const thumbnailUrl = `/api/pdfs/${pdf.id}/thumbnail`
      if (isAdmin) return { ...pdf, thumbnail_url: thumbnailUrl }
      const { thumbnail_path: _privateThumbnailPath, ...publicPdf } = pdf
      return { ...publicPdf, thumbnail_url: thumbnailUrl }
    })
    const response = NextResponse.json({ pdfs })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return response
  } catch (error) {
    console.error("[pdfs] PDFs GET error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
