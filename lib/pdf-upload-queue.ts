/** Pure queue helpers kept separate so refresh/retry behavior can be tested
 * without a browser, React, or IndexedDB. */
export interface QueueMetadata {
  id: string
  fileName: string
  fileSize: number
  status: string
  progress: number
  analysisStatus?: string
  error?: string
}

export type QueueStatus = "pending" | "checking" | "uploading" | "done" | "error"
export type AnalysisStatus = "queued" | "analyzing" | "complete" | "error"

/** An interrupted upload can never be resumed safely: retry it from a stable queue state. */
export function normalizeRestoredQueueState<T extends { status?: string; progress?: number; error?: string; analysisStatus?: string }>(entry: T): T & {
  status: "pending" | "error"
  progress: number
  analysisStatus: "queued" | "complete" | "error"
} {
  const wasInFlight = entry.status === "checking" || entry.status === "uploading"
  const wasAnalyzing = entry.analysisStatus === "analyzing"
  const analysisStatus = wasAnalyzing ? "queued" : entry.analysisStatus === "complete" ? "complete" : entry.analysisStatus === "error" ? "error" : "queued"
  return {
    ...entry,
    status: entry.status === "error" ? "error" : "pending",
    progress: entry.status === "error" ? 0 : 0,
    analysisStatus,
    ...(wasInFlight ? { error: "Upload interrupted by refresh — ready to retry." } : {}),
    ...(wasAnalyzing ? { error: undefined, analysisMessage: "Analysis interrupted by refresh — ready to analyze again." } : {}),
  }
}

export function sourceBlobKey(entryId: string): string {
  return `source:${encodeURIComponent(entryId)}`
}

export function thumbnailBlobKey(entryId: string): string {
  return `thumbnail:${encodeURIComponent(entryId)}`
}

export function isUploadReady(entry: Pick<QueueMetadata, "status" | "analysisStatus"> & { analysis?: { valid?: boolean } }): boolean {
  return entry.status === "pending" && entry.analysisStatus === "complete" && entry.analysis?.valid === true
}

export interface CategoryMatchCandidate {
  id: string
  name: string
  slug?: string
}

const tokens = (value: string) => new Set(value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((token) => token.length > 2))

/** Returns only confident semantic matches; incidental one-word overlap stays unselected. */
export function selectMeaningfulCategory<T extends CategoryMatchCandidate>(
  categories: T[],
  signals: { category?: string; title?: string; keywords?: string[] },
): T | undefined {
  const signalText = [signals.category, signals.title, ...(signals.keywords || [])].filter(Boolean).join(" ").toLowerCase()
  const signalTokens = tokens(signalText)
  let best: { category: T; score: number } | undefined
  for (const category of categories) {
    const name = category.name.toLowerCase()
    const slug = (category.slug || "").replace(/-/g, " ").toLowerCase()
    const categoryTokens = tokens(`${name} ${slug}`)
    const overlap = [...categoryTokens].filter((token) => signalTokens.has(token)).length
    const exact = [name, slug].filter((term) => term.length > 2 && signalText.includes(term)).length
    const score = exact * 8 + overlap * 2 - (categoryTokens.size > overlap ? 1 : 0)
    if (!best || score > best.score) best = { category, score }
  }
  return best && best.score >= 3 ? best.category : undefined
}

export function serializeQueueMetadata(entry: QueueMetadata): QueueMetadata {
  return {
    id: String(entry.id),
    fileName: String(entry.fileName),
    fileSize: Math.max(0, Number(entry.fileSize) || 0),
    status: String(entry.status),
    progress: Math.min(100, Math.max(0, Number(entry.progress) || 0)),
    ...(entry.analysisStatus ? { analysisStatus: String(entry.analysisStatus) } : {}),
    ...(entry.error ? { error: String(entry.error).slice(0, 500) } : {}),
  }
}

export function queueConcurrency(size: number, limit = 6): number {
  return Math.max(0, Math.min(Math.floor(size), Math.max(1, Math.floor(limit))))
}