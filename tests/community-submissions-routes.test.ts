import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("community submission route security contracts", () => {
  it("reserves quota before issuing a private path", () => {
    const source = read("app/api/submissions/upload-url/route.ts")
    const cleanup = read("lib/community-upload-cleanup.ts")
    expect(source).toContain('rpc("reserve_community_submission_slot"')
    expect(source).toContain('privacyHash("email"')
    expect(source).toContain('privacyHash("ip"')
    expect(source).toContain("createSignedUploadUrl(filePath)")
    expect(source).toContain("community/${reservationId}.pdf")
    expect(source).toContain("cleanupExpiredCommunityUploads")
    expect(cleanup).toContain('rpc("claim_expired_community_uploads"')
    expect(cleanup).toContain('rpc("finish_community_upload_cleanup"')
    expect(cleanup).toContain("limit = 20")
    expect(cleanup).toContain("p_claim_token: reservation.claim_token")
    expect(cleanup).toContain("p_removed: !removal.error")
  })

  it("binds finalization to the reservation and validates downloaded bytes", () => {
    const source = read("app/api/submissions/route.ts")
    expect(source).toContain("filePath !== `community/${reservationId}.pdf`")
    expect(source).toContain('.storage.from("community-pdfs").download(filePath)')
    expect(source).toContain("blob.size !== Number(claimedSize)")
    expect(source).toContain("hasPdfSignature(bytes)")
    expect(source).toContain('createHash("sha256")')
    expect(source).toContain("PDFDocument.load(bytes")
    expect(source).toContain("inspectPdfSafety(bytes)")
    expect(source).toContain("p_malware_status: safety.malwareStatus")
    expect(source).toContain("p_review_warnings: safety.warnings")
    expect(source).toContain("if (downloadError || !blob) {")
    expect(source).toContain("await removeObject(filePath)")
  })

  it("derives optional user identity on the server", () => {
    const source = read("app/api/submissions/route.ts")
    expect(source).toContain("client.auth.getUser()")
    expect(source).toContain("p_user_id: user?.id ?? null")
    expect(source).not.toContain("body.userId")
  })

  it("scopes authenticated history to the verified account", () => {
    const source = read("app/api/submissions/mine/route.ts")
    expect(source).toContain("db.auth.getUser()")
    expect(source).toContain('.eq("user_id", user.id)')
    expect(source).toContain("rejection_reason")
    expect(source).toContain("approved_pdf_id")
  })

  it("authenticates every admin list, detail, file, and bulk operation", () => {
    for (const path of [
      "app/api/admin/submissions/route.ts",
      "app/api/admin/submissions/[id]/route.ts",
      "app/api/admin/submissions/[id]/file/route.ts",
      "app/api/admin/submissions/bulk/route.ts",
    ]) {
      const source = read(path)
      const authCheck = path.endsWith("[id]/route.ts") || path.endsWith("bulk/route.ts")
        ? "getVerifiedAdminReviewerPrincipal(extractToken(request))"
        : "verifyAdminToken(extractToken(request))"
      expect(source).toContain(authCheck)
      const protectedOperation = authCheck.startsWith("getVerified")
        ? 'rpc("moderate_community_submission"'
        : "createAdminClient()"
      expect(source.indexOf(authCheck)).toBeLessThan(source.indexOf(protectedOperation))
    }
  })

  it("records a server-authenticated moderation-session principal, never a client reviewer", () => {
    const detail = read("app/api/admin/submissions/[id]/route.ts")
    const bulk = read("app/api/admin/submissions/bulk/route.ts")
    const auth = read("lib/admin-auth.ts")

    for (const source of [detail, bulk]) {
      expect(source).toContain("getVerifiedAdminReviewerPrincipal(extractToken(request))")
      expect(source).toContain("p_reviewed_by: reviewer")
      expect(source).not.toContain('p_reviewed_by: "admin"')
      expect(source).not.toContain("body.reviewedBy")
    }
    // Shared admin-password authentication has no individual user identity.
    // Its reviewer field is a keyed, non-secret fingerprint of a verified session.
    expect(auth).toContain("authenticates a shared ADMIN_PASSWORD session, not")
    expect(auth).toContain('return `admin-session:${fingerprint}`')
    expect(auth).toContain('update("community-moderation-reviewer:v1\\0")')
  })

  it("requires rejection reasons and keeps notification failure nonfatal", () => {
    const detail = read("app/api/admin/submissions/[id]/route.ts")
    expect(detail).toContain('body.action === "reject"')
    expect(detail).toContain("A rejection reason is required")
    expect(detail).toContain("publishInAppNotification")
    expect(detail).toContain("notification fan-out is nonfatal")
    expect(detail).toContain("duplicateWarning")
    expect(detail).not.toContain(".or(query)")
    expect(detail).toContain('.ilike("title", `%${token}%`)')
    expect(detail).not.toContain("enqueuePdfJob")
    const migration = read("scripts/039_api_data_integrity.sql")
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.moderate_community_submission")
    expect(migration).toContain("INSERT INTO public.pdf_jobs")
    expect(detail).toContain("Submission did not pass PDF safety checks")
    expect(detail).toContain('message.includes("safety review prevents approval")')
    expect(detail).toContain("status: 422")
    expect(detail).toContain("PDF approved:")
    expect(detail).toContain("approved and is queued for processing")
    expect(detail).not.toContain("A new PDF is now available.")
  })

  it("requires safe community sources publicly and unpublishes later findings", () => {
    for (const path of ["app/api/pdfs/[id]/view/route.ts", "app/api/pdfs/[id]/download-watermarked/route.ts"]) {
      const source = read(path)
      expect(source).toContain("canViewPDF")
      expect(source).toContain("processing_status")
    }
    const policy = read("lib/pdf-access.ts")
    expect(policy).toContain("communityPdfPassesSafety(pdf)")
    expect(policy).toContain('pdf.storage_bucket !== "community-pdfs"')
    expect(policy).toContain('pdf.malware_status === "clean" && pdf.processing_status === "completed"')
    const worker = read("lib/pdf-job-runner.ts")
    expect(worker).toContain('pdf.storage_bucket === "community-pdfs" && analysis.malwareStatus === "suspicious"')
    expect(worker).toContain('visibility: "private", publish_status: "needs_review"')
  })

  it("bounds bulk actions and reports each result", () => {
    const source = read("app/api/admin/submissions/bulk/route.ts")
    expect(source).toContain("ids.length > 50")
    expect(source).toContain("const concurrency = 5")
    expect(source).toContain("ids.slice(index, index + concurrency).map(moderate)")
    expect(source).toContain("success: false")
    expect(source).toContain("success: true")
    expect(source).toContain("succeeded:")
    expect(source).toContain("failed:")
    expect(source).not.toContain("enqueuePdfJob")
    expect(source).toContain("approved and is queued for processing")
    expect(source).not.toContain("A new PDF is now available.")
  })

  it("caps list pagination and does not return its lookahead row", () => {
    const source = read("app/api/admin/submissions/route.ts")
    expect(source).toContain("offset > 10_000")
    expect(source).toContain("range(offset, offset + limit)")
    expect(source).toContain("submissions.slice(0, limit)")
    expect(source).toContain("hasMore: submissions.length > limit")
  })

  it("limits detail fields and warns about exact existing content", () => {
    const source = read("app/api/admin/submissions/[id]/route.ts")
    expect(source).not.toContain('.select("*")')
    expect(source).toContain("content_hash")
    expect(source).toContain('.eq("content_hash", content_hash)')
    expect(source).toContain("duplicateContentWarning")
    expect(source).toContain("reservation-bound storage object")
    expect(source).toContain("duplicate content")
  })

  it("marks all submission JSON responses as non-cacheable", () => {
    for (const path of [
      "app/api/submissions/route.ts", "app/api/submissions/upload-url/route.ts",
      "app/api/submissions/mine/route.ts", "app/api/admin/submissions/route.ts",
      "app/api/admin/submissions/[id]/route.ts", "app/api/admin/submissions/bulk/route.ts",
    ]) expect(read(path)).toContain('"Cache-Control": "no-store"')
    const file = read("app/api/admin/submissions/[id]/file/route.ts")
    expect(file).toContain('"Cache-Control": "private, no-store"')
    expect(file).toContain('"X-Content-Type-Options": "nosniff"')
  })
})