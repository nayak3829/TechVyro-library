import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  filters: [] as Array<[string, string, unknown]>,
  limit: 0,
}))

vi.mock("@/lib/admin-auth", () => ({
  extractToken: (request: Request) => request.headers.get("Authorization"),
  verifyAdminToken: (token: string | null) => token === "valid",
}))

function queryBuilder() {
  let rows = [...state.rows]
  const query = {
    select: () => query,
    order: () => query,
    gte(column: string, value: unknown) {
      state.filters.push(["gte", column, value])
      return query
    },
    lt(column: string, value: unknown) {
      state.filters.push(["lt", column, value])
      rows = rows.filter(row => Number(row[column]) < Number(value))
      return query
    },
    eq(column: string, value: unknown) {
      state.filters.push(["eq", column, value])
      rows = rows.filter(row => row[column] === value)
      return query
    },
    ilike(column: string, value: string) {
      state.filters.push(["ilike", column, value])
      return query
    },
    limit(value: number) {
      state.limit = value
      rows = rows.slice(0, value)
      return query
    },
    then(resolve: (result: { data: typeof rows; error: null }) => unknown) {
      return Promise.resolve(resolve({ data: rows, error: null }))
    },
  }
  return query
}

vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  createAdminClient: () => ({ from: () => queryBuilder() }),
}))

import { GET } from "./route"

describe("admin activity API", () => {
  beforeEach(() => {
    state.rows = []
    state.filters = []
    state.limit = 0
  })

  it("rejects unauthenticated requests", async () => {
    const response = await GET(new Request("https://example.test/api/admin/activity"))
    expect(response.status).toBe(401)
  })

  it("rejects invalid cursors and filters", async () => {
    const response = await GET(new Request("https://example.test/api/admin/activity?cursor=-1&action=unknown", {
      headers: { Authorization: "valid" },
    }))
    expect(response.status).toBe(400)
  })

  it("uses a bounded lookahead and returns a stable next cursor", async () => {
    state.rows = Array.from({ length: 52 }, (_, index) => ({
      id: 100 - index,
      action: "updated",
      resource_type: "pdfs",
      resource_id: `pdf-${index}`,
      actor_type: "admin_server",
      summary: `PDF ${index}`,
      metadata: {},
      created_at: "2026-09-03T00:00:00.000Z",
    }))
    const response = await GET(new Request("https://example.test/api/admin/activity?limit=50&action=updated&resource=pdfs", {
      headers: { Authorization: "valid" },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(state.limit).toBe(51)
    expect(body.events).toHaveLength(50)
    expect(body.nextCursor).toBe(51)
    expect(body.hasMore).toBe(true)
    expect(body.retentionDays).toBe(365)
    expect(state.filters).toContainEqual(["eq", "action", "updated"])
    expect(state.filters).toContainEqual(["eq", "resource_type", "pdfs"])
  })
})