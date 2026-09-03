import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => "valid",
  verifyAdminToken: () => true,
}))

vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { value: { telegramChatId: "-100123456789" } },
          }),
        }),
      }),
    }),
  }),
}))

import { GET } from "./route"

describe("Telegram diagnostic route", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("returns a failure when Telegram rejects the test message", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token"
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        result: { first_name: "Test", username: "test_bot" },
      }), { headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: false,
        description: "Bad Request: chat not found",
      }), { status: 400, headers: { "Content-Type": "application/json" } }))
    vi.stubGlobal("fetch", fetchMock)

    const response = await GET(new Request("https://example.test/api/admin/test-telegram"))
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      success: false,
      message_sent: false,
      error: "Bad Request: chat not found",
    })
  })
})