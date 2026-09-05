import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("root layout performance contracts", () => {
  const layout = readFileSync("app/layout.tsx", "utf8")
  const hero = readFileSync("components/home/hero-section.tsx", "utf8")

  it("keeps the primary headline stable and server-renderable", () => {
    expect(hero).toContain("<h1")
    expect(hero).toContain("Welcome to TechVyro Library")
    expect(hero).not.toContain('"use client"')
    expect(hero).not.toContain("setInterval")
    expect(hero).not.toContain("headlineVisible")
    expect(hero).not.toMatch(/<div className="max-w-3xl[^"]*desk-enter/)
  })

  it("does not globally load AdSense or cover useful content with the initial loader", () => {
    expect(layout).not.toContain("pagead2.googlesyndication.com")
    expect(layout).not.toContain("adsbygoogle")
    expect(layout).not.toContain("InitialSiteLoader")
  })

  it("loads deployment-specific and interaction-only clients conditionally", () => {
    expect(layout).toContain("process.env.VERCEL ? <Analytics /> : null")
    expect(layout).toContain('dynamic(() => import("@/components/whatsapp-popup")')
    expect(layout).not.toContain('import { WhatsAppPopup } from "@/components/whatsapp-popup"')
  })
})