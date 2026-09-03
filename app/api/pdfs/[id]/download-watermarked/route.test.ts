import { describe, expect, it } from "vitest"
import { getWatermarkSettings } from "@/lib/watermark-settings"

describe("watermark settings", () => {
  it("uses saved watermark controls and clamps unsafe values", () => {
    expect(getWatermarkSettings({
      watermarkEnabled: false,
      watermarkText: "  My Library  ",
      watermarkOpacity: 500,
      watermarkPosition: "footer",
      siteName: "  My Site  ",
    })).toEqual({
      enabled: false,
      text: "My Library",
      opacity: 0.8,
      position: "footer",
      siteName: "My Site",
    })
  })

  it("falls back safely for malformed legacy settings", () => {
    expect(getWatermarkSettings({
      watermarkText: "",
      watermarkOpacity: "high",
      watermarkPosition: "outside",
    })).toMatchObject({
      enabled: true,
      text: "TechVyro PDF Library",
      opacity: 0.3,
      position: "diagonal",
      siteName: "TechVyro",
    })
  })
})