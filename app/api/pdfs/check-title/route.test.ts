import { describe, expect, it, vi } from "vitest"

const auth = vi.hoisted(() => ({ allowed: false }))

vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => "token",
  verifyAdminToken: () => auth.allowed,
}))
vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  createAdminClient: () => ({ from: () => ({ select: () => ({ ilike: () => ({ single: async () => ({ data: { id: "1", title: "Private title" } }) }) }) }) }),
}))

import { GET } from "./route"

describe("check-title access control", () => {
  it("does not expose title existence to non-admin callers", async () => {
    auth.allowed = false
    const response = await GET(new Request("https://example.test/api/pdfs/check-title?title=Private+title"))
    expect(response.status).toBe(401)
  })

  it("allows the admin upload flow to check a title", async () => {
    auth.allowed = true
    const response = await GET(new Request("https://example.test/api/pdfs/check-title?title=Private+title"))
    await expect(response.json()).resolves.toEqual({ exists: true, existingTitle: "Private title" })
  })
})