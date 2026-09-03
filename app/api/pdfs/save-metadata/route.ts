import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { isValidStructureLocation } from "@/lib/content-structure-validation"
import { enqueuePdfJob } from "@/lib/pdf-jobs"
import { createHash } from "node:crypto"
import { simhashSimilarity } from "@/lib/pdf-similarity"

const STORAGE_PATH = /^[0-9]{10,20}-[^/\\]+\.pdf$/i
const THUMBNAIL_PATH = /^thumbnails\/[0-9]{10,20}-[^/\\]+\.(?:jpg|jpeg|webp)$/i
const MAX_PDF_BYTES = 100 * 1024 * 1024
const PDF_SIGNATURE_BYTES = 5

function boundedAnalysis(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {
    warnings: [] as string[], metadata: {}, text: null, hash: null, textFingerprint: null, pageCount: null,
    language: null, thumbnailPath: null, malwareStatus: "pending", ocrStatus: "pending",
    ocrConfidence: null, seoTitle: null, seoDescription: null, seoKeywords: [] as string[],
  }
  const input = value as Record<string, unknown>
  const strings = (key: string, max: number) => Array.isArray(input[key])
    ? input[key].filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().slice(0, max)).slice(0, 50)
    : []
  const metadata = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata : {}
  return {
    warnings: strings("warnings", 300),
    metadata: Object.fromEntries(Object.entries(metadata as Record<string, unknown>).slice(0, 30).map(([key, item]) => [key.slice(0, 80), typeof item === "string" ? item.slice(0, 500) : item])),
    text: typeof input.text === "string" ? input.text.slice(0, 2_000_000) : null,
    hash: typeof input.contentHash === "string" && /^[a-f0-9]{32,128}$/i.test(input.contentHash) ? input.contentHash.toLowerCase() : null,
    textFingerprint: typeof input.textFingerprint === "string" && /^[a-f0-9]{16,128}$/i.test(input.textFingerprint) ? input.textFingerprint.toLowerCase() : null,
    pageCount: Number.isSafeInteger(input.pageCount) && Number(input.pageCount) > 0 && Number(input.pageCount) <= 10000 ? Number(input.pageCount) : null,
    language: typeof input.language === "string" ? input.language.trim().slice(0, 20) || null : null,
    thumbnailPath: typeof input.thumbnailPath === "string" ? input.thumbnailPath.replace(/[\\]/g, "").slice(0, 300) : null,
    malwareStatus: ["pending", "clean", "suspicious", "blocked", "unknown"].includes(String(input.malwareStatus)) ? String(input.malwareStatus) : "pending",
    ocrStatus: ["pending", "not_required", "processing", "completed", "failed"].includes(String(input.ocrStatus)) ? String(input.ocrStatus) : "pending",
    ocrConfidence: typeof input.ocrConfidence === "number" && input.ocrConfidence >= 0 && input.ocrConfidence <= 1 ? input.ocrConfidence : null,
    seoTitle: typeof input.seoTitle === "string" ? input.seoTitle.trim().slice(0, 200) || null : null,
    seoDescription: typeof input.seoDescription === "string" ? input.seoDescription.trim().slice(0, 500) || null : null,
    seoKeywords: strings("seoKeywords", 80),
  }
}

async function clearCleanupReservation(db: ReturnType<typeof createAdminClient>, path: string) {
  try {
    await db.from("pdf_jobs").delete().eq("job_type", "cleanup").is("pdf_id", null)
      .contains("payload", { bucket: "pdfs", path })
  } catch {
    // Cleanup is best effort; metadata persistence must not be rolled back.
  }
}

