import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("community submission route security contracts", () => {
  it("reserves quota before issuing a private path", () => {
    const source = read("app/api/submissions/upload-url/route.ts")
    expect(source).toContain('rpc("reserve_community_submission_slot"')
    expect(source).toContain('privacyHash("email"')
    expect(source).toContain('privacyHash("ip"')
    expect(source).toContain("createSignedUploadUrl(filePath)")
    expect(source).toContain("community/${reservationId}.pdf")
    expect(source).toContain("cleanExpiredUploads")
    expect(source).toContain('is("cleaned_at", null)')
    expect(source).toContain("limit(20)")
    expect(source).toContain("cleaned_at: new Date().toISOString()")
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
      expect(source).toContain("verifyAdminToken(extractToken(request))")
      expect(source.indexOf("verifyAdminToken(extractToken(request))")).toBeLessThan(source.indexOf("createAdminClient()"))
    }
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
    expect(detail).toContain("unsafe ? 422")
  })

  it("requires safe community sources publicly and unpublishes later findings", () => {
    for (const path of ["app/api/pdfs/[id]/view/route.ts", "app/api/pdfs/[id]/download-watermarked/route.ts"]) {
      const source = read(path)
      expect(source).toContain('pdf.storage_bucket === "community-pdfs"')
      expect(source).toContain('pdf.malware_status !== "clean"')
    }
    const worker = read("lib/pdf-job-runner.ts")
    expect(worker).toContain('pdf.storage_bucket === "community-pdfs" && analysis.malwareStatus === "suspicious"')
    expect(worker).toContain('visibility: "private", publish_status: "needs_review"')
  })

  it("bounds bulk actions and reports each result", () => {
    const source = read("app/api/admin/submissions/bulk/route.ts")
    expect(source).toContain("ids.length > 50")
    expect(source).toContain("for (const id of ids)")
    expect(source).toContain("success: false")
    expect(source).toContain("success: true")
    expect(source).toContain("succeeded:")
    expect(source).toContain("failed:")
    expect(source).not.toContain("enqueuePdfJob")
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