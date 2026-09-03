export type WatermarkPosition = "diagonal" | "center" | "header" | "footer"

export function getWatermarkSettings(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const position = ["diagonal", "center", "header", "footer"].includes(String(source.watermarkPosition))
    ? source.watermarkPosition as WatermarkPosition
    : "diagonal"
  return {
    enabled: source.watermarkEnabled !== false,
    text: typeof source.watermarkText === "string" && source.watermarkText.trim()
      ? source.watermarkText.trim().slice(0, 200)
      : "TechVyro PDF Library",
    opacity: typeof source.watermarkOpacity === "number" && Number.isFinite(source.watermarkOpacity)
      ? Math.min(80, Math.max(10, source.watermarkOpacity)) / 100
      : 0.3,
    position,
    siteName: typeof source.siteName === "string" && source.siteName.trim()
      ? source.siteName.trim().slice(0, 100)
      : "TechVyro",
  }
}