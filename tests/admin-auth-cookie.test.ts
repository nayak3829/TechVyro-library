import { afterEach, describe, expect, it, vi } from "vitest"
import { POST as login } from "@/app/api/admin/login/route"
import { POST as verify } from "@/app/api/admin/verify/route"
import { POST as logout } from "@/app/api/admin/logout/route"
import {
  ADMIN_SESSION_COOKIE,
  createAdminToken,
  extractToken,
  getVerifiedAdminReviewerPrincipal,
} from "@/lib/admin-auth"

const originalPassword = process.env.ADMIN_PASSWORD
afterEach(() => {
  if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD
  else process.env.ADMIN_PASSWORD = originalPassword
  vi.unstubAllEnvs()
})

describe("admin HttpOnly sessions", () => {
  it("sets a strict HttpOnly session cookie on successful login without returning a token", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    vi.stubEnv("NODE_ENV", "production")

    const response = await login(new Request("https://example.test/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.10" },
      body: JSON.stringify({ password: "test-password" }),
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    const cookie = response.headers.get("set-cookie") || ""
    expect(cookie).toContain(`${ADMIN_SESSION_COOKIE}=`)
    expect(cookie).toContain("Path=/")
    expect(cookie).toContain("Max-Age=86400")
    expect(cookie).toContain("HttpOnly")
    expect(cookie).toContain("Secure")
    expect(cookie.toLowerCase()).toContain("samesite=strict")
  })

  it("does not set a session cookie for failed login", async () => {
    process.env.ADMIN_PASSWORD = "test-password"

    const response = await login(new Request("https://example.test/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "198.51.100.11" },
      body: JSON.stringify({ password: "wrong-password" }),
    }))

    expect(response.status).toBe(401)
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("uses the session cookie for verification and protected token extraction", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")
    const request = new Request("https://example.test/api/admin/verify", {
      method: "POST",
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
    })

    expect(extractToken(request)).toBe(token)
    await expect(verify(request).then((response) => response.json())).resolves.toEqual({ valid: true })
  })

  it("derives a non-secret, stable reviewer principal only from verified admin sessions", () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")

    const principal = getVerifiedAdminReviewerPrincipal(token)
    expect(principal).toMatch(/^admin-session:[a-f0-9]{24}$/)
    expect(getVerifiedAdminReviewerPrincipal(token)).toBe(principal)
    expect(principal).not.toContain(token)
    expect(principal).not.toContain(process.env.ADMIN_PASSWORD)
    expect(getVerifiedAdminReviewerPrincipal("forged-token")).toBeNull()
  })

  it("rejects bearer and body credentials during verification", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")

    const bearerRequest = new Request("https://example.test/api/admin/verify", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(extractToken(bearerRequest)).toBeNull()
    await expect(verify(bearerRequest).then(response => response.json())).resolves.toEqual({ valid: false })

    const bodyRequest = new Request("https://example.test/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    await expect(verify(bodyRequest).then(response => response.json())).resolves.toEqual({ valid: false })
  })

  it("rejects cookie credentials on provably cross-origin browser mutations", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")
    const cookie = `${ADMIN_SESSION_COOKIE}=${token}`

    const crossOrigin = new Request("https://example.test/api/admin/verify", {
      method: "POST",
      headers: { cookie, Origin: "https://attacker.test" },
    })
    expect(extractToken(crossOrigin)).toBeNull()
    await expect(verify(crossOrigin).then(response => response.json())).resolves.toEqual({ valid: false })

    for (const fetchSite of ["cross-site", "same-site"]) {
      const crossOriginFetch = new Request("https://example.test/api/admin/verify", {
        method: "POST",
        headers: { cookie, "Sec-Fetch-Site": fetchSite },
      })
      expect(extractToken(crossOriginFetch)).toBeNull()
    }

    const sameOrigin = new Request("https://example.test/api/admin/verify", {
      method: "POST",
      headers: { cookie, Origin: "https://example.test", "Sec-Fetch-Site": "same-origin" },
    })
    expect(extractToken(sameOrigin)).toBe(token)
    await expect(verify(sameOrigin).then(response => response.json())).resolves.toEqual({ valid: true })
  })

  it("preserves safe-method extraction behavior", () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")
    const request = new Request("https://example.test/api/admin/resource", {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
        Origin: "https://attacker.test",
        "Sec-Fetch-Site": "cross-site",
      },
    })

    expect(extractToken(request)).toBe(token)
  })

  it("always clears the session cookie and succeeds", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")

    const response = await logout(new Request("https://example.test/api/admin/logout", {
      method: "POST",
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toContain(`${ADMIN_SESSION_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970`)

    for (const cookie of [undefined, `${ADMIN_SESSION_COOKIE}=invalid`]) {
      const headers = cookie ? { cookie } : undefined
      const cleared = await logout(new Request("https://example.test/api/admin/logout", {
        method: "POST",
        headers,
      }))
      expect(cleared.status).toBe(200)
      await expect(cleared.json()).resolves.toEqual({ success: true })
      expect(cleared.headers.get("set-cookie")).toContain(`${ADMIN_SESSION_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970`)
    }
  })

  it("does not clear the session cookie for proven cross-origin logout requests", async () => {
    const headerCases: Array<Record<string, string>> = [
      { Origin: "https://attacker.test" },
      { "Sec-Fetch-Site": "cross-site" },
      { "Sec-Fetch-Site": "same-site" },
    ]
    for (const headers of headerCases) {
      const response = await logout(new Request("https://example.test/api/admin/logout", {
        method: "POST",
        headers,
      }))
      expect(response.status).toBe(403)
      expect(response.headers.get("set-cookie")).toBeNull()
    }
  })

  it("clears missing or invalid sessions from matching-origin logout requests", async () => {
    for (const cookie of [undefined, `${ADMIN_SESSION_COOKIE}=invalid`]) {
      const response = await logout(new Request("https://example.test/api/admin/logout", {
        method: "POST",
        headers: {
          Origin: "https://example.test",
          "Sec-Fetch-Site": "same-origin",
          ...(cookie ? { cookie } : {}),
        },
      }))
      expect(response.status).toBe(200)
      expect(response.headers.get("set-cookie")).toContain(`${ADMIN_SESSION_COOKIE}=`)
    }
  })

  it("uses canonical Host and trusted proxy authority for admin verification and logout", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")
    const cookie = `${ADMIN_SESSION_COOKIE}=${token}`

    const canonicalHostRequest = new Request("http://localhost:5000/api/admin/verify", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:5000",
        Origin: "http://127.0.0.1:5000",
        cookie,
      },
    })
    expect(extractToken(canonicalHostRequest)).toBe(token)

    const proxiedRequest = new Request("http://internal.service:5000/api/admin/verify", {
      method: "POST",
      headers: {
        Host: "internal.service:5000",
        Origin: "https://admin.example",
        "X-Forwarded-Host": "admin.example",
        "X-Forwarded-Proto": "https",
        cookie,
      },
    })
    expect(extractToken(proxiedRequest)).toBe(token)

    const logoutResponse = await logout(new Request("http://localhost:5000/api/admin/logout", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:5000",
        Origin: "http://127.0.0.1:5000",
        cookie: `${ADMIN_SESSION_COOKIE}=invalid`,
      },
    }))
    expect(logoutResponse.status).toBe(200)
    expect(logoutResponse.headers.get("set-cookie")).toContain(`${ADMIN_SESSION_COOKIE}=`)
  })
})