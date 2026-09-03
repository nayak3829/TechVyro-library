import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { isValidStructureLocation } from "@/lib/content-structure-validation"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    let body: { ids?: unknown; category_id?: unknown; structure_location?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "A valid JSON request body is required" }, { status: 400 })
    }
    const { ids, category_id, structure_location } = body

    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || new Set(ids).size !== ids.length || !ids.every(id => typeof id === "string" && UUID.test(id))) {
      return NextResponse.json({ error: "Provide 1 to 100 unique valid PDF IDs" }, { status: 400 })
    }
    if (category_id !== undefined && category_id !== null && typeof category_id !== "string") {
      return NextResponse.json({ error: "category_id must be a string or null" }, { status: 400 })
    }
    if (category_id === undefined && structure_location === undefined) {
      return NextResponse.json({ error: "Select a category or content structure location" }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (category_id) {
      if (!UUID.test(category_id)) {
        return NextResponse.json({ error: "Selected category does not exist" }, { status: 400 })
      }
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", category_id)
        .maybeSingle()
      if (categoryError || !category) {
        return NextResponse.json({ error: "Selected category does not exist" }, { status: 400 })
      }
    }

    let structureLocation: unknown = undefined
    if (structure_location !== undefined) {
      const candidate = structure_location && typeof structure_location === "object" && !Array.isArray(structure_location)
        ? structure_location as Record<string, unknown>
        : null
      const isEmpty = candidate
        && !candidate.folderId
        && !candidate.categoryId
        && !candidate.sectionId
      if (structure_location === null || isEmpty) {
        structureLocation = null
      } else {
        const { data: foldersSetting, error: foldersError } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "folders")
          .maybeSingle()
        const folders = Array.isArray(foldersSetting?.value) ? foldersSetting.value : []
        if (foldersError || !isValidStructureLocation(structure_location, folders)) {
          return NextResponse.json({ error: "Selected content structure location no longer exists" }, { status: 400 })
        }
        structureLocation = structure_location
      }
    }

    // Prefetch the complete selection before updating anything. This makes a
    // stale admin selection an all-or-nothing 404, rather than a partial move.
    const { data: selected, error: selectError } = await supabase
      .from("pdfs")
      .select("id")
      .in("id", ids)
    if (selectError) {
      console.error("Error finding PDFs to move:", selectError)
      return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 })
    }
    if (!selected || selected.length !== ids.length) {
      return NextResponse.json({ error: "One or more PDFs no longer exist; no PDFs were moved" }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}
    if (category_id !== undefined) updates.category_id = category_id || null
    if (structureLocation !== undefined) updates.structure_location = structureLocation

    const { data, error } = await supabase
      .from("pdfs")
      .update(updates)
      .in("id", ids)
      .select("id")

    if (error) {
      console.error("Error moving PDFs:", error)
      return NextResponse.json({ error: "Failed to move PDFs" }, { status: 500 })
    }

    const updated = data?.length ?? 0
    if (updated !== ids.length) {
      console.error("Bulk move returned an incomplete update:", { requested: ids.length, updated })
      return NextResponse.json({ error: "PDF move was incomplete; no success was reported", updated }, { status: 500 })
    }
    return NextResponse.json({ updated })
  } catch (error) {
    console.error("Error in bulk move:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
