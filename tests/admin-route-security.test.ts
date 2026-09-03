import { afterEach, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { createAdminToken } from "@/lib/admin-auth"
import { GET as telegramTest } from "@/app/api/admin/test-telegram/route"
import { GET as quizHtml } from "@/app/api/quiz-html/route"
import { PUT as updateFolders } from "@/app/api/folders/route"
import { POST as generateSummary } from "@/app/api/ai/generate-summary/route"
import { POST as createCategory } from "@/app/api/categories/route"
import { PATCH as updateCategory } from "@/app/api/categories/[id]/route"

const originalPassword = process.env.ADMIN_PASSWORD
const originalOpenAiKey = process.env.OPENAI_API_KEY
const originalTelegramEnvironment = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  telegram_bot_token: process.env.telegram_bot_token,
  TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
  BOT_TOKEN: process.env.BOT_TOKEN,
}

afterEach(() => {
  if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = originalPassword
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalOpenAiKey
  for (const [key, value] of Object.entries(originalTelegramEnvironment)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe("admin route security", () => {
  it("rejects an unauthenticated Telegram diagnostic request before exposing diagnostics", async () => {
    process.env.ADMIN_PASSWORD = "test-password"

    const response = await telegramTest(new Request("https://example.test/api/admin/test-telegram"))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({ error: "Unauthorized" })
  })

  it("accepts only a valid shared admin token for the Telegram diagnostic", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")

    // A configured token is intentionally not provided: a valid request reaches
    // configuration handling rather than failing authentication.
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.telegram_bot_token
    delete process.env.TELEGRAM_TOKEN
    delete process.env.BOT_TOKEN
    const response = await telegramTest(new Request("https://example.test/api/admin/test-telegram", {
      headers: { Authorization: `Bearer ${token}` },
    }))

    expect(response.status).not.toBe(401)
  })

  it("allows a cookie-authenticated request to reach a protected settings handler", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")

    const authenticated = await updateFolders(new Request("https://example.test/api/folders", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        cookie: `admin_session=${token}`,
      },
      body: JSON.stringify({ folders: "not-an-array" }),
    }))
    expect(authenticated.status).toBe(400)
    await expect(authenticated.json()).resolves.toEqual({ error: "folders must be an array" })

    const unauthenticated = await updateFolders(new Request("https://example.test/api/folders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folders: "not-an-array" }),
    }))
    expect(unauthenticated.status).toBe(401)
  })

  it("allows a cookie-authenticated request to reach a protected AI handler", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    delete process.env.OPENAI_API_KEY
    const token = createAdminToken("test-password")

    const authenticated = await generateSummary(new Request("https://example.test/api/ai/generate-summary", {
      method: "POST",
      headers: { cookie: `admin_session=${token}` },
    }))
    expect(authenticated.status).toBe(503)
    await expect(authenticated.json()).resolves.toEqual({ error: "OpenAI API key not configured" })

    const unauthenticated = await generateSummary(new Request("https://example.test/api/ai/generate-summary", {
      method: "POST",
    }))
    expect(unauthenticated.status).toBe(401)
  })

  it("validates category input before writing with the service-role client", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")
    const cookie = `admin_session=${token}`

    const invalidName = await createCategory(new Request("https://example.test/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "   ", color: "#3B82F6" }),
    }))
    expect(invalidName.status).toBe(400)

    const invalidColor = await createCategory(new Request("https://example.test/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "Study Notes", color: "blue" }),
    }))
    expect(invalidColor.status).toBe(400)

    const invalidId = await updateCategory(new Request("https://example.test/api/categories/not-a-uuid", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", cookie },
      body: JSON.stringify({ name: "Updated" }),
    }), { params: Promise.resolve({ id: "not-a-uuid" }) })
    expect(invalidId.status).toBe(400)
  })

  it("rejects anonymous quiz HTML requests before inspecting the remote URL", async () => {
    const response = await quizHtml(new NextRequest(
      "https://example.test/api/quiz-html?testId=1&apiBase=https%3A%2F%2F127.0.0.1"
    ))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })
})