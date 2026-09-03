import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ events: [] as string[], storageError: false, removed: [] as string[] }))
const id = "123e4567-e89b-12d3-a456-426614174000"

vi.mock("@/lib/admin-auth", () => ({ extractToken: () => "valid", verifyAdminToken: () => true }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ in: async () => ({ data: [{ id, file_path: "1700000000000-a.pdf", thumbnail_path: "thumbnails/1700000000000-a.jpg" }], error: null }) }),
      delete: () => ({ in: async () => { state.events.push("db"); return { error: null } } }),
    }),
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          state.events.push("storage")
          state.removed = paths
          return { error: state.storageError ? { message: "down" } : null }
        },
      }),
    },
  }),
}))

import { POST } from "./route"

describe("bulk PDF delete", () => {
  beforeEach(() => { state.events = []; state.storageError = false; state.removed = [] })

  it("deletes records before storage and reports cleanup failure honestly", async () => {
    state.storageError = true
    const response = await POST(new Request("https://example.test/api/pdfs/bulk-delete", { method: "POST", body: JSON.stringify({ ids: [id] }) }))
    expect(response.status).toBe(207)
    expect(state.events).toEqual(["db", "storage"])
    await expect(response.json()).resolves.toMatchObject({ success: true, warning: expect.any(String), deleted: 1, storageCleanupRequired: true })
  })

  it("removes a PDF's thumbnail only after its database record is gone", async () => {
    const response = await POST(new Request("https://example.test/api/pdfs/bulk-delete", { method: "POST", body: JSON.stringify({ ids: [id] }) }))
    expect(response.status).toBe(200)
    expect(state.events).toEqual(["db", "storage"])
    expect(state.removed).toEqual(["1700000000000-a.pdf", "thumbnails/1700000000000-a.jpg"])
  })
})