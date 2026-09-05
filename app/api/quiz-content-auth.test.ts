import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  admin: false,
  quizFilters: [] as Array<[string, unknown]>,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({
          data: {
            id: "quiz-1",
            title: "Authenticated quiz",
            enabled: true,
            visibility: "public",
            questions: [{ id: "q1", question: "Protected question", options: ["A", "B"], correct: 1, explanation: "Private key" }],
          },
          error: null,
        }),
      }
      return query
    },
  }),
}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  from: () => {
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        state.quizFilters.push([column, value])
        return query
      },
      in: (column: string, value: unknown) => {
        state.quizFilters.push([column, value])
        return query
      },
      single: async () => ({
        data: {
          id: "quiz-1",
          title: "Authenticated quiz",
          description: "",
          category: "General",
          time_limit: 600,
          enabled: true,
          visibility: "public",
          questions: [{ id: "q1", question: "Protected question", options: ["A", "B"], correct: 1, explanation: "Private key" }],
        },
        error: null,
      }),
    }
    return query
  },
}) }))
vi.mock("@/lib/admin-auth", () => ({ extractToken: () => null, verifyAdminToken: () => state.admin }))
vi.mock("@/lib/notifications", () => ({ publishInAppNotification: vi.fn() }))

import { GET as getQuiz } from "./quizzes/[id]/route"
import { GET as getQuestions } from "./extract/questions/route"
import { GET as getTestSeries } from "./extract/tests/route"
import { GET as getQuizHtml } from "./quiz-html/route"

describe("student quiz content authentication", () => {
  beforeEach(() => {
    state.user = null
    state.admin = false
    state.quizFilters = []
  })

  it("returns 401 for every anonymous content endpoint, including sample tests", async () => {
    const [quiz, questions, html] = await Promise.all([
      getQuiz(new Request("https://example.test/api/quizzes/quiz-1"), { params: Promise.resolve({ id: "quiz-1" }) }),
      getQuestions(new Request("https://example.test/api/extract/questions?testId=sample-1&apiBase=sample:")),
      getQuizHtml(new NextRequest("https://example.test/api/quiz-html?testId=sample-1&apiBase=sample:")),
    ])

    expect(quiz.status).toBe(401)
    expect(questions.status).toBe(401)
    expect(html.status).toBe(401)
  })

  it("serves authenticated students only and marks question responses no-store", async () => {
    state.user = { id: "student-1" }
    const [quiz, questions, html] = await Promise.all([
      getQuiz(new Request("https://example.test/api/quizzes/quiz-1"), { params: Promise.resolve({ id: "quiz-1" }) }),
      getQuestions(new Request("https://example.test/api/extract/questions?testId=sample-1&apiBase=sample:")),
      getQuizHtml(new NextRequest("https://example.test/api/quiz-html?testId=sample-1&apiBase=sample:")),
    ])

    expect(quiz.status).toBe(200)
    expect(quiz.headers.get("Cache-Control")).toBe("no-store")
    const studentQuiz = await quiz.json()
    expect(studentQuiz.quiz.questions[0]).toEqual({ id: "q1", qid: "q1", question: "Protected question", options: ["A", "B"], marks: 1 })
    expect(JSON.stringify(studentQuiz)).not.toContain("correct")
    expect(JSON.stringify(studentQuiz)).not.toContain("explanation")
    expect(state.quizFilters).toEqual([
      ["id", "quiz-1"],
      ["enabled", true],
      ["visibility", ["public", "unlisted"]],
    ])
    expect(questions.status).toBe(200)
    expect(questions.headers.get("Cache-Control")).toBe("no-store")
    const studentQuestions = await questions.json()
    expect(studentQuestions.questions.every((question: { correct: number; options: string[] }) =>
      question.correct >= 1 && question.correct <= question.options.length)).toBe(true)
    expect(html.status).toBe(200)
    expect(html.headers.get("Cache-Control")).toBe("no-store")
  })

  it("keeps the full question model available to a verified admin", async () => {
    state.admin = true
    const response = await getQuiz(new Request("https://example.test/api/quizzes/quiz-1"), { params: Promise.resolve({ id: "quiz-1" }) })
    await expect(response.json()).resolves.toMatchObject({ quiz: { questions: [{ correct: 1, explanation: "Private key" }] } })
  })

  it("rejects authenticated requests to unapproved question API hosts before fetching", async () => {
    state.user = { id: "student-1" }
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const response = await getQuestions(
      new Request(
        "https://example.test/api/extract/questions?testId=live-1&apiBase=http%3A%2F%2F127.0.0.1%3A5000",
      ),
    )

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it("rejects unapproved test-series API hosts before fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const response = await getTestSeries(
      new Request(
        "https://example.test/api/extract/tests?slug=live-1&apiBase=https%3A%2F%2Flocalhost",
      ),
    )
    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})