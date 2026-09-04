import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { validPdfStorageLocation } from "@/lib/pdf-storage"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  try {
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || new Set(ids).size !== ids.length || !ids.every((id) => typeof id === "string" && UUID.test(id))) {
      return NextResponse.json({ error: "Provide 1 to 100 valid PDF IDs" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get all PDFs to find their file paths
    const { data: pdfs, error: fetchError } = await supabase
      .from("pdfs")
      .select("id, file_path, storage_bucket, thumbnail_path")
      .in("id", ids)

    if (fetchError) {
      console.error("[v0] Error fetching PDFs for bulk delete:", fetchError)
      return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 })
    }

    if (!pdfs || pdfs.length === 0) {
      return NextResponse.json({ error: "No PDFs found" }, { status: 404 })
    }
    if (pdfs.length !== new Set(ids).size) {
      return NextResponse.json({ error: "One or more PDFs no longer exist; no PDFs were deleted" }, { status: 404 })
    }

    // Remove database references first. This avoids leaving broken records
    // pointing at files that were already deleted if the DB operation fails.
    const { error: dbError } = await supabase
      .from("pdfs")
      .delete()
      .in("id", pdfs.map((pdf) => pdf.id))

    if (dbError) {
      console.error("[v0] Database bulk delete error:", dbError)
      return NextResponse.json({ error: "Failed to delete PDFs" }, { status: 500 })
    }

    const sources = new Map<"pdfs" | "community-pdfs", string[]>()
    const thumbnails: string[] = []
    for (const pdf of pdfs) {
      if (validPdfStorageLocation(pdf.storage_bucket, pdf.file_path)) {
        sources.set(pdf.storage_bucket, [...(sources.get(pdf.storage_bucket) || []), pdf.file_path])
      }
      if (typeof pdf.thumbnail_path === "string" && pdf.thumbnail_path.length > 0) thumbnails.push(pdf.thumbnail_path)
    }
    let storageError = null as unknown
    for (const [bucket, paths] of sources) {
      const result = await supabase.storage.from(bucket).remove(paths)
      storageError ||= result.error
    }
    if (thumbnails.length) storageError ||= (await supabase.storage.from("pdfs").remove(thumbnails)).error

    if (storageError) {
      console.error("[v0] Storage bulk delete error:", storageError)
      return NextResponse.json({
        success: true,
        warning: "PDF records were deleted, but storage cleanup failed",
        deleted: pdfs.length,
        storageCleanupRequired: true,
      }, { status: 207 })
    }

    return NextResponse.json({ 
      success: true, 
      deleted: pdfs.length,
    })
  } catch (error) {
    console.error("[v0] Bulk delete error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
