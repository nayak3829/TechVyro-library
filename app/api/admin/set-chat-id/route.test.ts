import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  existing: { siteName: "TechVyro", rateLimit: 10 } as Record<string, unknown>,
  readError: null as null | { message: string; code?: string },
  writeError: null as null | { message: string; code?: string },
  saved: null as null | Record<string, unknown>,
  rpcCalls: 0,
}))

vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => "valid",
  verifyAdminToken: () => true,
}))

vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  createAdminClient: () => ({
    rpc: async () => {
      state.rpcCalls += 1
      return { error: null }
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: state.readError ? null : { value: state.existing },
            error: state.readError,
          }),
        }),
      }),
      upsert: async (value: Record<string, unknown>) => {
        state.saved = value
        return { error: state.writeError }
      },
    }),
  }),
}))

import { POST } from "./route"

function request(chatId = "-123456") {
  return new Request("https://example.test/api/admin/set-chat-id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId }),
  })
}

describe("set chat ID API hardening", () => {
  beforeEach(() => {
    state.existing = { siteName: "TechVyro", rateLimit: 10 }
    state.readError = null
    state.writeError = null
    state.saved = null
    state.rpcCalls = 0
  })

  it("merges the chat ID without dropping existing general settings or running DDL", async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(state.saved?.value).toEqual({
      siteName: "TechVyro",
      rateLimit: 10,
      telegramChatId: "-123456",
    })
    expect(state.rpcCalls).toBe(0)
  })

  it("does not disclose database errors", async () => {
    state.writeError = {
      message: "relation site_settings does not exist at host db.internal",
      code: "42P01",
    }

    const response = await POST(request())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Unable to update chat ID" })
  })
})