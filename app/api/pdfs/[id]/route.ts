import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { after, NextResponse } from "next/server"
import { enqueuePdfJob } from "@/lib/pdf-jobs"
import { runDuePdfJobs } from "@/lib/pdf-job-runner"
import { normalizePdfContentMetadata } from "@/lib/pdf-content-metadata"

interface RouteProps {
  params: Promise<{ id: string }>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VISIBILITIES = new Set(["public", "unlisted", "private"])

function processQueuedPdfAfterResponse() {
  try {
    after(() => runDuePdfJobs(1))
  } catch (error) {
    if (process.env.NODE_ENV !== "test") throw error
  }
}

function validStoragePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 1024 || value !== value.trim()) return false
  if (value.startsWith("/") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return false
  return value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..")
}

function validateEditableFields(body: Record<string, unknown>): string | null {
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200)) {
    return "Title must be between 1 and 200 characters"
  }
  if (body.description !== undefined && body.description !== null && (typeof body.description !== "string" || body.description.length > 5000)) {
    return "Description must be text with at most 5000 characters"
  }
  if (body.category_id !== undefined && body.category_id !== null && body.category_id !== "" &&
      (typeof body.category_id !== "string" || !UUID.test(body.category_id))) {
    return "Category ID is invalid"
  }
  if (body.visibility !== undefined && (typeof body.visibility !== "string" || !VISIBILITIES.has(body.visibility))) {
    return "Visibility is invalid"
  }
  if (body.allow_download !== undefined && typeof body.allow_download !== "boolean") {
    return "Download permission must be true or false"
  }
  if (body.tags !== undefined && body.tags !== null &&
      (!Array.isArray(body.tags) || body.tags.length > 20 || body.tags.some((tag) => typeof tag !== "string" || !tag.trim() || tag.trim().length > 50))) {
    return "Tags must contain at most 20 non-empty text values"
  }
  return null
}

