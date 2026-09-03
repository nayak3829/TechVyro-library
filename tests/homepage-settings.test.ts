import { describe, expect, it } from "vitest"
import {
  DEFAULT_HERO_SETTINGS,
  DEFAULT_HOMEPAGE_SETTINGS,
  isSafeHttpUrl,
  normalizeHeroSettings,
  normalizeHomepageSettings,
} from "@/lib/homepage-settings"

describe("homepage settings normalization", () => {
  it.each([
    ["https://example.com", true],
    ["http://example.com", true],
    ["javascript:alert(1)", false],
    ["data:text/html,bad", false],
    ["//example.com", false],
    ["not a url", false],
    ["", true],
  ])("validates public URL %s", (value, expected) => {
    expect(isSafeHttpUrl(value)).toBe(expected)
  })

  it("requires HTTPS for remote images", () => {
    expect(isSafeHttpUrl("https://example.com/a.png", true)).toBe(true)
    expect(isSafeHttpUrl("http://example.com/a.png", true)).toBe(false)
  })

  it("bounds hero lists and returns independent default arrays", () => {
    const first = normalizeHeroSettings(null)
    const second = normalizeHeroSettings(null)
    first.taglines.push("mutation")
    expect(second.taglines).toEqual(DEFAULT_HERO_SETTINGS.taglines)

    const normalized = normalizeHeroSettings({
      taglines: Array.from({ length: 25 }, (_, index) => ` Tagline ${index} `),
      trustStats: [null, " Valid "],
      description: "x".repeat(2500),
    })
    expect(normalized.taglines).toHaveLength(20)
    expect(normalized.trustStats).toEqual(["Valid"])
    expect(normalized.description).toHaveLength(2000)
  })

  it("falls back per homepage field without spreading malformed values", () => {
    expect(normalizeHomepageSettings({
      libraryTitle: 123,
      ctaTitle: " Custom title ",
      ctaDescription: "",
    })).toMatchObject({
      libraryTitle: DEFAULT_HOMEPAGE_SETTINGS.libraryTitle,
      ctaTitle: "Custom title",
      ctaDescription: DEFAULT_HOMEPAGE_SETTINGS.ctaDescription,
    })
  })
})