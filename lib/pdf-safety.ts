import "server-only"

export type PdfSafetyInspection = {
  malwareStatus: "clean" | "suspicious"
  warnings: string[]
}

const ACTIVE_CONTENT_MARKERS = ["/JavaScript", "/JS", "/Launch", "/OpenAction", "/EmbeddedFile", "/RichMedia"] as const

/** Lightweight deterministic inspection used before immutable intake and by the worker. */
export function inspectPdfSafety(bytes: Uint8Array): PdfSafetyInspection {
  const buffer = Buffer.from(bytes)
  const markers = ACTIVE_CONTENT_MARKERS.filter(marker => buffer.includes(Buffer.from(marker)))
  return {
    malwareStatus: markers.length ? "suspicious" : "clean",
    warnings: markers.map(marker => `PDF contains active-content marker ${marker}`),
  }
}