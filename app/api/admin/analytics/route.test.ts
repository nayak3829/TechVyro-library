import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  requestedTrendDays: 0,
}))

vi.mock("@/lib/admin-auth", () => ({
  extractToken: (request: Request) => request.headers.get("Authorization"),
  verifyAdminToken: (token: string | null) => token === "valid",
}))

function result<T>(data: T) {
  return Promise.resolve({ data, error: null })
}

vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => {
        if (table === "pdfs") {
          return {
            range: () => result([{
              id: "pdf-1", title: "Guide", category_id: "cat-1", view_count: 10,
              download_count: 5, review_count: 2, file_size: 1024, average_rating: 4.5,
            }]),
          }
        }
        if (table === "categories") return result([{ id: "cat-1", name: "Guides", color: "#000000" }])
        return result([])
      },
    }),
    rpc: (_name: string, args: { p_days: number }) => {
      state.requestedTrendDays = args.p_days
      return result([{ event_date: "2026-09-03", views: 3, downloads: 1 }])
    },
  }),
}))

import { GET } from "./route"

describe("admin analytics API", () => {
  beforeEach(() => {
    state.requestedTrendDays = 0
  })

  it("rejects unauthenticated requests", async () => {
    const response = await GET(new Request("https://example.test/api/admin/analytics"))
    expect(response.status).toBe(401)
  })

  it("normalizes unsupported ranges and returns complete calculated metrics", async () => {
    const response = await GET(new Request("https://example.test/api/admin/analytics?days=365", {
      headers: { Authorization: "valid" },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(state.requestedTrendDays).toBe(7)
    expect(body.stats).toMatchObject({
      totalViews: 10,
      totalDownloads: 5,
      totalReviews: 2,
      totalPdfs: 1,
      avgRating: 4.5,
    })
    expect(body.trends).toEqual([expect.objectContaining({ views: 3, downloads: 1 })])
    expect(body.categories).toEqual([expect.objectContaining({ count: 1, views: 10, downloads: 5 })])
  })
})