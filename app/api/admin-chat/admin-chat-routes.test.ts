import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"

const SESSION_ID = "8f44eb32-397c-4ff2-8ba0-c2d8d4a06122"
const OTHER_SESSION_ID = "f02ac495-c9b2-4278-8c56-9b59ee98cd7f"
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
                data: table === "admin_chat_sessions" && _value === SESSION_ID ? session : null,
                error: null,
              }),
            }
          },
          gte() {
            return {
              gte: () => Promise.resolve({ count: 1, error: null }),
            }
          },
        }
      },
      insert() {
        if (table === "admin_chat_sessions") return Promise.resolve({ error: null })
        return {
          select: () => ({
            single: () => Promise.resolve({
              data: { id: "message-id", created_at: new Date().toISOString() },
              error: null,
            }),
          }),
        }
      },
      update() {
        return { eq: () => Promise.resolve({ error: null }) }
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
import { POST as startSession } from "./start/route"
import {
  ADMIN_CHAT_SESSION_COOKIE,
  clearAdminChatRateLimitsForTests,
  createAdminChatSessionCookieValue,
} from "@/lib/admin-chat-security"

function request(path: string, init?: RequestInit, sessionId?: string) {
  return new Request(`https://techvyro.example${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": "203.0.113.10",
      "user-agent": "route-test",
      ...(sessionId
        ? { cookie: `${ADMIN_CHAT_SESSION_COOKIE}=${createAdminChatSessionCookieValue(sessionId)}` }
        : {}),
      ...init?.headers,
    },
  })
}

describe("public admin-chat lifecycle", () => {
  const redisEnvironment = {
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
    sessionSecret: process.env.SESSION_SECRET,
  }

  beforeAll(() => {
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    process.env.SESSION_SECRET = "admin-chat-route-test-secret"
  })

  afterAll(() => {
    if (redisEnvironment.url === undefined) delete process.env.KV_REST_API_URL
    else process.env.KV_REST_API_URL = redisEnvironment.url
    if (redisEnvironment.token === undefined) delete process.env.KV_REST_API_TOKEN
    else process.env.KV_REST_API_TOKEN = redisEnvironment.token
    if (redisEnvironment.sessionSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = redisEnvironment.sessionSecret
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

  it("sets a signed, restricted session cookie when starting", async () => {
    const response = await startSession(request("/api/admin-chat/start", {
      method: "POST",
      body: JSON.stringify({ studentName: "Student" }),
    }))
    const cookie = response.headers.get("set-cookie") || ""
    expect(response.status).toBe(200)
    expect(cookie).toContain(`${ADMIN_CHAT_SESSION_COOKIE}=`)
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("SameSite=strict")
    expect(cookie).toContain("Path=/api/admin-chat")
  })

  it.each([
    ["start", (req: Request) => startSession(req), "/api/admin-chat/start", JSON.stringify({ studentName: "Student" }), undefined],
    ["poll", (req: Request) => pollSession(req), "/api/admin-chat/poll", undefined, SESSION_ID],
    ["send", (req: Request) => sendMessage(req), "/api/admin-chat/send", JSON.stringify({ message: "hello" }), SESSION_ID],
    ["end", (req: Request) => endSession(req), "/api/admin-chat/end", JSON.stringify({ reason: "ended_by_user" }), SESSION_ID],
  ])("allows matching-origin browser requests for %s", async (_name, handler, path, body, sessionId) => {
    const response = await handler(request(path, {
      method: body ? "POST" : "GET",
      body,
      headers: {
        Origin: "https://techvyro.example",
        "Sec-Fetch-Site": "same-origin",
      },
    }, sessionId))
    expect(response.status).not.toBe(403)
  })

  it.each([
    ["start", (req: Request) => startSession(req), "/api/admin-chat/start", JSON.stringify({ studentName: "Student" })],
    ["poll", (req: Request) => pollSession(req), "/api/admin-chat/poll", undefined],
    ["send", (req: Request) => sendMessage(req), "/api/admin-chat/send", JSON.stringify({ message: "hello" })],
    ["end", (req: Request) => endSession(req), "/api/admin-chat/end", JSON.stringify({ reason: "ended_by_user" })],
  ])("rejects mismatched Origin for %s before cookie authorization", async (_name, handler, path, body) => {
    const response = await handler(request(path, {
      method: body ? "POST" : "GET",
      body,
      headers: { Origin: "https://attacker.example" },
    }, SESSION_ID))
    expect(response.status).toBe(403)
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it.each([
    ["start", (req: Request) => startSession(req), "/api/admin-chat/start", JSON.stringify({ studentName: "Student" })],
    ["poll", (req: Request) => pollSession(req), "/api/admin-chat/poll", undefined],
    ["send", (req: Request) => sendMessage(req), "/api/admin-chat/send", JSON.stringify({ message: "hello" })],
    ["end", (req: Request) => endSession(req), "/api/admin-chat/end", JSON.stringify({ reason: "ended_by_user" })],
  ])("rejects cross-site and same-site fetch metadata for %s", async (_name, handler, path, body) => {
    for (const fetchSite of ["cross-site", "same-site"]) {
      const response = await handler(request(path, {
        method: body ? "POST" : "GET",
        body,
        headers: { "Sec-Fetch-Site": fetchSite },
      }, SESSION_ID))
      expect(response.status).toBe(403)
    }
  })

  it("fails closed when session signing is unavailable", async () => {
    delete process.env.SESSION_SECRET
    const response = await pollSession(request("/api/admin-chat/poll"))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: "Admin chat session security is not configured",
    })
    process.env.SESSION_SECRET = "admin-chat-route-test-secret"
  })

  it.each([
    ["poll", (req: Request) => pollSession(req), "/api/admin-chat/poll", undefined],
    ["send", (req: Request) => sendMessage(req), "/api/admin-chat/send", JSON.stringify({ message: "hello" })],
    ["end", (req: Request) => endSession(req), "/api/admin-chat/end", JSON.stringify({ reason: "ended_by_user" })],
  ])("rejects a missing or tampered cookie for %s", async (_name, handler, path, body) => {
    const missing = await handler(request(path, { method: body ? "POST" : "GET", body }))
    expect(missing.status).toBe(401)

    const valid = createAdminChatSessionCookieValue(SESSION_ID)
    const tampered = await handler(request(path, {
      method: body ? "POST" : "GET",
      body,
      headers: { cookie: `${ADMIN_CHAT_SESSION_COOKIE}=${valid}x` },
    }))
    expect(tampered.status).toBe(401)
  })

  it.each([
    ["poll", (req: Request) => pollSession(req), "/api/admin-chat/poll", undefined],
    ["send", (req: Request) => sendMessage(req), "/api/admin-chat/send", JSON.stringify({ sessionId: SESSION_ID, message: "hello" })],
    ["end", (req: Request) => endSession(req), "/api/admin-chat/end", JSON.stringify({ sessionId: SESSION_ID, reason: "ended_by_user" })],
  ])("does not let another session cookie %s the requested session", async (_name, handler, path, body) => {
    const response = await handler(request(
      body ? path : `${path}?sessionId=${SESSION_ID}`,
      { method: body ? "POST" : "GET", body },
      OTHER_SESSION_ID
    ))
    expect(response.status).toBe(404)
    expect(session).not.toBeNull()
    expect(messagesDeleted).toBe(false)
  })

  it("rejects invalid messages after authenticating the cookie", async () => {
    const response = await sendMessage(request("/api/admin-chat/send", {
      method: "POST",
      body: JSON.stringify({ message: "" }),
    }, SESSION_ID))
    expect(response.status).toBe(400)
  })

  it("rejects expired sessions for send and poll", async () => {
    session!.created_at = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()

    const sendResponse = await sendMessage(request("/api/admin-chat/send", {
      method: "POST",
      body: JSON.stringify({ message: "hello" }),
    }, SESSION_ID))
    expect(sendResponse.status).toBe(410)

    const pollResponse = await pollSession(request("/api/admin-chat/poll", undefined, SESSION_ID))
    expect(pollResponse.status).toBe(410)
  })

  it("ends by deleting the current-schema capability and rejects later use", async () => {
    const endResponse = await endSession(request("/api/admin-chat/end", {
      method: "POST",
      body: JSON.stringify({ reason: "ended_by_user" }),
    }, SESSION_ID))
    expect(endResponse.status).toBe(200)
    expect(endResponse.headers.get("set-cookie")).toContain("Max-Age=0")
    expect(messagesDeleted).toBe(true)
    expect(session).toBeNull()

    const pollResponse = await pollSession(request("/api/admin-chat/poll", undefined, SESSION_ID))
    expect(pollResponse.status).toBe(404)
  })

  it("keeps session IDs out of client poll URLs and send/end bodies", () => {
    const source = readFileSync("components/chatbot.tsx", "utf8")
    const adminChatSource = source.slice(source.indexOf("function AdminLiveChat"))
    expect(adminChatSource).not.toMatch(/admin-chat\/poll\?sessionId/)
    expect(adminChatSource).not.toMatch(/JSON\.stringify\(\{\s*sessionId/)
    expect(adminChatSource).not.toMatch(/JSON\.stringify\(\{[^}]*studentName[^}]*reason/)
  })
})