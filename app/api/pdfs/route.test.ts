import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ filters: [] as Array<[string, string]> }))

function queryBuilder() {
  const query = {
    select: () => query,
    order: () => query,
    eq: (field: string, value: string) => { state.filters.push([field, value]); return query },
    or: () => query,
    range: () => query,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data: [], error: null })),
  }
  return query
}

vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => null,
  verifyAdminToken: () => false,
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => queryBuilder() }),
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => queryBuilder() }),
}))

import { NextRequest } from "next/server"
import { GET } from "./route"

describe("PDF list hierarchy filtering", () => {
  beforeEach(() => { state.filters.length = 0 })

  it("applies ordered hierarchy filters server-side", async () => {
    const response = await GET(new NextRequest(
      "https://example.test/api/pdfs?contentType=school&contentCategory=Class%2010&contentSubcategory=CBSE&subject=Physics",
    ))
    expect(response.status).toBe(200)
    expect(state.filters).toEqual(expect.arrayContaining([
      ["content_type", "school"],
      ["content_category", "Class 10"],
      ["content_subcategory", "CBSE"],
      ["subject", "Physics"],
    ]))
  })

  it("rejects skipped and malformed filter levels", async () => {
    const skipped = await GET(new NextRequest("https://example.test/api/pdfs?contentCategory=SSC"))
    expect(skipped.status).toBe(400)
    const malformed = await GET(new NextRequest("https://example.test/api/pdfs?contentType=exam"))
    expect(malformed.status).toBe(400)
    expect(state.filters).toEqual([])
  })
})