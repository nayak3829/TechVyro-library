import { afterEach, describe, expect, it, vi } from "vitest"

import { createAdminToken } from "@/lib/admin-auth"
import { POST as generateQuiz } from "./generate-quiz/route"
import { POST as generateSummary } from "./generate-summary/route"

const originalKey = process.env.OPENAI_API_KEY
const originalPassword = process.env.ADMIN_PASSWORD

function adminCookie() {
  process.env.ADMIN_PASSWORD = "ai-security-test-password"
  return `admin_session=${createAdminToken("ai-security-test-password")}`
}

function request(body: unknown) {
  return new Request("https://example.test/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: adminCookie() },
    body: JSON.stringify(body),
  })
}

describe("admin AI generation request limits", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = originalKey
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD
    else process.env.ADMIN_PASSWORD = originalPassword
  })

  it("rejects an oversized quiz count before contacting OpenAI", async () => {
    process.env.OPENAI_API_KEY = "test-key"
    const fetchMock = vi.spyOn(globalThis, "fetch")

    const response = await generateQuiz(request({ topic: "Physics", count: 21 }))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects oversized summary text before contacting OpenAI", async () => {
    process.env.OPENAI_API_KEY = "test-key"
    const fetchMock = vi.spyOn(globalThis, "fetch")

    const response = await generateSummary(request({
      title: "Biology",
      description: "x".repeat(4_001),
    }))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})