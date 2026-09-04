import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { becamePublicQuiz } from "@/lib/quiz-publication"

describe("quiz notification publication transition", () => {
  it("only publishes when a quiz becomes enabled and public", () => {
    expect(becamePublicQuiz(
      { enabled: false, visibility: "private" },
      { enabled: true, visibility: "public" },
    )).toBe(true)
    expect(becamePublicQuiz(
      { enabled: true, visibility: "public" },
      { enabled: true, visibility: "public" },
    )).toBe(false)
    expect(becamePublicQuiz(
      { enabled: false, visibility: "private" },
      { enabled: true, visibility: "private" },
    )).toBe(false)
  })
})