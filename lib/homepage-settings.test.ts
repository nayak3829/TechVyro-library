import { describe, expect, it } from "vitest"
import { DEFAULT_HERO_SETTINGS, normalizeHeroSettings } from "./homepage-settings"

describe("normalizeHeroSettings", () => {
  it("keeps the schema consumed by the public hero", () => {
    expect(normalizeHeroSettings({
      taglines: [" First ", "", 42],
      trustStats: ["Truthful label"],
      badgeText: " Badge ",
      description: "Description",
      heroBtnText: "Browse",
      whatsappBtnText: "Updates",
      title: "legacy field",
    })).toEqual({
      taglines: ["First"],
      trustStats: ["Truthful label"],
      badgeText: "Badge",
      description: "Description",
      heroBtnText: "Browse",
      whatsappBtnText: "Updates",
    })
  })

  it("uses safe defaults for malformed values", () => {
    expect(normalizeHeroSettings(null)).toEqual(DEFAULT_HERO_SETTINGS)
    expect(normalizeHeroSettings({ badgeText: "", taglines: "not a list" })).toEqual(DEFAULT_HERO_SETTINGS)
  })
})