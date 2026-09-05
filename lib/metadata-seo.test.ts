import { afterEach, describe, expect, it } from "vitest"
import robots from "@/app/robots"
import manifest from "@/app/manifest"
import { publicPdfMetadata } from "@/lib/pdf-seo"
import { isPrivateIndexRoute, PUBLIC_SITEMAP_PATHS } from "@/lib/seo-routes"
import { canonicalUrl, getCanonicalOrigin } from "@/lib/site-url"

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
})

describe("canonical metadata origin", () => {
  it("uses only a validated HTTPS origin override", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.edu/"
    expect(getCanonicalOrigin()).toBe("https://example.edu")
    expect(canonicalUrl("/about")).toBe("https://example.edu/about")

    process.env.NEXT_PUBLIC_SITE_URL = "http://attacker.test/path"
    expect(getCanonicalOrigin()).toBe("https://www.techvyro.in")
  })
})

describe("metadata routes", () => {
  it("publishes a valid manifest using local icons", () => {
    const value = manifest()
    expect(value.start_url).toBe("/")
    expect(value.icons?.every(icon => icon.src.startsWith("/"))).toBe(true)
  })

  it("keeps robots and private route noindex policy aligned", () => {
    const value = robots()
    const rule = Array.isArray(value.rules) ? value.rules[0] : value.rules
    expect(rule.disallow).toContain("/login")
    expect(rule.disallow).toContain("/quiz/")
    expect(value.sitemap).toBe("https://www.techvyro.in/sitemap.xml")

    for (const path of [
      "/admin",
      "/login",
      "/reset-password",
      "/profile",
      "/library",
      "/notifications",
      "/progress",
      "/submit",
      "/quiz/private-id",
      "/quiz/private-id/play",
      "/test-series/play",
    ]) {
      expect(isPrivateIndexRoute(path), path).toBe(true)
    }
    expect(isPrivateIndexRoute("/quiz")).toBe(false)
    expect(isPrivateIndexRoute("/quiz/leaderboard")).toBe(false)
  })

  it("keeps private answer and authentication routes out of sitemap", () => {
    expect(PUBLIC_SITEMAP_PATHS).not.toContain("/login")
    expect(PUBLIC_SITEMAP_PATHS.every(path => !path.startsWith("/quiz/"))).toBe(true)
  })

  it("uses only trusted internal PDF thumbnail URLs", () => {
    const trusted = publicPdfMetadata({ id: "pdf_123", title: "Revision Notes" })
    expect(trusted.alternates?.canonical).toBe("/pdf/pdf_123")
    expect(trusted.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/api/pdfs/pdf_123/thumbnail" }),
    ])

    const unsafe = publicPdfMetadata({ id: "https://attacker.test/x", title: "Notes" })
    expect(unsafe.alternates).toBeUndefined()
    expect(unsafe.twitter?.images).toEqual(["/og-image.jpg"])
  })
})