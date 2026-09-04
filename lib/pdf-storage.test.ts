import { describe, expect, it } from "vitest"
import { validPdfStorageLocation } from "./pdf-storage"

describe("explicit PDF storage locations", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000"
  it("allows legacy PDFs only in the legacy bucket", () => {
    expect(validPdfStorageLocation("pdfs", "123-notes.pdf")).toBe(true)
    expect(validPdfStorageLocation("community-pdfs", "123-notes.pdf")).toBe(false)
  })
  it("allows reservation-shaped community PDFs only in their dedicated bucket", () => {
    expect(validPdfStorageLocation("community-pdfs", `community/${id}.pdf`)).toBe(true)
    expect(validPdfStorageLocation("pdfs", `community/${id}.pdf`)).toBe(true)
  })
})