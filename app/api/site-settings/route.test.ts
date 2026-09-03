import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  rows: [] as Array<{ key: string; value: unknown }>,
  selectedKeys: [] as string[],
  upsertError: null as null | { message: string; code?: string },
  upserts: [] as unknown[],
  rpcCalls: 0,
}))

vi.mock("@/lib/admin-auth", () => ({
  extractToken: (request: Request) => request.headers.get("Authorization")?.replace("Bearer ", "") ?? null,
  verifyAdminToken: (token: string | null) => token === "valid",
}))

function client() {
  return {
    rpc: async () => {
      state.rpcCalls += 1
      return { error: null }
    },
    from: () => ({
      select() {
        const allResult = { data: state.rows, error: null }
        return {
          then(resolve: (value: typeof allResult) => unknown) {
            return Promise.resolve(resolve(allResult))
          },
          eq(_column: string, key: string) {
            state.selectedKeys.push(key)
            const result = {
              data: state.rows.find(row => row.key === key)
                ? { value: state.rows.find(row => row.key === key)?.value }
                : null,
              error: null,
            }
            return {
              single: async () => result,
              maybeSingle: async () => result,
            }
          },
        }
      },
      upsert: async (entries: unknown) => {
        state.upserts.push(entries)
        return { error: state.upsertError }
      },
    }),
  }
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => client(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => client(),
}))

import { GET, PUT } from "./route"