async function removeStorageObject(
  supabase: ReturnType<typeof createAdminClient>,
  filePath: unknown,
  context: string,
): Promise<boolean> {
  if (!validStoragePath(filePath)) {
    console.error(`[pdfs/id] ${context}: refusing to remove an invalid storage path`)
    return false
  }

  try {
    const { error } = await supabase.storage.from("pdfs").remove([filePath])
    if (error) {
      console.error(`[pdfs/id] ${context}:`, error)
      return false
    }
    return true
  } catch (error) {
    console.error(`[pdfs/id] ${context}:`, error)
    return false
  }
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body: unknown = await request.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
    }
    const requestBody = body as Record<string, unknown>
    // Publish state is owned exclusively by /publish. Metadata/visibility
    // updates must never be able to approve or revive a PDF.
    if (Object.prototype.hasOwnProperty.call(requestBody, "publish_status")) {
      return NextResponse.json({ error: "Use the publish action to change publish status" }, { status: 400 })
    }
    const validationError = validateEditableFields(requestBody)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    const { title, description, category_id, file_path, file_size, visibility, tags, allow_download } = requestBody
    const hasContentMetadata = ["contentType", "contentCategory", "contentSubcategory", "content_type", "content_category", "content_subcategory", "subject"]
      .some((key) => Object.prototype.hasOwnProperty.call(requestBody, key))
    let contentMetadata: ReturnType<typeof normalizePdfContentMetadata> | undefined
    if (hasContentMetadata) {
      try {
        contentMetadata = normalizePdfContentMetadata(requestBody, { allowEmpty: true })
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Content hierarchy is invalid" }, { status: 400 })
      }
    }

    const supabase = createAdminClient()
    if (typeof category_id === "string" && category_id) {
      const { data: category, error: categoryError } = await supabase
        .from("categories").select("id").eq("id", category_id).maybeSingle()
      if (categoryError) return NextResponse.json({ error: "Could not validate category" }, { status: 500 })
      if (!category) return NextResponse.json({ error: "Selected category no longer exists" }, { status: 400 })
    }

    // File replacement mode
    if (Object.prototype.hasOwnProperty.call(requestBody, "file_path")) {
      if (!validStoragePath(file_path) || !/\.pdf$/i.test(file_path)) {
        return NextResponse.json({ error: "A valid replacement file path is required" }, { status: 400 })
      }
      if (
        file_size !== undefined &&
        (typeof file_size !== "number" || !Number.isFinite(file_size) || file_size <= 0 || file_size > 100 * 1024 * 1024)
      ) {
        return NextResponse.json({ error: "Replacement file size must be a non-negative number" }, { status: 400 })
      }

      const { data: current, error: currentError } = await supabase
        .from("pdfs")
        .select("file_path, thumbnail_path")
        .eq("id", id)
        .single()

      if (currentError || !current) {
        const cleanedUp = await removeStorageObject(supabase, file_path, "replacement cleanup after lookup failure")
        const notFound = currentError && (
          currentError.code === "PGRST116" ||
          (typeof currentError.message === "string" && currentError.message.toLowerCase().includes("0 rows"))
        )
        return NextResponse.json(
          {
            error: notFound
              ? "PDF not found; uploaded replacement was not applied"
              : cleanedUp
                ? "Could not load the existing PDF; uploaded replacement was removed"
                : "Could not load the existing PDF, and the uploaded replacement could not be removed",
          },
          { status: notFound ? 404 : 500 },
        )
      }

      const updatePayload: Record<string, unknown> = {
        file_path,
        file_size: file_size ?? null,
        thumbnail_path: null,
        page_count: null,
        malware_status: "pending",
        ocr_status: "pending",
        processing_status: "pending",
        updated_at: new Date().toISOString(),
      }
      if (typeof title === "string" && title.trim()) updatePayload.title = title.trim()
      if (description !== undefined) updatePayload.description = typeof description === "string" ? description.trim() || null : null
      if (category_id !== undefined) updatePayload.category_id = category_id || null
      if (visibility !== undefined) updatePayload.visibility = visibility
      if (tags !== undefined) updatePayload.tags = Array.isArray(tags) && tags.length > 0 ? tags.map((tag) => String(tag).trim()) : null
      if (allow_download !== undefined) updatePayload.allow_download = allow_download
      if (contentMetadata) Object.assign(updatePayload, contentMetadata)

      const { data, error } = await supabase.from("pdfs").update(updatePayload).eq("id", id).select().single()
      if (error) {
        console.error("[pdfs/id] replacement DB update error:", error)
        // Never remove the current object if a caller supplied its existing path.
        const cleanedUp = current.file_path !== file_path
          ? await removeStorageObject(supabase, file_path, "replacement cleanup after DB failure")
          : true
        return NextResponse.json(
          {
            error: cleanedUp
              ? "Failed to replace file; the original file was preserved"
              : "Failed to replace file; the original was preserved, but the uploaded replacement could not be removed",
          },
          { status: 500 },
        )
      }

      // The database points at the replacement before the old object is removed.
      // Cleanup is deliberately best-effort: failure here must not roll back metadata.
      let warning: string | undefined
      if (current.file_path !== file_path && current.file_path != null) {
        const removed = await removeStorageObject(supabase, current.file_path, "old file cleanup after replacement")
        if (!removed) warning = "PDF was updated, but the old file could not be removed"
      }
      if (current.thumbnail_path) {
        const removed = await removeStorageObject(supabase, current.thumbnail_path, "old thumbnail cleanup after replacement")
        if (!removed) warning = warning
          ? `${warning}; the old thumbnail could not be removed`
          : "PDF was updated, but the old thumbnail could not be removed"
      }
      try {
        const { error: enqueueError } = await enqueuePdfJob(id, "process", { replacement: true })
        if (enqueueError) {
          warning = warning
            ? `${warning}; automatic metadata refresh could not be queued`
            : "PDF was updated, but automatic metadata refresh could not be queued"
        } else {
          processQueuedPdfAfterResponse()
        }
      } catch (enqueueError) {
        console.error("[pdfs/id] replacement metadata refresh enqueue failed:", enqueueError)
        warning = warning
          ? `${warning}; automatic metadata refresh could not be queued`
          : "PDF was updated, but automatic metadata refresh could not be queued"
      }
      return NextResponse.json(warning ? { ...data, warning } : data)
    }

    // Metadata-only update
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof title === "string" && title.trim()) updatePayload.title = title.trim()
    if (description !== undefined) updatePayload.description = typeof description === "string" ? description.trim() || null : null
    if (category_id !== undefined) updatePayload.category_id = category_id || null
    if (visibility !== undefined) updatePayload.visibility = visibility
    if (tags !== undefined) updatePayload.tags = Array.isArray(tags) && tags.length > 0 ? tags.map((tag) => String(tag).trim()) : null
    if (allow_download !== undefined) updatePayload.allow_download = allow_download
    if (contentMetadata) Object.assign(updatePayload, contentMetadata)

    if (Object.keys(updatePayload).length <= 1) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data, error } = await supabase.from("pdfs").update(updatePayload).eq("id", id).select().single()
    if (error?.code === "PGRST116") {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }
    if (error) {
      console.error("[pdfs/id] PATCH error:", error)
      return NextResponse.json({ error: "Failed to update PDF" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[pdfs/id] PATCH error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params

    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: pdf, error: fetchError } = await supabase.from("pdfs").select("file_path, thumbnail_path").eq("id", id).single()
    if (fetchError || !pdf) return NextResponse.json({ error: "PDF not found" }, { status: 404 })

    const { error: dbError } = await supabase.from("pdfs").delete().eq("id", id)
    if (dbError) return NextResponse.json({ error: "Failed to delete PDF" }, { status: 500 })

    const paths = [pdf.file_path, pdf.thumbnail_path].filter((path): path is string => validStoragePath(path))
    const removed = paths.length === 0 || (await supabase.storage.from("pdfs").remove(paths)).error == null
    return NextResponse.json(removed
      ? { success: true }
      : {
          success: true,
          warning: "PDF was removed from the library, but one or more storage objects require cleanup",
          storageCleanupRequired: true,
        },
      removed ? undefined : { status: 207 },
    )
  } catch (error) {
    console.error("[pdfs/id] DELETE error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
