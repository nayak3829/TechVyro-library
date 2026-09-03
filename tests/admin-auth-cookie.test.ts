import { afterEach, describe, expect, it, vi } from "vitest"
import { POST as login } from "@/app/api/admin/login/route"
import { POST as verify } from "@/app/api/admin/verify/route"
import { POST as logout } from "@/app/api/admin/logout/route"
import {
  ADMIN_SESSION_COOKIE,
  createAdminToken,
  extractToken,
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

  it("clears the session only through an authenticated logout request", async () => {
    process.env.ADMIN_PASSWORD = "test-password"
    const token = createAdminToken("test-password")

    const response = await logout(new Request("https://example.test/api/admin/logout", {
      method: "POST",
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toContain(`${ADMIN_SESSION_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970`)

    const rejected = await logout(new Request("https://example.test/api/admin/logout", {
      method: "POST",
    }))
    expect(rejected.status).toBe(401)
    expect(rejected.headers.get("set-cookie")).toBeNull()
  })
})