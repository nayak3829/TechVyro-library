import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const state = vi.hoisted(() => ({
  rows: [{ id: "123e4567-e89b-12d3-a456-426614174000" }, { id: "123e4567-e89b-12d3-a456-426614174001" }],
  returnedRows: 2,
  updates: 0,
  lastUpdate: null as Record<string, unknown> | null,
}))

vi.mock("@/lib/admin-auth", () => ({ extractToken: () => "valid", verifyAdminToken: () => true }))
vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "categories") {
        const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: { id: "123e4567-e89b-12d3-a456-426614174010" }, error: null }) }
        return query
      }
      if (table === "site_settings") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: {
              value: [{
                id: "folder-1",
                categories: [{
                  id: "category-1",
                  sections: [{ id: "section-1" }],
                }],
              }],
            },
            error: null,
          }),
        }
        return query
      }
      const query = {
        select: () => query,
        in: async () => ({ data: state.rows, error: null }),
        update: (payload: Record<string, unknown>) => ({
          in: () => ({
            select: async () => {
              state.lastUpdate = payload
              state.updates += 1
              return { data: state.rows.slice(0, state.returnedRows), error: null }
            },
          }),
        }),
      }
      return query
    },
  }),
}))

import { POST } from "./route"

const ids = state.rows.map((row) => row.id)
const category = "123e4567-e89b-12d3-a456-426614174010"

describe("bulk PDF move", () => {
  beforeEach(() => {
    state.rows = [{ id: ids[0] }, { id: ids[1] }]
    state.returnedRows = 2
    state.updates = 0
    state.lastUpdate = null
  })

  it("does not mutate when any selected PDF is missing", async () => {
    state.rows = [state.rows[0]]
    const response = await POST(new NextRequest("https://example.test/api/pdfs/bulk-move", {
      method: "POST", body: JSON.stringify({ ids, category_id: category }),
    }))
    expect(response.status).toBe(404)
    expect(state.updates).toBe(0)
  })

  it("rejects zero or partial update results", async () => {
    state.returnedRows = 1
    const response = await POST(new NextRequest("https://example.test/api/pdfs/bulk-move", {
      method: "POST", body: JSON.stringify({ ids, category_id: category }),
    }))
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toMatchObject({ updated: 1 })
  })

  it("moves PDFs in Content Structure without clearing the legacy category", async () => {
    const structureLocation = {
      folderId: "folder-1",
      categoryId: "category-1",
      sectionId: "section-1",
    }
    const response = await POST(new NextRequest("https://example.test/api/pdfs/bulk-move", {
      method: "POST",
      body: JSON.stringify({ ids, structure_location: structureLocation }),
    }))

    expect(response.status).toBe(200)
    expect(state.lastUpdate).toEqual({ structure_location: structureLocation })
  })

  it("rejects a stale Content Structure location", async () => {
    const response = await POST(new NextRequest("https://example.test/api/pdfs/bulk-move", {
      method: "POST",
      body: JSON.stringify({
        ids,
        structure_location: {
          folderId: "folder-1",
          categoryId: "category-1",
          sectionId: "missing-section",
        },
      }),
    }))

    expect(response.status).toBe(400)
    expect(state.updates).toBe(0)
  })
})