import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  ADMIN_CHAT_ABSOLUTE_LIFETIME_MS,
  ADMIN_CHAT_IDLE_TIMEOUT_MS,
  checkAdminChatRateLimit,
  clearAdminChatRateLimitsForTests,
  createAdminChatSessionCookieValue,
  getAdminChatSessionId,
  getAdminChatSessionState,
} from "./admin-chat-security"

describe("admin chat abuse and expiry controls", () => {
  const redisEnvironment = {
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
    sessionSecret: process.env.SESSION_SECRET,
  }

  beforeAll(() => {
    delete process.env.KV_REST_API_URL
    delete process.env.KV_REST_API_TOKEN
    process.env.SESSION_SECRET = "admin-chat-security-test-secret"
  })

  afterAll(() => {
    if (redisEnvironment.url === undefined) delete process.env.KV_REST_API_URL
    else process.env.KV_REST_API_URL = redisEnvironment.url
    if (redisEnvironment.token === undefined) delete process.env.KV_REST_API_TOKEN
    else process.env.KV_REST_API_TOKEN = redisEnvironment.token
    if (redisEnvironment.sessionSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = redisEnvironment.sessionSecret
  })

  beforeEach(() => clearAdminChatRateLimitsForTests())

  it("authenticates only the UUID covered by the session signature", () => {
    const sessionId = "8f44eb32-397c-4ff2-8ba0-c2d8d4a06122"
    const otherId = "f02ac495-c9b2-4278-8c56-9b59ee98cd7f"
    const signed = createAdminChatSessionCookieValue(sessionId)
    expect(getAdminChatSessionId(new Request("https://techvyro.example/api/admin-chat/poll", {
      headers: { cookie: `admin_chat_session=${signed}` },
    }))).toBe(sessionId)
    expect(getAdminChatSessionId(new Request("https://techvyro.example/api/admin-chat/poll", {
      headers: { cookie: `admin_chat_session=${otherId}.${signed.split(".")[1]}` },
    }))).toBeNull()
  })

  it("enforces both idle and non-renewable absolute expiry", () => {
    const now = Date.now()
    expect(getAdminChatSessionState({
      created_at: new Date(now - 1_000).toISOString(),
      last_message_at: new Date(now - 1_000).toISOString(),
    }, now)).toBe("active")
    expect(getAdminChatSessionState({
      created_at: new Date(now - ADMIN_CHAT_IDLE_TIMEOUT_MS - 1).toISOString(),
      last_message_at: null,
    }, now)).toBe("expired")
    expect(getAdminChatSessionState({
      created_at: new Date(now - ADMIN_CHAT_ABSOLUTE_LIFETIME_MS - 1).toISOString(),
      last_message_at: new Date(now).toISOString(),
    }, now)).toBe("expired")
    expect(getAdminChatSessionState({ created_at: null }, now)).toBe("expired")
  })

  it("rate limits repeated starts by request characteristics", async () => {
    const req = new Request("https://techvyro.example/api/admin-chat/start", {
      headers: { "x-real-ip": "203.0.113.20", "user-agent": "abuse-test" },
    })
    const results = []
    for (let index = 0; index < 6; index += 1) {
      results.push(await checkAdminChatRateLimit("start", req))
    }
    expect(results.slice(0, 5).every(result => result.allowed)).toBe(true)
    expect(results[5].allowed).toBe(false)
    expect(results[5].retryAfterSeconds).toBeGreaterThan(0)
  })

  it("rate limits polling per client and session", async () => {
    const req = new Request("https://techvyro.example/api/admin-chat/poll", {
      headers: { "x-real-ip": "203.0.113.30", "user-agent": "poll-test" },
    })
    let result = { allowed: true, retryAfterSeconds: 0 }
    for (let index = 0; index < 31; index += 1) {
      result = await checkAdminChatRateLimit("poll", req, "session-a")
    }
    expect(result.allowed).toBe(false)
  })
})