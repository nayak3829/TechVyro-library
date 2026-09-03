import { describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ updatePayload: null as Record<string, unknown> | null, insertCalled: false }))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        state.updatePayload = payload
        const query = {
          eq: () => query,
          in: () => query,
          select: () => query,
          maybeSingle: async () => ({ data: { id: "terminal-job" }, error: null }),
        }
        return query
      },
      upsert: () => { state.insertCalled = true; return { select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) } },
    }),
  }),
}))

import { enqueuePdfJob } from "./pdf-jobs"

describe("PDF job enqueue lifecycle", () => {
  it("atomically revives terminal jobs and clears their terminal and lease fields", async () => {
    const result = await enqueuePdfJob("pdf-1", "process")
    expect(result.data).toMatchObject({ id: "terminal-job" })
    expect(state.insertCalled).toBe(false)
    expect(state.updatePayload).toMatchObject({
      status: "queued", attempts: 0, last_error: null, completed_at: null,
      leased_at: null, lease_expires_at: null, lease_token: null,
    })
  })
})