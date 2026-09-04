import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const migration = readFileSync("scripts/035_pdf_content_hierarchy.sql", "utf8")

describe("PDF content hierarchy migration", () => {
  it("keeps columns nullable and constrains content types", () => {
    expect(migration).not.toMatch(/content_type\s+TEXT\s+NOT NULL/i)
    expect(migration).toContain("'exams', 'school', 'college', 'diploma'")
    expect(migration).toMatch(/CREATE INDEX IF NOT EXISTS idx_pdfs_content_hierarchy/i)
  })

  it("backfills joined SSC rows without overwriting generic values", () => {
    expect(migration).toMatch(/FROM public\.categories AS c/)
    expect(migration).toMatch(/p\.category_id = c\.id/)
    expect(migration).toMatch(/lower\(trim\(c\.name\)\) = 'ssc'/)
    expect(migration).toMatch(/content_type = COALESCE\(p\.content_type, 'exams'\)/)
    expect(migration).toMatch(/content_category = COALESCE\(p\.content_category, 'SSC'\)/)
  })
})