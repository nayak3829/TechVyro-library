import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("homepage PDF projection", () => {
  it("includes generic hierarchy fields for PDFGrid", () => {
    const source = readFileSync("app/page.tsx", "utf8")
    expect(source.match(/content_type, content_category, content_subcategory, subject/g)).toHaveLength(2)
    expect(source).toContain("<PDFGrid pdfs={pdfs}")
  })
})