import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
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
    rpc: async (_name: string, args: Record<string, unknown>) => {
      state.rpcCalls += 1
      state.saved = args
      return { error: state.writeError }
    },
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
    state.writeError = null
    state.saved = null
    state.rpcCalls = 0
  })

  it("atomically patches the chat ID without running DDL", async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(state.saved).toEqual({
      p_key: "general_settings",
      p_patch: { telegramChatId: "-123456" },
    })
    expect(state.rpcCalls).toBe(1)
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