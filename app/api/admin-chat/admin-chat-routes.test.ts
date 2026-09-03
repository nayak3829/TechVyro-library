import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const SESSION_ID = "8f44eb32-397c-4ff2-8ba0-c2d8d4a06122"
let session: Record<string, unknown> | null
let messagesDeleted = false

const supabase = {
  from(table: string) {
    return {
      select(_columns: string, options?: { head?: boolean }) {
        return {
          eq(_column: string, _value: string) {
            if (options?.head) return Promise.resolve({ count: 0, error: null })
            return {
              maybeSingle: () => Promise.resolve({
                data: table === "admin_chat_sessions" ? session : null,
                error: null,
              }),
            }
          },
        }
      },
      delete() {
        return {
          eq: async () => {
            if (table === "admin_chat_messages") messagesDeleted = true
            if (table === "admin_chat_sessions") session = null
            return { error: null }
          },
        }
      },
    }
  },
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabase,
  isAdminConfigured: () => true,
}))

vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(123),
}))

import { POST as endSession } from "./end/route"
import { GET as pollSession } from "./poll/route"
import { POST as sendMessage } from "./send/route"
import { clearAdminChatRateLimitsForTests } from "@/lib/admin-chat-security"

function request(path: string, init?: RequestInit) {
  return new Request(`https://techvyro.example${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": "203.0.113.10",
      "user-agent": "route-test",
      ...init?.headers,
    },
  })
}

describe("public admin-chat lifecycle", () => {
  const redisEnvironment = {
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  }

  beforeAll(() => {
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
  })

  afterAll(() => {
    if (redisEnvironment.url === undefined) delete process.env.KV_REST_API_URL
    else process.env.KV_REST_API_URL = redisEnvironment.url
    if (redisEnvironment.token === undefined) delete process.env.KV_REST_API_TOKEN
    else process.env.KV_REST_API_TOKEN = redisEnvironment.token
  })

  beforeEach(() => {
    clearAdminChatRateLimitsForTests()
    messagesDeleted = false
    session = {
      id: SESSION_ID,
      student_name: "Student",
      created_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    }
  })

  afterEach(() => vi.clearAllMocks())

  it("rejects invalid capabilities before database access", async () => {
    const response = await sendMessage(request("/api/admin-chat/send", {
      method: "POST",
      body: JSON.stringify({ sessionId: "guessable", message: "hello" }),
    }))
    expect(response.status).toBe(400)
  })

  it("rejects expired sessions for send and poll", async () => {
    session!.created_at = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

    const sendResponse = await sendMessage(request("/api/admin-chat/send", {
      method: "POST",
      body: JSON.stringify({ sessionId: SESSION_ID, message: "hello" }),
    }))
    expect(sendResponse.status).toBe(410)

    const pollResponse = await pollSession(request(
      `/api/admin-chat/poll?sessionId=${SESSION_ID}`
    ))
    expect(pollResponse.status).toBe(410)
  })

  it("ends by deleting the current-schema capability and rejects later use", async () => {
    const endResponse = await endSession(request("/api/admin-chat/end", {
      method: "POST",
      body: JSON.stringify({ sessionId: SESSION_ID, reason: "ended_by_user" }),
    }))
    expect(endResponse.status).toBe(200)
    expect(messagesDeleted).toBe(true)
    expect(session).toBeNull()

    const pollResponse = await pollSession(request(
      `/api/admin-chat/poll?sessionId=${SESSION_ID}`
    ))
    expect(pollResponse.status).toBe(404)
  })
})