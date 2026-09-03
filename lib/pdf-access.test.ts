import { describe, expect, it } from "vitest"
import { applyPublicPdfVisibility, canViewPDF } from "./pdf-access"

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
      ["or", "scheduled_at.is.null,scheduled_at.lte.2026-01-02T03:04:05.000Z"],
    ])
  })

  it("does not consider drafts, rejected rows, or future rows public", () => {
    expect(canViewPDF({ visibility: "public", publish_status: "draft" }, false)).toBe(false)
    expect(canViewPDF({ visibility: "public", publish_status: "needs_review" }, false)).toBe(false)
    expect(canViewPDF({ visibility: "public", publish_status: "rejected" }, false)).toBe(false)
    expect(canViewPDF({ visibility: "public", publish_status: "published", scheduled_at: "2999-01-01T00:00:00Z" }, false)).toBe(false)
    expect(canViewPDF({ visibility: "public", publish_status: "published", scheduled_at: "2020-01-01T00:00:00Z" }, false)).toBe(true)
  })
})