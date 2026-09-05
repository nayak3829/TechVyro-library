import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("homepage rendering performance contracts", () => {
  const page = readFileSync("app/page.tsx", "utf8")
  const styles = readFileSync("app/globals.css", "utf8")
  const loader = readFileSync("components/ui/page-loader.tsx", "utf8")
  const routeFallback = readFileSync("app/loading.tsx", "utf8")

  it("keeps the route fallback lightweight and CSS animated", () => {
    expect(loader).not.toContain("framer-motion")
    expect(loader).not.toContain("useReducedMotion")
    expect(loader).toContain("page-loader-spin")
    expect(loader).toContain('aria-busy="true"')
    expect(routeFallback).not.toContain('"use client"')
    expect(styles).toContain("@keyframes page-loader-spin")
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)")
  })

  it("applies rendering containment without removing homepage sections", () => {
    expect(styles).toContain("content-visibility: auto")
    expect(styles).toContain("contain-intrinsic-size: auto 800px")
    expect(styles).toContain("contain-intrinsic-size: auto 1600px")
    expect(page.match(/home-below-fold/g)?.length).toBe(10)

    for (const section of [
      "RecentlyViewedSection",
      "SubjectsSection",
      "CategoriesSection",
      "QuizSection",
      "TestSeriesSection",
      "FeaturedSection",
      "PDFGrid",
      "StatsSection",
      "TestimonialsSection",
      "hp.ctaTitle",
    ]) {
      expect(page).toContain(section)
    }
  })
})