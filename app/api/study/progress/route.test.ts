import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ user: null as { id: string } | null, filters: [] as Array<[string, unknown]> }))

function query(table: string) {
  const rows: Record<string, unknown[]> = {
    student_progress: [{ total_xp: 42, current_streak: 2, longest_streak: 3, last_study_date: "2026-01-02", updated_at: "2026-01-02T00:00:00Z" }],
    achievement_unlocks: [{ achievement_key: "first_quiz", unlocked_at: "2026-01-02T00:00:00Z" }],
    xp_ledger: [{ id: "ledger-1", amount: 12, reason: "quiz_completed", created_at: "2026-01-02T00:00:00Z" }],
    quiz_results: [{ id: "result-1", quiz_id: "quiz-1", quiz_title: "Quiz", percentage: 80, correct: 4, wrong: 1, skipped: 0, created_at: "2026-01-02T00:00:00Z", quiz: { id: "quiz-1", title: "Quiz", category: "Networking" } }],
  }
  const chain = {
    select: () => chain,
    eq: (column: string, value: unknown) => { state.filters.push([`${table}.${column}`, value]); return chain },
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    maybeSingle: async () => ({ data: rows[table][0] || null, error: null }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: rows[table], error: null })),
  }
  return chain
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }),
}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: query }) }))

import { GET } from "./route"

describe("study progress API", () => {
  beforeEach(() => { state.user = null; state.filters.length = 0 })

  it("requires an authenticated student", async () => {
    expect((await GET()).status).toBe(401)
  })

  it("returns only the authenticated student's progression and analytics", async () => {
    state.user = { id: "student-a" }
    const response = await GET()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ progress: { total_xp: 42 }, analytics: { allTime: { attempts: 1, accuracy: 80 } } })
    expect(state.filters).toContainEqual(["quiz_results.user_id", "student-a"])
    expect(state.filters).toContainEqual(["xp_ledger.user_id", "student-a"])
  })
})