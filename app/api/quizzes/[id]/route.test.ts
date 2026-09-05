import { beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  authenticated: true,
  adminClientCalls: 0,
  filters: [] as Array<[string, unknown]>,
}))

function quizQuery() {
  const query = {
    select: () => query,
    eq(column: string, value: unknown) {
      state.filters.push([column, value])
      return query
    },
    in(column: string, value: unknown) {
      state.filters.push([column, value])
      return query
    },
    single: async () => ({
      data: {
        id: "shared-quiz",
        title: "Shared quiz",
        description: "",
        category: "General",
        time_limit: 600,
        enabled: true,
        questions: [],
      },
      error: null,
    }),
  }
  return query
}

vi.mock("@/lib/admin-auth", () => ({
  extractToken: () => null,
  verifyAdminToken: () => false,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.authenticated ? { id: "user-1" } : null },
        error: null,
      }),
    },
  }),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    state.adminClientCalls += 1
    return { from: () => quizQuery() }
  },
}))

vi.mock("@/lib/quiz-cache", () => ({ invalidateQuizCache: vi.fn() }))
vi.mock("@/lib/notifications", () => ({ publishInAppNotification: vi.fn() }))
vi.mock("@/lib/quiz-publication", () => ({ becamePublicQuiz: vi.fn() }))

import { GET } from "./route"

describe("explicit quiz route authorization", () => {
  beforeEach(() => {
    state.authenticated = true
    state.adminClientCalls = 0
    state.filters = []
  })

  it("rejects malformed path IDs before creating a service-role client", async () => {
    const response = await GET(
      new Request("https://example.test/api/quizzes/bad%20id"),
      { params: Promise.resolve({ id: "bad id" }) },
    )

    expect(response.status).toBe(404)
    expect(state.adminClientCalls).toBe(0)
  })

  it("mediates an explicit public or unlisted quiz through constrained service-role lookup", async () => {
    const response = await GET(
      new Request("https://example.test/api/quizzes/shared-quiz"),
      { params: Promise.resolve({ id: "shared-quiz" }) },
    )

    expect(response.status).toBe(200)
    expect(state.adminClientCalls).toBe(1)
    expect(state.filters).toEqual([
      ["id", "shared-quiz"],
      ["enabled", true],
      ["visibility", ["public", "unlisted"]],
    ])
  })

  it("requires a student session before creating a service-role client", async () => {
    state.authenticated = false
    const response = await GET(
      new Request("https://example.test/api/quizzes/shared-quiz"),
      { params: Promise.resolve({ id: "shared-quiz" }) },
    )

    expect(response.status).toBe(401)
    expect(state.adminClientCalls).toBe(0)
  })
})