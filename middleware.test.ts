import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const state = vi.hoisted(() => ({
  error: null as unknown,
  user: null as { id: string } | null,
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => {
        if (state.error) throw state.error
        return { data: { user: state.user } }
      },
    },
  }),
}))

import { middleware } from "./middleware"

describe("auth middleware", () => {
  beforeEach(() => {
    state.error = null
    state.user = null
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
  })

  it("expires stale Supabase auth cookies and redirects protected pages", async () => {
    state.error = Object.assign(new Error("Invalid Refresh Token: Refresh Token Not Found"), {
      code: "refresh_token_not_found",
    })
    const request = new NextRequest("https://example.test/profile", {
      headers: { cookie: "sb-example-auth-token=stale; unrelated=keep" },
    })

    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain("/login?redirect=%2Fprofile")
    const cookies = response.headers.get("set-cookie") || ""
    expect(cookies).toContain("sb-example-auth-token=")
    expect(cookies).toContain("Max-Age=0")
    expect(cookies).not.toContain("unrelated=")
  })

  it.each([
    "/quiz/algebra-1?mode=timed",
    "/test-series/play?testId=live-1&apiBase=sample%3Assc",
  ])("redirects an unauthenticated test start and preserves its full path", async (path) => {
    const response = await middleware(new NextRequest(`https://example.test${path}`))

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toContain(
      `/login?redirect=${encodeURIComponent(path)}`,
    )
  })

  it.each(["/quiz", "/quiz/leaderboard", "/test-series", "/test-series/series?slug=free"])(
    "keeps browse route %s public",
    async (path) => {
      const response = await middleware(new NextRequest(`https://example.test${path}`))

      expect(response.status).toBe(200)
    },
  )
})