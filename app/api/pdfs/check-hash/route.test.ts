import { describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ admin: false, row: null as any }))
vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => state.admin ? "valid" : null,
  verifyAdminToken: (token: string | null) => Boolean(token),
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: state.row, error: null }) }) }) }) }),
  }),
}))
import { GET } from "./route"

describe("PDF content hash check", () => {
  it("requires an admin session", async () => {
    state.admin = false
    expect((await GET(new Request("https://example.test/api/pdfs/check-hash?hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"))).status).toBe(401)
  })
  it("returns exact duplicate matches", async () => {
    state.admin = true
    state.row = { id: "pdf-1", title: "Existing" }
    const response = await GET(new Request("https://example.test/api/pdfs/check-hash?hash=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ duplicate: true, pdf: state.row })
  })
})