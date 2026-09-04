import { afterEach, describe, expect, it } from "vitest"
import {
  COMMUNITY_MAX_PDF_BYTES, getCommunityRequestIp, hasPdfSignature,
  normalizeCommunityDescription, normalizeCommunityEmail, privacyHash, validateUploadRequest,
} from "./community-submissions"

const previousSecret = process.env.SESSION_SECRET
afterEach(() => { process.env.SESSION_SECRET = previousSecret })

describe("community submission validation", () => {
  it("normalizes email and bounded optional text", () => {
    expect(normalizeCommunityEmail("  Student@Example.COM ")).toBe("student@example.com")
    expect(normalizeCommunityDescription("  useful   notes ")).toBe("useful notes")
    expect(() => normalizeCommunityDescription("x".repeat(301))).toThrow()
  })

  it("permits an optional community subject while retaining exam restrictions", async () => {
    const { normalizeSubmission } = await import("./community-submissions")
    expect(normalizeSubmission({ title: "Notes", submitterName: "Name", email: "a@b.test", copyrightConfirmed: true,
      contentType: "school", contentCategory: "Class 10", contentSubcategory: "CBSE", subject: "" }).subject).toBeNull()
    expect(() => normalizeSubmission({ title: "Notes", submitterName: "Name", email: "a@b.test", copyrightConfirmed: true,
      contentType: "exams", contentCategory: "SSC", contentSubcategory: "CGL", subject: "Math" })).toThrow()
  })

  it("requires a genuine PDF upload declaration within 50 MB", () => {
    expect(validateUploadRequest({ email: "a@b.test", filename: "notes.pdf", mime: "application/pdf", fileSize: COMMUNITY_MAX_PDF_BYTES }).fileSize)
      .toBe(COMMUNITY_MAX_PDF_BYTES)
    expect(() => validateUploadRequest({ email: "a@b.test", filename: "notes.pdf", mime: "text/plain", fileSize: 10 })).toThrow("Only PDF")
    expect(() => validateUploadRequest({ email: "a@b.test", filename: "notes.pdf", mime: "application/pdf", fileSize: COMMUNITY_MAX_PDF_BYTES + 1 })).toThrow("50 MB")
  })

  it("checks actual PDF magic bytes", () => {
    expect(hasPdfSignature(new TextEncoder().encode("%PDF-1.7"))).toBe(true)
    expect(hasPdfSignature(new TextEncoder().encode("hello.pdf"))).toBe(false)
  })

  it("uses domain-separated secret hashes", () => {
    process.env.SESSION_SECRET = "a-secure-test-secret-value"
    const email = privacyHash("email", "student@example.test")
    expect(email).toMatch(/^[a-f0-9]{64}$/)
    expect(email).not.toBe(privacyHash("ip", "student@example.test"))
    expect(email).not.toContain("student")
  })

  it("prefers trusted single-value proxy headers and never trusts leftmost XFF", () => {
    expect(getCommunityRequestIp(new Request("https://test", { headers: {
      "x-replit-user-ip": "203.0.113.4", "x-forwarded-for": "1.1.1.1, 10.0.0.2",
    } }))).toBe("203.0.113.4")
    expect(getCommunityRequestIp(new Request("https://test", { headers: {
      "x-forwarded-for": "1.1.1.1, 198.51.100.8",
    } }))).toBe("198.51.100.8")
  })
})