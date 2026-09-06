import { createHash } from "node:crypto"
import { PDFDocument } from "pdf-lib"
import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  COMMUNITY_MAX_PDF_BYTES, COMMUNITY_PATH, UUID, hasPdfSignature,
  isSubmissionSecurityConfigured, logSubmissionConfigurationDiagnostic, normalizeSubmission, privacyHash,
} from "@/lib/community-submissions"
import { inspectPdfSafety } from "@/lib/pdf-safety"
const NO_STORE = { headers: { "Cache-Control": "no-store" } }

async function removeObject(path: string) {
  try {
    const result = await createAdminClient().storage.from("community-pdfs").remove([path])
    if (result.error) {
      console.error("Community submission object removal incomplete", {
        event: "community_submission_object_removal_incomplete", path, storageError: true,
      })
    }
  } catch {
    console.error("Community submission object removal incomplete", {
      event: "community_submission_object_removal_incomplete", path, storageError: false, threw: true,
    })
  }
}

export async function POST(request: Request) {
  const adminConfigured = isAdminConfigured()
  if (!adminConfigured || !isSubmissionSecurityConfigured()) {
    logSubmissionConfigurationDiagnostic(adminConfigured)
    return NextResponse.json({ error: "Submission service is temporarily unavailable" }, { status: 503, ...NO_STORE })
  }
  let safePath: string | null = null
  try {
    const body = await request.json() as Record<string, unknown>
    const reservationId = typeof body.reservationId === "string" ? body.reservationId : ""
    const filePath = typeof body.filePath === "string" ? body.filePath : ""
    if (!UUID.test(reservationId) || filePath !== `community/${reservationId}.pdf` || !COMMUNITY_PATH.test(filePath)) {
      return NextResponse.json({ error: "Invalid upload reservation" }, { status: 400, ...NO_STORE })
    }
    safePath = filePath
    const metadata = normalizeSubmission(body)
    const claimedSize = body.fileSize
    if (!Number.isSafeInteger(claimedSize) || Number(claimedSize) < 1 || Number(claimedSize) > COMMUNITY_MAX_PDF_BYTES) {
      await removeObject(filePath)
      return NextResponse.json({ error: "PDF size must be between 1 byte and 50 MB" }, { status: 400, ...NO_STORE })
    }
    const db = createAdminClient()
    const { data: blob, error: downloadError } = await db.storage.from("community-pdfs").download(filePath)
    if (downloadError || !blob) {
      await removeObject(filePath)
      return NextResponse.json({ error: "Uploaded PDF was not found", code: "upload_not_found" }, { status: 400, ...NO_STORE })
    }
    if (blob.size !== Number(claimedSize) || blob.size > COMMUNITY_MAX_PDF_BYTES || (blob.type && blob.type !== "application/pdf")) {
      await removeObject(filePath)
      return NextResponse.json({ error: "Uploaded PDF size or MIME type is invalid" }, { status: 400, ...NO_STORE })
    }
    const bytes = new Uint8Array(await blob.arrayBuffer())
    if (!hasPdfSignature(bytes)) {
      await removeObject(filePath)
      return NextResponse.json({ error: "Uploaded file is not a valid PDF" }, { status: 400, ...NO_STORE })
    }
    let pageCount: number
    try {
      pageCount = (await PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false })).getPageCount()
      if (pageCount < 1 || pageCount > 10000) throw new Error("invalid pages")
    } catch {
      await removeObject(filePath)
      return NextResponse.json({ error: "Uploaded PDF could not be read" }, { status: 400, ...NO_STORE })
    }
    const safety = inspectPdfSafety(bytes)
    const client = await createClient()
    const { data: { user } } = client ? await client.auth.getUser() : { data: { user: null } }
    const { data: submission, error } = await db.rpc("create_community_submission", {
      p_reservation_id: reservationId,
      p_email_hash: privacyHash("email", metadata.submitterEmail),
      p_file_path: filePath,
      p_title: metadata.title,
      p_file_size: bytes.byteLength,
      p_page_count: pageCount,
      p_content_type: metadata.content_type,
      p_content_category: metadata.content_category,
      p_content_subcategory: metadata.content_subcategory,
      p_subject: metadata.subject,
      p_description: metadata.description,
      p_submitter_name: metadata.submitterName,
      p_submitter_email: metadata.submitterEmail,
      p_submitter_note: metadata.submitterNote,
      p_copyright_confirmed: true,
      p_user_id: user?.id ?? null,
      p_content_hash: createHash("sha256").update(bytes).digest("hex"),
      p_malware_status: safety.malwareStatus,
      p_review_warnings: safety.warnings,
    })
    if (error) {
      const terminal = error.code === "22023" || error.message?.includes("invalid or expired reservation")
      if (terminal) await removeObject(filePath)
      return NextResponse.json(
        { error: terminal ? "Upload reservation is invalid or expired" : "Could not save submission" },
        { status: terminal ? 400 : 500, ...NO_STORE },
      )
    }
    safePath = null
    return NextResponse.json({ submission: { id: submission.id, status: "pending" } }, { status: 201, ...NO_STORE })
  } catch (error) {
    if (safePath) await removeObject(safePath)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400, ...NO_STORE })
  }
}