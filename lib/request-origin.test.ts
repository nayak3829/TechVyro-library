import { describe, expect, it } from "vitest"
import { isRequestOriginAllowed } from "./request-origin"

function mutation(headers: Record<string, string>) {
  return new Request("http://localhost:5000/api/admin/logout", {
    method: "POST",
    headers,
  })
}

describe("request origin validation", () => {
  it("uses the canonical Host when Next request.url has another local hostname", () => {
    expect(isRequestOriginAllowed(mutation({
      Host: "127.0.0.1:5000",
      Origin: "http://127.0.0.1:5000",
    }))).toBe(true)
  })

  it("uses trusted forwarded host and protocol for proxied public origins", () => {
    expect(isRequestOriginAllowed(mutation({
      Host: "internal.service:5000",
      Origin: "https://app.example",
      "X-Forwarded-Host": "untrusted.invalid, app.example",
      "X-Forwarded-Proto": "http, https",
    }))).toBe(true)
  })

  it("does not trust an earlier client-supplied forwarded value", () => {
    expect(isRequestOriginAllowed(mutation({
      Host: "internal.service:5000",
      Origin: "https://untrusted.invalid",
      "X-Forwarded-Host": "untrusted.invalid, app.example",
      "X-Forwarded-Proto": "https",
    }))).toBe(false)
  })

  it("still rejects mismatched origins and hostile fetch metadata", () => {
    expect(isRequestOriginAllowed(mutation({
      Host: "127.0.0.1:5000",
      Origin: "https://attacker.example",
    }))).toBe(false)

    for (const fetchSite of ["same-site", "cross-site"]) {
      expect(isRequestOriginAllowed(mutation({
        Host: "127.0.0.1:5000",
        Origin: "http://127.0.0.1:5000",
        "Sec-Fetch-Site": fetchSite,
      }))).toBe(false)
    }
  })
})