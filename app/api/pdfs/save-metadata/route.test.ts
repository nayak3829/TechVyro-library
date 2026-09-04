import { afterEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  removed: [] as string[], replacement: false, validPdf: false,
  written: null as Record<string, unknown> | null,
  writes: [] as Array<Record<string, unknown>>,
}))
const analysis = {
  valid: true, pageCount: 1, contentHash: "a".repeat(64),
  warnings: [], malwareStatus: "clean",
  thumbnailPath: "thumbnails/1712345678901-preview.jpg",
}

vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => "valid",
  verifyAdminToken: () => true,
}))

vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  createAdminClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        ilike: () => query,
        maybeSingle: async () => ({
          data: state.replacement ? { id: "pdf-1", file_path: "old-file.pdf", thumbnail_path: null } : null,
          error: null,
        }),
        update: (payload: Record<string, unknown>) => {
          state.writes.push(payload)
          if ("content_type" in payload) state.written = payload
          return query
        },
        insert: (payload: Record<string, unknown>) => {
          state.writes.push(payload)
          if ("content_type" in payload) state.written = payload
          return query
        },
        eq: () => query,
        single: async () => ({ data: { id: "pdf-1", file_path: "new-file.pdf" }, error: null }),
      }
      return query
    },
    storage: {
      from: () => ({
        list: async (path = "") => ({
          data: path === "thumbnails"
            ? [{ name: "1712345678901-preview.jpg", metadata: { size: 20 } }]
            : [{ name: "1712345678901-not-a-pdf.pdf", metadata: { size: 10 } }],
          error: null,
        }),
        download: async () => ({ data: new Blob([state.replacement || state.validPdf ? "%PDF-valid" : "not a pdf!"]), error: null }),
        remove: async (paths: string[]) => {
          state.removed.push(...paths)
          return { error: state.replacement && paths.includes("old-file.pdf") ? { message: "storage outage" } : null }
        },
      }),
    },
  }),
}))

vi.mock("@/lib/telegram", () => ({ sendTelegramMessage: async () => undefined }))

import { POST } from "./route"

describe("signed PDF metadata save", () => {
  afterEach(() => { state.removed = []; state.replacement = false; state.validPdf = false; state.written = null; state.writes = [] })

  it("rejects a malformed content hierarchy before touching storage", async () => {
    const response = await POST(new Request("https://example.test/api/pdfs/save-metadata", {
      method: "POST",
      body: JSON.stringify({
        title: "Bad hierarchy", filePath: "1712345678901-not-a-pdf.pdf", fileSize: 10,
        contentType: "school", contentCategory: "Class 13", contentSubcategory: "CBSE", subject: "Math",
      }),
    }))
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/Class is invalid/) })
    expect(state.removed).toEqual([])
  })

  it("reads the stored object signature and cleans up a non-PDF upload", async () => {
    const response = await POST(new Request("https://example.test/api/pdfs/save-metadata", {
      method: "POST",
      body: JSON.stringify({
        title: "Injected content",
        filePath: "1712345678901-not-a-pdf.pdf",
        fileSize: 10,
        contentType: "exams", contentCategory: "SSC", contentSubcategory: "SSC CGL",
        analysis,
      }),
    }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: "Uploaded file is not a valid PDF" })
    expect(state.removed).toEqual(["1712345678901-not-a-pdf.pdf"])
  })

  it("rejects a new upload with no hierarchy before touching storage", async () => {
    const response = await POST(new Request("https://example.test/api/pdfs/save-metadata", {
      method: "POST",
      body: JSON.stringify({ title: "No hierarchy", filePath: "1712345678901-not-a-pdf.pdf", fileSize: 10 }),
    }))
    expect(response.status).toBe(400)
    expect(state.removed).toEqual([])
  })

  it("returns an explicit partial-success warning when the replaced object cannot be removed", async () => {
    state.replacement = true
    const response = await POST(new Request("https://example.test/api/pdfs/save-metadata", {
      method: "POST",
      body: JSON.stringify({
        title: "Replacement",
        filePath: "1712345678901-not-a-pdf.pdf",
        fileSize: 10,
        replace: true,
        analysis,
      }),
    }))

    expect(response.status).toBe(207)
    await expect(response.json()).resolves.toMatchObject({
      replaced: true,
      cleanupWarning: expect.stringContaining("previous file could not be removed"),
    })
    expect(state.removed).toContain("old-file.pdf")
  })

  it("preserves a replacement hierarchy when no hierarchy keys are supplied", async () => {
    state.replacement = true
    const response = await POST(new Request("https://example.test/api/pdfs/save-metadata", {
      method: "POST",
      body: JSON.stringify({ title: "Replacement", filePath: "1712345678901-not-a-pdf.pdf", fileSize: 10, replace: true, analysis }),
    }))
    expect(response.status).toBe(207)
    const write = state.writes.find((payload) => payload.file_path === "1712345678901-not-a-pdf.pdf")
    expect(write).not.toHaveProperty("content_type")
    expect(write).not.toHaveProperty("content_category")
  })

  it("updates a replacement hierarchy only when a complete set is supplied", async () => {
    state.replacement = true
    const response = await POST(new Request("https://example.test/api/pdfs/save-metadata", {
      method: "POST",
      body: JSON.stringify({
        title: "Replacement", filePath: "1712345678901-not-a-pdf.pdf", fileSize: 10, replace: true, analysis,
        contentType: "exams", contentCategory: "SSC", contentSubcategory: "SSC CHSL",
      }),
    }))
    expect(response.status).toBe(207)
    expect(state.writes.find((payload) => payload.file_path === "1712345678901-not-a-pdf.pdf")).toMatchObject({
      content_type: "exams", content_category: "SSC", content_subcategory: "SSC CHSL",
    })
  })

  it("allows admin review when browser analysis is unavailable", async () => {
    state.replacement = true // mock a valid PDF payload; contract validation follows signature validation.
    const response = await POST(new Request("https://example.test/api/pdfs/save-metadata", {
      method: "POST",
      body: JSON.stringify({
        title: "Missing analysis", filePath: "1712345678901-not-a-pdf.pdf", fileSize: 10, replace: true,
      }),
    }))
    expect(response.status).toBe(207)
    await expect(response.json()).resolves.toMatchObject({ replaced: true })
  })

  it("persists normalized hierarchy fields on create", async () => {
    state.validPdf = true
    const response = await POST(new Request("https://example.test/api/pdfs/save-metadata", {
      method: "POST",
      body: JSON.stringify({
        title: "School PDF", filePath: "1712345678901-not-a-pdf.pdf", fileSize: 10,
        contentType: "school", contentCategory: "Class 10", contentSubcategory: "CBSE", subject: "Physics",
        analysis,
      }),
    }))
    expect(response.status).toBe(200)
    expect(state.written).toMatchObject({
      content_type: "school", content_category: "Class 10", content_subcategory: "CBSE", subject: "Physics",
    })
  })
})