import { afterEach, describe, expect, it } from "vitest"
import { NextRequest } from "next/server"

import { getPublicOrigin } from "@/app/auth/callback/route"
import { CANONICAL_SITE_ORIGIN } from "@/lib/public-site"

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
})

describe("authentication callback origin", () => {
  it("keeps the canonical Vercel origin even when a stale Replit site URL is configured", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://techvyro-library.replit.app"
    const request = new NextRequest(`${CANONICAL_SITE_ORIGIN}/auth/callback?code=test-code`)

    expect(getPublicOrigin(request)).toBe(CANONICAL_SITE_ORIGIN)
  })
})