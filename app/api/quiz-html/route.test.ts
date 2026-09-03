import { afterEach, describe, expect, it, vi } from "vitest"
import platformsData from "@/lib/appx-platforms.json"

vi.mock("dns/promises", () => {
  const lookup = vi.fn(async () => [{ address: "203.0.113.10", family: 4 }])
  return { default: { lookup }, lookup }
})

import {
  fetchWithTimeout,
  isTrustedQuizApiHostname,
} from "@/lib/quiz-remote-fetch"

describe("quiz HTML remote API restrictions", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("allows every HTTPS hostname in the approved platform configuration", () => {
    for (const { api } of platformsData) {
      const url = new URL(api)
      expect(url.protocol, api).toBe("https:")
      expect(isTrustedQuizApiHostname(url.hostname), api).toBe(true)
    }
  })

  it.each([
    "classx.co.in",
    "arbitrary-unlisted-tenant.classx.co.in",
    "arbitrary-unlisted-tenant.appx.co.in",
    "arbitrary-unlisted-tenant.teachx.in",
    "evil.parmaracademyapi.classx.co.in",
    "evilclassx.co.in",
    "tenant.classx.co.in.evil.example",
    "appx.co.in.attacker.test",
    "other.cloudfront.net",
    "other.akamai.net.in",
  ])("rejects the untrusted or lookalike host %s", (hostname) => {
    expect(isTrustedQuizApiHostname(hostname)).toBe(false)
  })

  it.each([
    "https://127.0.0.1/api",
    "https://[::1]/api",
    "https://localhost/api",
    "https://user:password@parmaracademyapi.classx.co.in/api",
    "https://parmaracademyapi.classx.co.in:8443/api",
  ])("rejects unsafe URL %s before fetching", async (url) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    await expect(fetchWithTimeout(url)).rejects.toThrow()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rejects a redirect outside the allowlist without following it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://arbitrary-unlisted-tenant.classx.co.in/internal" },
      })
    )

    await expect(
      fetchWithTimeout("https://parmaracademyapi.classx.co.in/api")
    ).rejects.toThrow("API host is not an approved quiz platform")
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ redirect: "manual" })
    )
  })
})