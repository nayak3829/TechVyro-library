import { describe, expect, it } from "vitest"
import { PDFDocument } from "pdf-lib"
import { analyzePdfOnServer, serverPdfSlug, serverPdfTags } from "./pdf-server-analysis"

describe("server PDF analysis", () => {
  it("fills metadata and creates a thumbnail", async () => {
    const document = await PDFDocument.create()
    document.addPage()
    document.addPage()
    const bytes = await document.save()
    const result = await analyzePdfOnServer(bytes, "SSC Geography Notes", "a".repeat(64), "SSC")
    expect(result.pageCount).toBe(2)
    expect(result.malwareStatus).toBe("clean")
    expect(result.slug).toBe("ssc-geography-notes")
    expect(result.tags).toContain("ssc")
    expect(result.thumbnail.byteLength).toBeGreaterThan(100)
  })

  it("creates stable fallback slugs for non-Latin titles", () => {
    expect(serverPdfSlug("भारत का भूगोल", "b".repeat(64))).toBe(`pdf-${"b".repeat(12)}`)
    expect(serverPdfTags("भारत का भूगोल", "SSC")).toContain("ssc")
  })
})