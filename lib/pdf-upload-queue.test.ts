import { describe, expect, it } from "vitest"
import { isUploadReady, normalizeRestoredQueueState, queueConcurrency, selectMeaningfulCategory, serializeQueueMetadata, sourceBlobKey, thumbnailBlobKey } from "./pdf-upload-queue"

describe("pdf upload queue helpers", () => {
  it("serializes bounded metadata without file/blob fields", () => {
    expect(serializeQueueMetadata({ id: "a", fileName: "x.pdf", fileSize: 20, status: "pending", progress: 140, error: "x".repeat(600) }))
      .toEqual({ id: "a", fileName: "x.pdf", fileSize: 20, status: "pending", progress: 100, error: "x".repeat(500) })
  })
  it("schedules up to six parallel workers by default", () => {
    expect(queueConcurrency(20)).toBe(6)
    expect(queueConcurrency(2)).toBe(2)
  })
  it("normalizes interrupted work into retryable states and does not retain completed work", () => {
    expect(normalizeRestoredQueueState({ status: "uploading", progress: 62, analysisStatus: "analyzing" }))
      .toMatchObject({ status: "pending", progress: 0, analysisStatus: "queued" })
    expect(normalizeRestoredQueueState({ status: "error", progress: 20, analysisStatus: "error" }))
      .toMatchObject({ status: "error", progress: 0, analysisStatus: "error" })
  })
  it("lets the admin approve an upload when analysis is incomplete or unavailable", () => {
    expect(isUploadReady({ status: "pending", analysisStatus: "complete", analysis: { valid: true } })).toBe(true)
    expect(isUploadReady({ status: "pending", analysisStatus: "queued", analysis: { valid: true } })).toBe(true)
    expect(isUploadReady({ status: "pending", analysisStatus: "complete", analysis: { valid: false } })).toBe(true)
    expect(isUploadReady({ status: "pending", analysisStatus: "error" })).toBe(true)
    expect(isUploadReady({ status: "pending", analysisStatus: "analyzing" })).toBe(false)
  })
  it("selects only meaningful category matches", () => {
    const categories = [{ id: "math", name: "Mathematics", slug: "mathematics" }, { id: "cs", name: "Computer Science", slug: "computer-science" }]
    expect(selectMeaningfulCategory(categories, { category: "Computer Science", keywords: ["algorithms"] })?.id).toBe("cs")
    expect(selectMeaningfulCategory(categories, { title: "An introduction to science fiction", keywords: ["fiction"] })).toBeUndefined()
  })
  it("uses separate safe keys for source and thumbnail blobs", () => {
    expect(sourceBlobKey("a/b")).toBe("source:a%2Fb")
    expect(thumbnailBlobKey("a/b")).toBe("thumbnail:a%2Fb")
  })
})