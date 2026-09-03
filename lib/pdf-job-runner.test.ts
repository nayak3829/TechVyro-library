import { describe, expect, it } from "vitest"
import { hasServerVerifiedPdfHash, isLegacyServerThumbnail, isSafePdfJobObjectPath, nextDailyDigestAt } from "./pdf-job-runner"

describe("PDF job object safety", () => {
  it("accepts only generated PDF and thumbnail paths in the pdfs bucket", () => {
    expect(isSafePdfJobObjectPath("pdfs", "1712345678901-handout.pdf")).toBe(true)
    expect(isSafePdfJobObjectPath("pdfs", "thumbnails/1712345678901-cover.webp")).toBe(true)
    expect(isSafePdfJobObjectPath("pdfs", "thumbnails/1712345678901-cover.svg")).toBe(true)
    expect(isSafePdfJobObjectPath("pdfs", "../private.pdf")).toBe(false)
    expect(isSafePdfJobObjectPath("other", "1712345678901-handout.pdf")).toBe(false)
  })

  it("computes the next digest at 09:00 IST", () => {
    const before = nextDailyDigestAt(new Date("2025-01-15T02:00:00.000Z"))
    expect(before.toISOString()).toBe("2025-01-15T03:30:00.000Z")
    const after = nextDailyDigestAt(new Date("2025-01-15T04:00:00.000Z"))
    expect(after.toISOString()).toBe("2025-01-16T03:30:00.000Z")
  })

  it("processes server-verified PDFs even when advisory browser analysis is absent", () => {
    expect(hasServerVerifiedPdfHash("a".repeat(64))).toBe(true)
    expect(hasServerVerifiedPdfHash("a".repeat(32))).toBe(false)
    expect(hasServerVerifiedPdfHash(null)).toBe(false)
  })

  it("recognizes only the legacy generated JPEG for a PDF", () => {
    expect(isLegacyServerThumbnail("thumbnails/1712345678901-pdf-1.jpg", "pdf-1")).toBe(true)
    expect(isLegacyServerThumbnail("thumbnails/1712345678901-preview.jpg", "pdf-1")).toBe(false)
    expect(isLegacyServerThumbnail("thumbnails/1712345678901-pdf-1.svg", "pdf-1")).toBe(false)
  })
})