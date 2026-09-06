import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  pdf: {} as Record<string, unknown>,
  updates: [] as Record<string, unknown>[],
}))

vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => "admin-token",
  verifyAdminToken: () => true,
}))

vi.mock("@/lib/pdf-jobs", () => ({ enqueuePdfJob: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ publishInAppNotification: vi.fn() }))
vi.mock("@/lib/pdf-job-runner", () => ({ nextDailyDigestAt: () => new Date() }))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const readQuery = {
        select: () => readQuery,
        eq: () => readQuery,
        maybeSingle: async () => ({ data: state.pdf, error: null }),
      }
      const updateQuery = {
        eq: () => updateQuery,
        select: () => updateQuery,
        single: async () => ({ data: state.pdf, error: null }),
      }
      return {
        ...readQuery,
        update: (values: Record<string, unknown>) => {
          state.updates.push(values)
          return updateQuery
        },
      }
    },
  }),
}))

import { POST } from "./route"

const params = { params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }) }
const publish = () => POST(new Request("https://example.test/api/pdfs/id/publish", {
  method: "POST",
  body: JSON.stringify({ action: "publish" }),
}), params)

describe("PDF publishing community safety", () => {
  beforeEach(() => {
    state.pdf = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Community PDF",
      publish_status: "needs_review",
      visibility: "private",
      storage_bucket: "community-pdfs",
      malware_status: "clean",
      processing_status: "queued",
      review_warnings: [],
      notification_preference: "none",
      scheduled_at: null,
    }
    state.updates = []
  })

  it("rejects a queued community PDF", async () => {
    const response = await publish()

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: "Community PDF must pass safety checks before publishing",
    })
    expect(state.updates).toEqual([])
  })

  it("publishes a clean completed community PDF", async () => {
    state.pdf.processing_status = "completed"

    const response = await publish()

    expect(response.status).toBe(200)
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0]).toMatchObject({ publish_status: "published", visibility: "public" })
  })
})