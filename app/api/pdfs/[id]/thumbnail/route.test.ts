import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  thumbnailPath: "thumbnails/1700000000000-preview.jpg" as string | null,
  visible: true,
}))

vi.mock("@/lib/pdf-access", () => ({
  applyPublicPdfVisibility: (query: unknown) => query,
  canViewPDF: () => state.visible,
  getPDFRequestIdentity: async () => ({ isAdmin: false, isAuthenticated: false }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({
          data: {
            title: "Fallback PDF",
            thumbnail_path: state.thumbnailPath,
            visibility: "public",
            scheduled_at: null,
            publish_status: "published",
          },
          error: null,
        }),
      }
      return query
    },
    storage: {
      from: () => ({
        download: async () => ({
          data: new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }),
          error: null,
        }),
      }),
    },
  }),
}))

import { GET } from "./route"

describe("PDF thumbnail route", () => {
  beforeEach(() => {
    state.thumbnailPath = "thumbnails/1700000000000-preview.jpg"
    state.visible = true
  })

  it("streams a stored thumbnail without exposing its private path", async () => {
    const response = await GET(new Request("https://example.test/api/pdfs/pdf-1/thumbnail"), {
      params: Promise.resolve({ id: "pdf-1" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/jpeg")
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff]))
  })

  it("returns a generated cover when no stored thumbnail exists", async () => {
    state.thumbnailPath = null
    const response = await GET(new Request("https://example.test/api/pdfs/pdf-1/thumbnail"), {
      params: Promise.resolve({ id: "pdf-1" }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/svg+xml")
    expect(await response.text()).toContain("Fallback PDF")
  })
})