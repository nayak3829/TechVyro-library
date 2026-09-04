import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  events: [] as string[],
  currentPath: "old.pdf",
  currentThumbnail: "thumbnails/1700000000000-old.jpg",
  updateError: null as null | { message: string },
  storageError: false,
  updatePayload: null as Record<string, unknown> | null,
}))

vi.mock("@/lib/admin-auth", () => ({
  extractToken: vi.fn(() => "valid"),
  verifyAdminToken: vi.fn(() => true),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select() {
        return {
          eq() {
            return {
               single: async () => ({ data: { file_path: state.currentPath, thumbnail_path: state.currentThumbnail }, error: null }),
            }
          },
        }
      },
      update(payload: Record<string, unknown>) {
        state.updatePayload = payload
        return {
          eq() {
            return {
              select() {
                return {
                  single: async () => {
                    state.events.push("db-update")
                    return state.updateError
                      ? { data: null, error: state.updateError }
                      : { data: { id: "pdf-1", file_path: "new.pdf" }, error: null }
                  },
                }
              },
            }
          },
        }
      },
      delete() {
        return { eq: async () => { state.events.push("db-delete"); return { error: null } } }
      },
    }),
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          state.events.push(`remove:${paths.join(",")}`)
          return { error: state.storageError ? { message: "storage unavailable" } : null }
        },
      }),
    },
  }),
}))

import { DELETE, PATCH } from "./route"

function replacementRequest() {
  return new Request("https://example.test/api/pdfs/pdf-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: "new.pdf", file_size: 42 }),
  })
}

describe("PDF replacement ordering", () => {
  beforeEach(() => {
    state.events.length = 0
    state.currentPath = "old.pdf"
    state.currentThumbnail = "thumbnails/1700000000000-old.jpg"
    state.updateError = null
    state.storageError = false
    state.updatePayload = null
  })

  it("updates metadata before removing the old object", async () => {
    const response = await PATCH(replacementRequest(), { params: Promise.resolve({ id: "pdf-1" }) })

    expect(response.status).toBe(200)
    expect(state.events).toEqual(["db-update", "remove:old.pdf", "remove:thumbnails/1700000000000-old.jpg"])
  })

  it("rejects incomplete hierarchy edits before database access", async () => {
    const response = await PATCH(new Request("https://example.test/api/pdfs/pdf-1", {
      method: "PATCH",
      body: JSON.stringify({ contentType: "school", contentCategory: "Class 10" }),
    }), { params: Promise.resolve({ id: "pdf-1" }) })
    expect(response.status).toBe(400)
    expect(state.events).toEqual([])
  })

  it("preserves migrated SSC classification for a title-only edit", async () => {
    const response = await PATCH(new Request("https://example.test/api/pdfs/pdf-1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Renamed SSC notes" }),
    }), { params: Promise.resolve({ id: "pdf-1" }) })
    expect(response.status).toBe(200)
    expect(state.updatePayload).toMatchObject({ title: "Renamed SSC notes" })
    expect(state.updatePayload).not.toHaveProperty("content_type")
    expect(state.updatePayload).not.toHaveProperty("content_subcategory")
  })

  it("removes the replacement and leaves the old object when the update fails", async () => {
    state.updateError = { message: "database unavailable" }

    const response = await PATCH(replacementRequest(), { params: Promise.resolve({ id: "pdf-1" }) })

    expect(response.status).toBe(500)
    expect(state.events).toEqual(["db-update", "remove:new.pdf"])
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/original.*preserved/i) })
  })

  it("rejects unsafe replacement paths without touching storage or metadata", async () => {
    const request = new Request("https://example.test/api/pdfs/pdf-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: "../old.pdf", file_size: 42 }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: "pdf-1" }) })

    expect(response.status).toBe(400)
    expect(state.events).toEqual([])
  })

  it("deletes the record before both the PDF and its thumbnail", async () => {
    const response = await DELETE(new Request("https://example.test/api/pdfs/pdf-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "pdf-1" }),
    })
    expect(response.status).toBe(200)
    expect(state.events).toEqual(["db-delete", "remove:old.pdf,thumbnails/1700000000000-old.jpg"])
  })

  it("returns a successful partial result when storage cleanup fails", async () => {
    state.storageError = true
    const response = await DELETE(new Request("https://example.test/api/pdfs/pdf-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "pdf-1" }),
    })
    expect(response.status).toBe(207)
    await expect(response.json()).resolves.toMatchObject({ success: true, storageCleanupRequired: true, warning: expect.any(String) })
  })
})