export async function POST(request: Request) {
  let uploadedFilePath: string | null = null
  try {
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const body = await request.json()
    const { title, description, filePath, fileSize, categoryId, structureLocation, replace, tags, visibility, scheduledAt, allowDownload, customSlug, analysis } = body
    uploadedFilePath = typeof filePath === "string" ? filePath : null

    if (typeof title !== "string" || !title.trim() || title.trim().length > 200) {
      return NextResponse.json({ error: "Title is required and must be at most 200 characters" }, { status: 400 })
    }
    if (typeof filePath !== "string" || !STORAGE_PATH.test(filePath)) {
      return NextResponse.json({ error: "A valid uploaded PDF path is required" }, { status: 400 })
    }
    if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF size must be between 1 byte and 100 MB" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: storageObjects, error: storageLookupError } = await supabase.storage
      .from("pdfs")
      .list("", { limit: 1, search: filePath })
    const uploadedObject = storageObjects?.find((object) => object.name === filePath)
    const storedSize = uploadedObject?.metadata?.size
    if (storageLookupError || !uploadedObject || !Number.isSafeInteger(storedSize) || storedSize !== fileSize) {
      if (!storageLookupError && uploadedObject && storedSize !== fileSize) {
        await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
        uploadedFilePath = null
      }
      return NextResponse.json(
        { error: storageLookupError || !uploadedObject ? "Uploaded PDF was not found in storage" : "Uploaded PDF size does not match metadata" },
        { status: 400 },
      )
    }
    // A signed upload only proves the object was placed in the bucket. Verify
    // its bytes before making the object authoritative in the database.
    const { data: uploadedBlob, error: downloadError } = await supabase.storage.from("pdfs").download(filePath)
    const uploadedBytes = uploadedBlob ? new Uint8Array(await uploadedBlob.arrayBuffer()) : null
    const signature = uploadedBytes
      ? new TextDecoder().decode(uploadedBytes.slice(0, PDF_SIGNATURE_BYTES))
      : ""
    if (downloadError || !uploadedBytes || signature !== "%PDF-") {
      await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
      uploadedFilePath = null
      return NextResponse.json({ error: "Uploaded file is not a valid PDF" }, { status: 400 })
    }
    // Never trust a browser supplied hash. Hash the bytes we just verified
    // came from storage, making the database value authoritative.
    const computedContentHash = createHash("sha256").update(uploadedBytes).digest("hex")

    if (categoryId) {
      const { data: category, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .maybeSingle()
      if (categoryError || !category) {
        await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
        uploadedFilePath = null
        return NextResponse.json({ error: "Selected category no longer exists" }, { status: 400 })
      }
    }

    let structLocValue = null
    if (structureLocation) {
      const { data: foldersSetting, error: foldersError } = await supabase
        .from("site_settings").select("value").eq("key", "folders").maybeSingle()
      const folders = Array.isArray(foldersSetting?.value) ? foldersSetting.value : []
      if (foldersError || !isValidStructureLocation(structureLocation, folders)) {
        await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
        uploadedFilePath = null
        return NextResponse.json({ error: "Selected content structure location no longer exists" }, { status: 400 })
      }
      structLocValue = structureLocation
    }

    const normalizedVisibility = ["public", "unlisted", "private"].includes(visibility) ? visibility : "public"
    const analyzed = boundedAnalysis(analysis)
    if (!analysis || typeof analysis !== "object") {
      analyzed.warnings.push("Browser PDF analysis was unavailable; admin review is required")
    } else if (!analyzed.pageCount || analyzed.malwareStatus === "pending" || analyzed.malwareStatus === "unknown") {
      analyzed.warnings.push("PDF analysis was incomplete; admin review is required")
    }
    if (analyzed.thumbnailPath && !THUMBNAIL_PATH.test(analyzed.thumbnailPath)) {
      await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
      return NextResponse.json({ error: "A valid thumbnail path is required" }, { status: 400 })
    }
    if (analyzed.thumbnailPath) {
      const thumbnailName = analyzed.thumbnailPath.slice("thumbnails/".length)
      const { data: thumbnailObjects, error: thumbnailLookupError } = await supabase.storage
        .from("pdfs")
        .list("thumbnails", { limit: 1, search: thumbnailName })
      if (thumbnailLookupError || !thumbnailObjects?.some((object) => object.name === thumbnailName)) {
        await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
        uploadedFilePath = null
        return NextResponse.json({ error: "Generated thumbnail was not found in storage" }, { status: 400 })
      }
    }
    if (analyzed.textFingerprint) {
      const { data: fingerprintCandidates, error: fingerprintError } = await supabase.from("pdfs")
        .select("id,title,text_fingerprint,content_hash")
        .not("text_fingerprint", "is", null)
        .neq("title", title.trim())
        .limit(1000)
      if (fingerprintError) {
        analyzed.warnings.push("Near-duplicate verification requires review")
      } else {
        const nearMatch = (fingerprintCandidates || [])
          .filter((candidate) => typeof candidate.text_fingerprint === "string" && candidate.content_hash !== computedContentHash)
          .map((candidate) => ({ candidate, similarity: simhashSimilarity(candidate.text_fingerprint, analyzed.textFingerprint!) }))
          .filter(({ similarity }) => similarity >= 0.8)
          .sort((left, right) => right.similarity - left.similarity)[0]
        if (nearMatch) {
          analyzed.warnings.push(`Possible near-duplicate content (${Math.round(nearMatch.similarity * 100)}% similar to ${nearMatch.candidate.title})`)
        }
      }
    }
    analyzed.warnings = [...new Set(analyzed.warnings)].slice(0, 50)
    const publishStatus = analyzed.warnings.length ? "needs_review" : "draft"
    const advancedFields = {
      tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0).slice(0, 20) : null,
      visibility: normalizedVisibility,
      scheduled_at: typeof scheduledAt === "string" && !Number.isNaN(Date.parse(scheduledAt)) ? scheduledAt : null,
      allow_download: typeof allowDownload === "boolean" ? allowDownload : true,
      slug: typeof customSlug === "string" && customSlug.trim() ? customSlug.trim().slice(0, 100) : null,
      processing_status: "queued",
      processing_attempts: 0,
      content_hash: computedContentHash,
      text_fingerprint: analyzed.textFingerprint,
      page_count: analyzed.pageCount,
      language: analyzed.language,
      extracted_metadata: analyzed.metadata,
      extracted_text: analyzed.text,
      thumbnail_path: analyzed.thumbnailPath,
      review_warnings: analyzed.warnings,
      malware_status: analyzed.malwareStatus,
      ocr_status: analyzed.ocrStatus,
      ocr_confidence: analyzed.ocrConfidence,
      seo_title: analyzed.seoTitle,
      seo_description: analyzed.seoDescription,
      seo_keywords: analyzed.seoKeywords,
      publish_status: publishStatus,
      notification_preference: ["immediate", "daily", "scheduled", "none"].includes(body.notificationPreference) ? body.notificationPreference : "immediate",
      notification_state: "not_sent",
      notification_attempts: 0,
    }

    // Check for existing PDF with same title
    const { data: existingPdf, error: existingPdfError } = await supabase
      .from("pdfs")
      .select("id, file_path, thumbnail_path")
      .ilike("title", title.trim())
      .maybeSingle()

    if (existingPdfError) {
      await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
      uploadedFilePath = null
      return NextResponse.json({ error: "Could not verify whether this PDF title already exists" }, { status: 500 })
    }

    if (existingPdf) {
      if (!replace) {
        await supabase.storage.from("pdfs").remove([filePath])
        return NextResponse.json({ error: "A PDF with this title already exists", duplicate: true }, { status: 400 })
      }

      let { data: updatedPdf, error: updateError } = await supabase
        .from("pdfs")
        .update({
          description: description?.trim() || null,
          file_path: filePath,
          file_size: fileSize,
          category_id: categoryId || null,
          structure_location: structLocValue,
          ...advancedFields,
          visibility: "private",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPdf.id)
        .select()
        .single()

      // Fallback: if structure_location column doesn't exist, retry without it
      if (updateError?.message?.includes("structure_location")) {
        const result = await supabase.from("pdfs").update({
          description: description?.trim() || null,
          file_path: filePath,
          file_size: fileSize,
          category_id: categoryId || null,
          ...advancedFields,
          updated_at: new Date().toISOString(),
        }).eq("id", existingPdf.id).select().single()
        updatedPdf = result.data
        updateError = result.error
      }

      if (updateError) {
        console.error("[save-metadata] Replace update error:", updateError)
        await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
        if (updateError.code === "23505") {
          return NextResponse.json({ error: "A PDF with identical content already exists", duplicate: true }, { status: 409 })
        }
        return NextResponse.json({ error: "Failed to replace PDF" }, { status: 500 })
      }

      const cleanupFailures: string[] = []
      if (existingPdf.file_path && existingPdf.file_path !== filePath) {
        const { error: cleanupError } = await supabase.storage.from("pdfs").remove([existingPdf.file_path])
        if (cleanupError) {
          console.error("[save-metadata] Old replacement object cleanup failed:", cleanupError)
          cleanupFailures.push("previous file")
        }
      }
      if (existingPdf.thumbnail_path && existingPdf.thumbnail_path !== analyzed.thumbnailPath) {
        const { error: thumbnailCleanupError } = await supabase.storage.from("pdfs").remove([existingPdf.thumbnail_path])
        if (thumbnailCleanupError) {
          console.error("[save-metadata] Old replacement thumbnail cleanup failed:", thumbnailCleanupError)
          cleanupFailures.push("previous thumbnail")
        }
      }

      await clearCleanupReservation(supabase, filePath)
      await enqueuePdfJob(existingPdf.id, "process").catch(() => {})
      if (cleanupFailures.length) {
        return NextResponse.json({
          pdf: updatedPdf, replaced: true,
          cleanupWarning: `The replacement was saved, but the ${cleanupFailures.join(" and ")} could not be removed from storage.`,
        }, { status: 207 })
      }
      return NextResponse.json({ pdf: updatedPdf, replaced: true })
    }

    // New PDF — insert
    let { data: pdf, error: dbError } = await supabase
      .from("pdfs")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        file_path: filePath,
        file_size: fileSize,
        category_id: categoryId || null,
        structure_location: structLocValue,
        ...advancedFields,
        visibility: "private",
        view_count: 0,
      })
      .select()
      .single()

    // Fallback: if structure_location column doesn't exist, retry without it
    if (dbError?.message?.includes("structure_location")) {
      const result = await supabase.from("pdfs").insert({
        title: title.trim(),
        description: description?.trim() || null,
        file_path: filePath,
        file_size: fileSize,
        category_id: categoryId || null,
        ...advancedFields,
        view_count: 0,
      }).select().single()
      pdf = result.data
      dbError = result.error
    }

    if (dbError) {
      console.error("[save-metadata] Database insert error:", dbError)
      await supabase.storage.from("pdfs").remove([filePath]).catch(() => {})
      if (dbError.code === "23505") {
        return NextResponse.json({ error: "A PDF with identical content already exists", duplicate: true }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to save PDF metadata" }, { status: 500 })
    }

    // Processing is durable and idempotent. Drafts are never notified.
    if (pdf) {
      await clearCleanupReservation(supabase, filePath)
      await enqueuePdfJob(pdf.id, "process").catch(() => {})
    }

    return NextResponse.json({ pdf })
  } catch (error) {
    console.error("[save-metadata] Error:", error)
    if (uploadedFilePath && isAdminConfigured()) {
      await createAdminClient().storage.from("pdfs").remove([uploadedFilePath]).catch(() => {})
    }
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
