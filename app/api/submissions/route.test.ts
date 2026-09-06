import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  download: { data: null as Blob | null, error: null as { message: string } | null },
  rpc: { data: null as { id: string } | null, error: null as { code?: string; message?: string } | null },
  remove: vi.fn(),
  rpcCall: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => true,
  createAdminClient: () => ({
    storage: {
      from: () => ({
        download: async () => state.download,
        remove: state.remove,
      }),
    },
    rpc: async (...args: unknown[]) => {
      state.rpcCall(...args)
      return state.rpc
    },
  }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}))

vi.mock("@/lib/community-submissions", () => ({
  COMMUNITY_MAX_PDF_BYTES: 50 * 1024 * 1024,
  COMMUNITY_PATH: /^community\/[0-9a-f-]+\.pdf$/i,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  hasPdfSignature: (bytes: Uint8Array) =>
    bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-",
  isSubmissionSecurityConfigured: () => true,
  normalizeSubmission: () => ({
    title: "A useful PDF",
    description: null,
    submitterName: "Contributor",
    submitterEmail: "contributor@example.test",
    submitterNote: null,
    content_type: "Notes",
    content_category: "General",
    content_subcategory: null,
    subject: null,
  }),
  privacyHash: () => "email-hash",
}))

vi.mock("@/lib/pdf-safety", () => ({
  inspectPdfSafety: () => ({ malwareStatus: "clean", warnings: [] }),
}))

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    load: async () => ({ getPageCount: () => 1 }),
  },
}))

import { POST } from "./route"

const reservationId = "123e4567-e89b-42d3-a456-426614174000"
const filePath = `community/${reservationId}.pdf`
const validBytes = new TextEncoder().encode("%PDF-valid")

function requestFor(bytes = validBytes) {
  return new Request("https://example.test/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reservationId,
      filePath,
      fileSize: bytes.byteLength,
      copyrightConfirmed: true,
    }),
  })
}

describe("community submission finalization handler", () => {
  beforeEach(() => {
    state.download = {
      data: new Blob([validBytes], { type: "application/pdf" }),
      error: null,
    }
    state.rpc = { data: { id: "submission-1" }, error: null }
    state.remove.mockReset()
    state.remove.mockResolvedValue({ data: null, error: null })
    state.rpcCall.mockReset()
  })

  it("removes the reservation-bound object when download fails", async () => {
    state.download = { data: null, error: { message: "storage unavailable" } }

    const response = await POST(requestFor())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Uploaded PDF was not found", code: "upload_not_found" })
    expect(state.remove).toHaveBeenCalledWith([filePath])
  })

  it("logs a safe diagnostic when storage reports object removal failure", async () => {
    state.download = { data: null, error: { message: "storage unavailable" } }
    state.remove.mockResolvedValue({ data: null, error: { message: "sensitive provider detail" } })
    const log = vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await POST(requestFor())

    expect(response.status).toBe(400)
    expect(log).toHaveBeenCalledWith("Community submission object removal incomplete", {
      event: "community_submission_object_removal_incomplete", path: filePath, storageError: true,
    })
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive")
    log.mockRestore()
  })

  it("removes an uploaded object with an invalid PDF signature", async () => {
    const invalidBytes = new TextEncoder().encode("not-a-pdf!")
    state.download = {
      data: new Blob([invalidBytes], { type: "application/pdf" }),
      error: null,
    }

    const response = await POST(requestFor(invalidBytes))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Uploaded file is not a valid PDF" })
    expect(state.remove).toHaveBeenCalledWith([filePath])
    expect(state.rpcCall).not.toHaveBeenCalled()
  })

  it("retains the object when submission creation has a retryable infrastructure failure", async () => {
    state.rpc = { data: null, error: { code: "08006", message: "connection failure" } }

    const response = await POST(requestFor())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Could not save submission" })
    expect(state.remove).not.toHaveBeenCalled()
  })

  it("removes the object when the reservation is terminally invalid or expired", async () => {
    state.rpc = {
      data: null,
      error: { code: "22023", message: "invalid or expired reservation" },
    }

    const response = await POST(requestFor())

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "Upload reservation is invalid or expired" })
    expect(state.remove).toHaveBeenCalledWith([filePath])
  })

  it("returns only the submission id and pending status after finalization", async () => {
    state.rpc = {
      data: { id: "submission-1", title: "must not leak" } as { id: string },
      error: null,
    }

    const response = await POST(requestFor())

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      submission: { id: "submission-1", status: "pending" },
    })
    expect(state.remove).not.toHaveBeenCalled()
  })
})