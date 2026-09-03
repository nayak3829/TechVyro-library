import { describe, expect, it, vi } from "vitest"
import { sendTelegramRequest } from "./telegram"

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

describe("Telegram transport retries", () => {
  it("honors rate limits before succeeding", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response(429, { ok: false, parameters: { retry_after: 2 } }))
      .mockResolvedValueOnce(response(200, { ok: true, result: { message_id: 42 } }))
    const sleep = vi.fn(async () => {})

    await expect(sendTelegramRequest("token", "chat", "message", {}, fetcher, sleep)).resolves.toBe(42)
    expect(sleep).toHaveBeenCalledWith(2_000)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it("does not retry permanent client errors", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(400, { ok: false }))
    const sleep = vi.fn(async () => {})

    await expect(sendTelegramRequest("token", "chat", "message", {}, fetcher, sleep)).resolves.toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })
})