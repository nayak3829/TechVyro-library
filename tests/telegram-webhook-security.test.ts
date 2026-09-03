import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET as getWebhookStatus, POST as setupWebhook } from "@/app/api/telegram/setup/route"
import { POST as receiveWebhook } from "@/app/api/telegram-webhook/route"
import { createAdminToken } from "@/lib/admin-auth"
import { deriveTelegramWebhookSecret } from "@/lib/telegram-webhook-auth"

const originalEnvironment = {
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  SESSION_SECRET: process.env.SESSION_SECRET,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
}

function restoreEnvironment() {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

describe("Telegram webhook deployment security", () => {
  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "admin-test-password"
    process.env.SESSION_SECRET = "server-only-session-secret"
    process.env.TELEGRAM_BOT_TOKEN = "123456:test-bot-token"
    process.env.NEXT_PUBLIC_SITE_URL = "https://techvyro.example/"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    restoreEnvironment()
  })

  it("registers the UUID admin-chat handler with both update types and a derived secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      description: "Webhook was set",
    }), {
      headers: { "Content-Type": "application/json" },
    }))
    vi.stubGlobal("fetch", fetchMock)

    const adminToken = createAdminToken(process.env.ADMIN_PASSWORD!)
    const response = await setupWebhook(new Request("https://techvyro.example/api/telegram/setup", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    }))

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const registration = JSON.parse(String(init.body))
    const expectedSecret = deriveTelegramWebhookSecret()

    expect(url).toBe("https://api.telegram.org/bot123456:test-bot-token/setWebhook")
    expect(registration).toMatchObject({
      url: "https://techvyro.example/api/telegram-webhook",
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    })
    expect(registration.secret_token).toBe(expectedSecret)
    expect(registration.secret_token).toMatch(/^[A-Za-z0-9_-]{1,256}$/)

    const responseBody = await response.json()
    expect(responseBody.webhookUrl).toBe("https://techvyro.example/api/telegram-webhook")
    expect(JSON.stringify(responseBody)).not.toContain(registration.secret_token)
  })

  it("fails setup before contacting Telegram when SESSION_SECRET is unavailable", async () => {
    delete process.env.SESSION_SECRET
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const adminToken = createAdminToken(process.env.ADMIN_PASSWORD!)
    const response = await setupWebhook(new Request("https://techvyro.example/api/telegram/setup", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      error: "SESSION_SECRET is not configured; secure Telegram webhook setup cannot continue",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    "http://techvyro.example",
    "https://user:pass@techvyro.example",
    "https://techvyro.example/subpath",
    "not-a-url",
  ])("rejects an unsafe webhook base URL before contacting Telegram: %s", async siteUrl => {
    process.env.NEXT_PUBLIC_SITE_URL = siteUrl
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    const adminToken = createAdminToken(process.env.ADMIN_PASSWORD!)
    const response = await setupWebhook(new Request("https://techvyro.example/api/telegram/setup", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    }))

    expect(response.status).toBe(500)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("does not report a healthy bot when Telegram rejects status checks", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      description: "Unauthorized",
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })))

    const adminToken = createAdminToken(process.env.ADMIN_PASSWORD!)
    const response = await getWebhookStatus(new Request("https://techvyro.example/api/telegram/setup", {
      headers: { Authorization: `Bearer ${adminToken}` },
    }))

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({ ok: false })
  })

  it.each([
    ["missing", undefined],
    ["invalid", "not-the-registered-secret"],
  ])("rejects a %s Telegram secret header before processing the payload", async (_label, secret) => {
    const headers = new Headers({ "Content-Type": "application/json" })
    if (secret) headers.set("X-Telegram-Bot-Api-Secret-Token", secret)

    const response = await receiveWebhook(new Request(
      "https://techvyro.example/api/telegram-webhook",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ message: { text: "/sessions" } }),
      }
    ))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })
})