describe("site settings API hardening", () => {
  beforeEach(() => {
    state.rows = []
    state.selectedKeys = []
    state.upsertError = null
    state.upserts = []
    state.rpcCalls = 0
  })

  it("only returns allowlisted public settings and strips private general fields", async () => {
    state.rows = [
      {
        key: "general_settings",
        value: {
          siteName: "TechVyro",
          whatsappChannelUrl: "https://whatsapp.example/channel",
          telegramChatId: "-123456",
          rateLimit: 10,
        },
      },
      {
        key: "testimonials",
        value: [{
          id: "one",
          name: "Student",
          course: "Course",
          avatar: "https://example.test/avatar.png",
          rating: 5,
          comment: "Helpful",
          verified: true,
          enabled: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        }],
      },
      { key: "internal_api_credentials", value: { secret: "do-not-return" } },
    ]

    const response = await GET(new Request("https://example.test/api/site-settings"))
    const body = await response.json()

    expect(body.settings).toEqual({
      general_settings: {
        siteName: "TechVyro",
        whatsappChannelUrl: "https://whatsapp.example/channel",
      },
      testimonials: [{
        id: "one",
        name: "Student",
        course: "Course",
        avatar: "https://example.test/avatar.png",
        rating: 5,
        comment: "Helpful",
        verified: true,
        enabled: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      }],
    })
  })

  it("does not query an arbitrary setting requested by a public client", async () => {
    const response = await GET(new Request(
      "https://example.test/api/site-settings?key=internal_api_credentials"
    ))

    expect(await response.json()).toEqual({ value: null })
    expect(state.selectedKeys).toEqual([])
  })

  it("returns complete settings to an authenticated admin client", async () => {
    state.rows = [{
      key: "general_settings",
      value: { siteName: "TechVyro", telegramChatId: "-123456", rateLimit: 10 },
    }]

    const response = await GET(new Request("https://example.test/api/site-settings", {
      headers: { Authorization: "Bearer valid" },
    }))

    expect((await response.json()).settings.general_settings).toMatchObject({
      telegramChatId: "-123456",
      rateLimit: 10,
    })
  })

  it("fails closed when an existing admin setting is malformed", async () => {
    state.rows = [{
      key: "general_settings",
      value: { siteName: 123, telegramChatId: "-123456" },
    }]

    const response = await GET(new Request("https://example.test/api/site-settings?key=general_settings", {
      headers: { Authorization: "Bearer valid" },
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Stored setting is invalid" })
  })

  it("rejects unknown update keys before touching the database", async () => {
    const response = await PUT(new Request("https://example.test/api/site-settings", {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ internal_api_credentials: { secret: "value" } }),
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Invalid request" })
    expect(state.upserts).toEqual([])
  })

  it("rejects blank hero list items before touching the database", async () => {
    const response = await PUT(new Request("https://example.test/api/site-settings", {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hero_settings: {
          taglines: ["Valid tagline", "   "],
          trustStats: ["100+ PDFs"],
        },
      }),
    }))

    expect(response.status).toBe(400)
    expect(state.upserts).toEqual([])
  })

  it("accepts the homepage manager's rendered schema without runtime DDL calls", async () => {
    const response = await PUT(new Request("https://example.test/api/site-settings", {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hero_settings: {
          taglines: ["Explore resources"],
          trustStats: ["Free resources"],
          badgeText: "Library",
          description: "Study materials",
          heroBtnText: "Browse",
          whatsappBtnText: "Join updates",
        },
        testimonials: [],
      }),
    }))

    expect(response.status).toBe(200)
    expect(state.upserts).toHaveLength(1)
    expect(state.rpcCalls).toBe(0)
  })

  it("does not disclose database errors", async () => {
    state.upsertError = { message: "relation site_settings does not exist", code: "42P01" }
    const response = await PUT(new Request("https://example.test/api/site-settings", {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ testimonials: [] }),
    }))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Unable to save settings" })
    expect(state.rpcCalls).toBe(0)
  })

  it.each([
    { general_settings: { mainWebsite: "javascript:alert(1)" } },
    { announcements: [{ id: "a", title: "Notice", message: "Text", type: "info", link: "data:text/html,bad", enabled: true, createdAt: "now" }] },
    { testimonials: [{ id: "t", name: "Student", course: "Course", avatar: "http://unsafe.test/a.png", rating: 5, comment: "Good", verified: true, enabled: true, createdAt: "now" }] },
    { testimonials: [{ id: "t", name: "Student", course: "Course", avatar: "", rating: 5, comment: "Good", verified: true, enabled: true, createdAt: "now" }] },
  ])("rejects unsafe persisted URLs", async (payload) => {
    const response = await PUT(new Request("https://example.test/api/site-settings", {
      method: "PUT",
      headers: { Authorization: "Bearer valid", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }))
    expect(response.status).toBe(400)
    expect(state.upserts).toEqual([])
  })

  it("filters unsafe legacy fields and malformed testimonials independently", async () => {
    state.rows = [
      { key: "general_settings", value: { siteName: "TechVyro", whatsappChannelUrl: "javascript:alert(1)" } },
      {
        key: "testimonials",
        value: [
          { id: "safe", name: "Student", course: "Course", avatar: "https://example.test/a.png", rating: 5, comment: "Good", verified: true, enabled: true, createdAt: "now" },
          { id: "unsafe", name: "Bad", course: "Course", avatar: "data:image/svg+xml,bad", rating: 5, comment: "Bad", verified: true, enabled: true, createdAt: "now" },
        ],
      },
    ]
    const response = await GET(new Request("https://example.test/api/site-settings"))
    const body = await response.json()
    expect(body.settings.general_settings).toEqual({ siteName: "TechVyro" })
    expect(body.settings.testimonials).toHaveLength(1)
    expect(body.settings.testimonials[0].id).toBe("safe")
  })

  it("requires JSON and rejects declared oversized bodies", async () => {
    const wrongType = await PUT(new Request("https://example.test/api/site-settings", {
      method: "PUT",
      headers: { Authorization: "Bearer valid", "Content-Type": "text/plain" },
      body: "{}",
    }))
    expect(wrongType.status).toBe(415)

    const oversized = await PUT(new Request("https://example.test/api/site-settings", {
      method: "PUT",
      headers: {
        Authorization: "Bearer valid",
        "Content-Type": "application/json",
        "Content-Length": String(300 * 1024),
      },
      body: "{}",
    }))
    expect(oversized.status).toBe(413)
  })
})