import "server-only"

export const PDF_SOURCE_BUCKETS = ["pdfs", "community-pdfs"] as const
export type PdfSourceBucket = typeof PDF_SOURCE_BUCKETS[number]
const LEGACY_PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?\/)[^\0\\\r\n]{1,1024}\.pdf$/i
const COMMUNITY_PATH = /^community\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i

/** Validates an explicit persisted source bucket/path pair; paths never choose buckets. */
export function validPdfStorageLocation(bucket: unknown, path: unknown): bucket is PdfSourceBucket {
  return typeof path === "string" && (
    (bucket === "pdfs" && LEGACY_PATH.test(path)) ||
    (bucket === "community-pdfs" && COMMUNITY_PATH.test(path))
  )
}
export function pdfSourceBucket(bucket: unknown): PdfSourceBucket | null {
  return bucket === "pdfs" || bucket === "community-pdfs" ? bucket : null
}