import { beforeEach, describe, expect, it } from "vitest"
import { checkRateLimit, clientAddress, resetRateLimitsForTests } from "./ai-request-security"

describe("AI request security", () => {
  beforeEach(() => resetRateLimitsForTests())

  it("does not trust caller-controlled forwarding headers without a trusted proxy contract", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "spoofed-address, 203.0.113.10" },
    })

    expect(clientAddress(request)).toBe("anonymous")
  })

  it("blocks requests after the configured window limit", () => {
    expect(checkRateLimit("test", 2).allowed).toBe(true)
    expect(checkRateLimit("test", 2).allowed).toBe(true)
    expect(checkRateLimit("test", 2).allowed).toBe(false)
  })
})