import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({ authenticated: false }))

vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => null,
  verifyAdminToken: () => state.authenticated,
}))

vi.mock("@/lib/quiz-cache", () => ({
  getQuizList: async () => [{
    id: "quiz-1",
    title: "Test",
    description: "",
    category: "General",
    section: "General",
    difficulty: "medium",
    time_limit: 600,
    enabled: true,
    visibility: "public",
    created_at: "2026-09-03T00:00:00Z",
    questions: [{
      id: "question-1",
      question: "Secret question",
      options: ["A", "B"],
      correct: 2,
      explanation: "Secret explanation",
    }],
    tags: ["exam"],
    hasContent: true,
    structure_location: null,
    negative_marking: 0,
    passing_percentage: 0,
    shuffle_questions: false,
    shuffle_options: false,
  }],
  invalidateQuizCache: vi.fn(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}))

import { GET } from "./route"

describe("quiz list visibility", () => {
  beforeEach(() => {
    state.authenticated = false
  })

  it("returns full editable questions only to admins without shared caching", async () => {
    state.authenticated = true
    const response = await GET(new Request("https://example.test/api/quizzes"))
    const body = await response.json()

    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(body.quizzes[0].questions[0]).toMatchObject({
      question: "Secret question",
      correct: 2,
      explanation: "Secret explanation",
    })
    expect(body.quizzes[0].tags).toEqual(["exam"])
  })

  it("strips answers and explanations from the public quiz list", async () => {
    const response = await GET(new Request("https://example.test/api/quizzes"))
    const body = await response.json()

    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    expect(body.quizzes[0].questions).toEqual([{ id: "question-1" }])
  })
})