import { beforeEach, describe, expect, it, vi } from "vitest"

const sendTelegramMessage = vi.fn()

vi.mock("@/lib/telegram", () => ({ sendTelegramMessage }))

describe("contact-admin route", () => {
  beforeEach(() => {
    sendTelegramMessage.mockReset()
    sendTelegramMessage.mockResolvedValue(42)
  })

  it("escapes caller-controlled Telegram HTML", async () => {
    const { POST } = await import("./route")
    const response = await POST(new Request("https://techvyro.example/api/contact-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "<Admin>", message: "Use <b>my link</b> & reply" }),
    }))

    expect(response.status).toBe(200)
    expect(sendTelegramMessage).toHaveBeenCalledWith(expect.stringContaining("&lt;Admin&gt;"))
    expect(sendTelegramMessage).toHaveBeenCalledWith(expect.stringContaining("Use &lt;b&gt;my link&lt;/b&gt; &amp; reply"))
  })

  it("rejects oversized request bodies before Telegram delivery", async () => {
    const { POST } = await import("./route")
    const response = await POST(new Request("https://techvyro.example/api/contact-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Student", message: "x".repeat(5_000) }),
    }))

    expect(response.status).toBe(413)
    expect(sendTelegramMessage).not.toHaveBeenCalled()
  })

  it("fails explicitly when Telegram delivery is unavailable", async () => {
    sendTelegramMessage.mockResolvedValue(null)
    const { POST } = await import("./route")
    const response = await POST(new Request("https://techvyro.example/api/contact-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Student", message: "Please contact me" }),
    }))

    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: "Admin messaging is temporarily unavailable" })
  })
})