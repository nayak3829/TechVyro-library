import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const state = vi.hoisted(() => ({
  admin: false,
  authenticated: false,
  pdf: {
    id: "pdf-1",
    title: "Policy PDF",
    file_path: "policy.pdf",
    storage_bucket: "pdfs",
    malware_status: "clean",
    visibility: "public",
    allow_download: true,
  } as Record<string, unknown>,
  listingFilters: [] as Array<[string, unknown]>,
  storageDownloads: 0,
  rpcCalls: [] as Array<{ name: string; args: unknown }>,
  rpcError: null as null | { message: string },
  watermarkEnabled: false,
}))

function listingQuery() {
  let rows = [
    { id: "public", title: "Public", visibility: "public", publish_status: "published", malware_status: "clean" },
    { id: "unlisted", title: "Unlisted", visibility: "unlisted", publish_status: "published", malware_status: "clean" },
    { id: "private", title: "Private", visibility: "private", publish_status: "published", malware_status: "clean" },
  ]
  const query = {
    select: () => query,
    eq(column: string, value: unknown) {
      state.listingFilters.push([column, value])
      rows = rows.filter((row) => row[column as keyof typeof row] === value)
      return query
    },
    or: () => query,
    order: () => query,
    range: () => query,
    then(resolve: (result: { data: Array<Omit<(typeof rows)[number], "malware_status">>; error: null }) => unknown) {
      const projectedRows = rows.map(({ malware_status: _malwareStatus, ...row }) => row)
      return Promise.resolve(resolve({ data: projectedRows, error: null }))
    },
  }
  return query
}

function metadataQuery() {
  let accepted = true
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      if (column in state.pdf && state.pdf[column] !== value) accepted = false
      return query
    },
    or: () => {
      const scheduledAt = state.pdf.scheduled_at
      if (typeof scheduledAt === "string" && Date.parse(scheduledAt) > Date.now()) accepted = false
      return query
    },
    single: async () => ({ data: accepted ? state.pdf : null, error: null }),
    update: () => query,
  }
  return query
}

function adminPDFQuery() {
  let rows = [
    { id: "public", title: "Public", visibility: "public" },
    { id: "unlisted", title: "Unlisted", visibility: "unlisted" },
    { id: "private", title: "Private", visibility: "private" },
  ]
  const query = {
    select: () => query,
    eq(column: string, value: unknown) {
      if (column === "id") return metadataQuery()
      rows = rows.filter((row) => row[column as keyof typeof row] === value)
      return query
    },
    or: () => query,
    order: () => query,
    range: () => query,
    then(resolve: (result: { data: typeof rows; error: null }) => unknown) {
      return Promise.resolve(resolve({ data: rows, error: null }))
    },
  }
  return query
}

vi.mock("@/lib/admin-auth", () => ({
  extractToken: vi.fn(() => null),
  verifyAdminToken: vi.fn(() => state.admin),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.authenticated ? { id: "user-1" } : null },
        error: null,
      }),
    },
    from: () => listingQuery(),
  })),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => table === "site_settings"
      ? {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { value: {} }, error: null }),
          }),
        }),
      }
      : state.admin ? adminPDFQuery() : metadataQuery(),
    rpc: async (name: string, args: unknown) => {
      state.rpcCalls.push({ name, args })
      return { data: state.rpcError ? null : 11, error: state.rpcError }
    },
    storage: {
      from: () => ({
        download: async () => {
          state.storageDownloads += 1
          return { data: new Blob(["pdf bytes"], { type: "application/pdf" }), error: null }
        },
      }),
    },
  }),
}))
vi.mock("@/lib/watermark-settings", () => ({
  getWatermarkSettings: () => ({
    enabled: state.watermarkEnabled,
    text: "TechVyro",
    opacity: 0.2,
    position: "diagonal",
    siteName: "TechVyro",
  }),
}))

import { GET as listPDFs } from "@/app/api/pdfs/route"
import { GET as viewPDF } from "@/app/api/pdfs/[id]/view/route"
import { POST as trackPDFView } from "@/app/api/pdfs/[id]/view/route"
import { GET as downloadPDF } from "@/app/api/pdfs/[id]/download-watermarked/route"

const params = { params: Promise.resolve({ id: "pdf-1" }) }

