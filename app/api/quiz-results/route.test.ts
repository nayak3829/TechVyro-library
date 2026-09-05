import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  filters: [] as Array<[string, unknown]>,
  inserted: null as Record<string, unknown> | null,
  user: null as { id: string } | null,
  submittedQuiz: { id: "quiz-public", title: "Public quiz", enabled: true, visibility: "public", questions: [{ qid: "q1", options: ["A", "B"], correct: 1 }], time_limit: 60 } as Record<string, unknown> | null,
  existingResult: null as Record<string, unknown> | null,
}))

function resultQuery() {
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      state.filters.push([column, value])
      return query
    },
    order: () => query,
    limit: () => query,
    then: (resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: [{ id: "result-1", quiz_title: "Public quiz", quiz: { enabled: true, visibility: "public" } }], error: null })),
    insert: (value: Record<string, unknown>) => {
      state.inserted = value
      return { select: () => ({ single: async () => ({ data: { id: "result-1" }, error: null }) }) }
    },
    maybeSingle: async () => ({ data: state.existingResult, error: null }),
  }
  return query
}

function quizQuery() {
  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      state.filters.push([column, value])
      return query
    },
    maybeSingle: async () => ({ data: state.submittedQuiz, error: null }),
  }
  return query
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => table === "quizzes" ? quizQuery() : resultQuery(),
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name !== "insert_quiz_result_and_award_progress") return { data: null, error: { message: "unexpected RPC" } }
      state.inserted = args
      const duplicate = state.existingResult !== null
      return {
        data: {
          result: state.existingResult || { id: "result-1" },
          progression: { awarded: !duplicate },
          duplicate,
        },
        error: null,
      }
    },
  }),
}))
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }),
}))
vi.mock("@/lib/telegram", () => ({ sendTelegramMessage: vi.fn(async () => {}) }))
vi.mock("@/lib/ai-request-security", () => ({
  checkRateLimit: () => ({ allowed: true, retryAfter: 0 }),
  clientAddress: () => "test",
  readBoundedJson: (request: Request) => request.json(),
  RequestBodyError: class RequestBodyError extends Error { status = 400 },
}))
vi.mock("@/lib/admin-auth", () => ({ extractToken: () => null, verifyAdminToken: () => false }))

import { GET, POST } from "./route"

describe("public quiz result access", () => {
  beforeEach(() => {
    state.filters.length = 0
    state.inserted = null
    state.user = null
    state.submittedQuiz = { id: "quiz-public", title: "Public quiz", enabled: true, visibility: "public", questions: [{ qid: "q1", options: ["A", "B"], correct: 1 }], time_limit: 60 }
    state.existingResult = null
  })

  it("only reads leaderboard results for enabled public quizzes and strips the join", async () => {
    const response = await GET(new Request("https://example.test/api/quiz-results"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ results: [{ id: "result-1", quiz_title: "Public quiz" }] })
    expect(state.filters).toContainEqual(["quiz.enabled", true])
    expect(state.filters).toContainEqual(["quiz.visibility", "public"])
  })

  it("rejects anonymous result submissions before inspecting quiz metadata", async () => {
    state.submittedQuiz = null
    const response = await POST(new Request("https://example.test/api/quiz-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Student", quizId: "quiz-unlisted", answers: {}, clientAttemptId: "00000000-0000-4000-8000-000000000001", totalTime: 10 }),
    }))

    expect(response.status).toBe(401)
    expect(state.filters).not.toContainEqual(["visibility", "public"])
  })

  it("accepts an authenticated submission and uses the verified user ID", async () => {
    state.user = { id: "student-verified" }
    const response = await POST(new Request("https://example.test/api/quiz-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Student", quizId: "quiz-public", userId: "forged-user", answers: { q1: 1 }, clientAttemptId: "00000000-0000-4000-8000-000000000001", totalTime: 10 }),
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(state.inserted).toMatchObject({
      p_user_id: "student-verified",
      p_correct: 1,
      p_wrong: 0,
      p_skipped: 0,
      p_client_attempt_id: "00000000-0000-4000-8000-000000000001",
    })
  })

  it("rejects forged client score counts instead of trusting them", async () => {
    state.user = { id: "student-verified" }
    const response = await POST(new Request("https://example.test/api/quiz-results", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Student", quizId: "quiz-public", correct: 999, answers: { q1: 1 }, clientAttemptId: "00000000-0000-4000-8000-000000000001", totalTime: 10 }),
    }))
    expect(response.status).toBe(400)
    expect(state.inserted).toBeNull()
  })

  it("returns an existing attempt and reconciles its progression", async () => {
    state.user = { id: "student-verified" }
    state.existingResult = { id: "existing-result", percentage: 80 }
    const response = await POST(new Request("https://example.test/api/quiz-results", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Student", quizId: "quiz-public", answers: { q1: 1 }, clientAttemptId: "00000000-0000-4000-8000-000000000001", totalTime: 10 }),
    }))
    await expect(response.json()).resolves.toMatchObject({ result: { id: "existing-result" }, duplicate: true })
    expect(state.inserted).toMatchObject({ p_user_id: "student-verified" })
  })
})