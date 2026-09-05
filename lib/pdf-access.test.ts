import { describe, expect, it } from "vitest"
import { applyPublicPdfVisibility, canViewPDF, communityPdfPassesSafety } from "./pdf-access"

describe("public PDF visibility policy", () => {
  it("adds every public catalogue predicate at the query boundary", () => {
    const calls: Array<[string, unknown]> = []
    const query = {
      eq(column: string, value: unknown) {
        calls.push([column, value])
        return this
      },
      or(value: string) {
        calls.push(["or", value])
        return this
      },
    }

    applyPublicPdfVisibility(query, new Date("2026-01-02T03:04:05.000Z"))

    expect(calls).toEqual([
      ["visibility", "public"],
      ["publish_status", "published"],
      ["malware_status", "clean"],
      ["or", "scheduled_at.is.null,scheduled_at.lte.2026-01-02T03:04:05.000Z"],
    ])
  })

  it("does not consider drafts, rejected rows, or future rows public", () => {
    expect(canViewPDF({ visibility: "public", publish_status: "draft" }, false)).toBe(false)
    expect(canViewPDF({ visibility: "public", publish_status: "needs_review" }, false)).toBe(false)
    expect(canViewPDF({ visibility: "public", publish_status: "rejected" }, false)).toBe(false)
    expect(canViewPDF({ visibility: "public", publish_status: "published", malware_status: "clean", scheduled_at: "2999-01-01T00:00:00Z" }, false)).toBe(false)
    expect(canViewPDF({ visibility: "public", publish_status: "published", malware_status: "clean", scheduled_at: "2020-01-01T00:00:00Z" }, false)).toBe(true)
  })

  it("requires clean PDFs without changing admin access", () => {
    const base = { visibility: "public" as const, publish_status: "published" as const }
    expect(canViewPDF({ ...base, storage_bucket: "community-pdfs", malware_status: "suspicious" }, false)).toBe(false)
    expect(canViewPDF({ ...base, storage_bucket: "community-pdfs", malware_status: "clean" }, false)).toBe(true)
    expect(canViewPDF({ ...base, storage_bucket: "pdfs", malware_status: "suspicious" }, false)).toBe(false)
    expect(canViewPDF({ ...base, storage_bucket: "community-pdfs", malware_status: "suspicious" }, true)).toBe(true)
  })

  it("permits publication only for clean community or normal PDFs", () => {
    expect(communityPdfPassesSafety({ storage_bucket: "community-pdfs", malware_status: "suspicious" })).toBe(false)
    expect(communityPdfPassesSafety({ storage_bucket: "community-pdfs", malware_status: "clean" })).toBe(true)
    expect(communityPdfPassesSafety({ storage_bucket: "pdfs", malware_status: "suspicious" })).toBe(true)
  })
})