describe("PDF route privacy policy", () => {
  beforeEach(() => {
    state.admin = false
    state.authenticated = false
    state.pdf = {
      id: "pdf-1",
      title: "Policy PDF",
      file_path: "policy.pdf",
      storage_bucket: "pdfs",
      malware_status: "clean",
      visibility: "public",
      publish_status: "published",
      scheduled_at: null,
      allow_download: true,
    }
    state.listingFilters.length = 0
    state.storageDownloads = 0
    state.rpcCalls = []
    state.rpcError = null
    state.watermarkEnabled = false
  })

  it("returns only explicitly public PDFs from the public listing", async () => {
    const response = await listPDFs(new NextRequest("https://example.test/api/pdfs"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      pdfs: [{
        id: "public", title: "Public", visibility: "public", publish_status: "published",
        thumbnail_url: "/api/pdfs/public/thumbnail",
      }],
    })
    expect(state.listingFilters).toContainEqual(["visibility", "public"])
    expect(state.listingFilters).toContainEqual(["publish_status", "published"])
    expect(state.listingFilters).toContainEqual(["malware_status", "clean"])
  })

  it("returns every visibility level to an authenticated admin listing", async () => {
    state.admin = true

    const response = await listPDFs(new NextRequest("https://example.test/api/pdfs"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      pdfs: [
        { id: "public", title: "Public", visibility: "public", thumbnail_url: "/api/pdfs/public/thumbnail" },
        { id: "unlisted", title: "Unlisted", visibility: "unlisted", thumbnail_url: "/api/pdfs/unlisted/thumbnail" },
        { id: "private", title: "Private", visibility: "private", thumbnail_url: "/api/pdfs/private/thumbnail" },
      ],
    })
    expect(state.listingFilters).not.toContainEqual(["visibility", "public"])
  })

  it("allows anonymous direct viewing of published public PDFs", async () => {
    const response = await viewPDF(new Request("https://example.test/api/pdfs/pdf-1/view"), params)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/pdf")
    expect(state.storageDownloads).toBe(1)
  })

  it("hides unlisted PDFs from anonymous direct viewing", async () => {
    state.pdf.visibility = "unlisted"
    const response = await viewPDF(new Request("https://example.test/api/pdfs/pdf-1/view"), params)

    expect(response.status).toBe(404)
    expect(state.storageDownloads).toBe(0)
  })

  it("hides private PDFs from non-admin direct requests", async () => {
    state.pdf.visibility = "private"
    state.authenticated = true

    const response = await viewPDF(new Request("https://example.test/api/pdfs/pdf-1/view"), params)

    expect(response.status).toBe(404)
    expect(state.storageDownloads).toBe(0)
  })

  it("allows an admin to view a private PDF", async () => {
    state.pdf.visibility = "private"
    state.admin = true

    const response = await viewPDF(new Request("https://example.test/api/pdfs/pdf-1/view"), params)

    expect(response.status).toBe(200)
    expect(state.storageDownloads).toBe(1)
  })

  it("denies downloads when allow_download is false without reading storage", async () => {
    state.authenticated = true
    state.pdf.allow_download = false

    const response = await downloadPDF(
      new Request("https://example.test/api/pdfs/pdf-1/download-watermarked"),
      params,
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: "Downloads are disabled for this PDF" })
    expect(state.storageDownloads).toBe(0)
  })

  it("fails closed without accounting when required watermarking fails", async () => {
    state.authenticated = true
    state.watermarkEnabled = true

    const response = await downloadPDF(
      new Request("https://example.test/api/pdfs/pdf-1/download-watermarked", {
        headers: { "Idempotency-Key": "download:pdf-1:event-1" },
      }),
      params,
    )

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({ error: "Unable to watermark PDF" })
    expect(state.storageDownloads).toBe(1)
    expect(state.rpcCalls).toEqual([])
  })

  it("tracks a view atomically and returns the persisted count", async () => {
    const response = await trackPDFView(new Request("https://example.test/api/pdfs/pdf-1/view", {
      method: "POST",
      headers: { "Idempotency-Key": "view:pdf-1:event-1" },
    }), params)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, count: 11 })
    expect(state.rpcCalls).toEqual([{
      name: "increment_view_count",
      args: { pdf_id: "pdf-1", event_key: "view:pdf-1:event-1" },
    }])
  })

  it("does not report success when the atomic view counter fails", async () => {
    state.rpcError = { message: "counter failed" }
    const response = await trackPDFView(new Request("https://example.test/api/pdfs/pdf-1/view", {
      method: "POST",
    }), params)
    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Failed to update view count" })
  })

  it("rejects malformed idempotency keys before counter mutation", async () => {
    const response = await trackPDFView(new Request("https://example.test/api/pdfs/pdf-1/view", {
      method: "POST",
      headers: { "Idempotency-Key": "bad key!" },
    }), params)
    expect(response.status).toBe(400)
    expect(state.rpcCalls).toEqual([])
  })
})