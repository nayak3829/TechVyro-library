import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  adminConfigured: true, securityConfigured: true, diagnostic: vi.fn(), cleanup: vi.fn(),
  rpc: vi.fn(), signed: vi.fn(), remove: vi.fn(), deleteEq: vi.fn(),
}))
vi.mock("@/lib/supabase/admin", () => ({
  isAdminConfigured: () => state.adminConfigured,
  createAdminClient: () => ({
    rpc: state.rpc,
    storage: { from: () => ({ createSignedUploadUrl: state.signed, remove: state.remove }) },
    from: () => ({ delete: () => ({ eq: state.deleteEq }) }),
  }),
}))
vi.mock("@/lib/community-submissions", () => ({
  isSubmissionSecurityConfigured: () => state.securityConfigured,
  logSubmissionConfigurationDiagnostic: state.diagnostic,
  validateUploadRequest: () => ({ email: "student@example.test", fileSize: 10 }),
  privacyHash: (kind: string) => `${kind}-hash`, getCommunityRequestIp: () => "203.0.113.1",
}))
vi.mock("@/lib/community-upload-cleanup", () => ({ cleanupExpiredCommunityUploads: state.cleanup }))

import { POST } from "./route"

describe("community upload URL configuration guard", () => {
  beforeEach(() => {
    state.adminConfigured = true; state.securityConfigured = true
    state.diagnostic.mockReset()
    state.cleanup.mockReset(); state.cleanup.mockResolvedValue({ cleaned: 0, failed: 0 })
    state.rpc.mockReset(); state.rpc.mockResolvedValue({ data: "123e4567-e89b-42d3-a456-426614174000", error: null })
    state.signed.mockReset(); state.signed.mockResolvedValue({ data: { signedUrl: "https://storage.test/upload" }, error: null })
    state.remove.mockReset(); state.remove.mockResolvedValue({ error: null })
    state.deleteEq.mockReset(); state.deleteEq.mockResolvedValue({ error: null })
  })

  it("keeps the unavailable response generic and emits safe requirement diagnostics", async () => {
    state.adminConfigured = false
    const response = await POST(new Request("https://example.test/api/submissions/upload-url", { method: "POST" }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "Submission service is temporarily unavailable" })
    expect(state.diagnostic).toHaveBeenCalledWith(false)
  })

  it("requests a reservation with a one-hour margin beyond signed URL expiry", async () => {
    const response = await POST(new Request("https://example.test/api/submissions/upload-url", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    }))
    expect(response.status).toBe(200)
    expect(state.rpc).toHaveBeenCalledWith("reserve_community_submission_slot", {
      p_email_hash: "email-hash", p_ip_hash: "ip-hash", p_ttl_seconds: 10800,
    })
  })

  it("logs safe cleanup-result booleans when signed URL creation cleanup fails", async () => {
    state.signed.mockResolvedValue({ data: null, error: { message: "sensitive storage detail" } })
    state.deleteEq.mockResolvedValue({ error: { message: "sensitive database detail" } })
    state.remove.mockResolvedValue({ error: { message: "sensitive storage cleanup detail" } })
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const response = await POST(new Request("https://example.test/api/submissions/upload-url", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    }))
    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Could not create upload URL" })
    expect(log).toHaveBeenCalledWith("Community upload URL failure cleanup incomplete", expect.objectContaining({
      reservationError: true, objectError: true,
    }))
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive")
    log.mockRestore()
  })
})