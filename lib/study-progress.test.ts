import { beforeEach, describe, expect, it } from "vitest"
import { clearQuizProgress, getQuizProgress, saveQuizProgress } from "./study-progress"

const snapshot = {
  quizId: "quiz-1",
  title: "Networking Basics",
  currentIndex: 2,
  answers: { 0: 1, 1: 3 },
  marked: [false, true, false],
  visited: [true, true, true],
  questionTimes: [4, 8, 1],
  timeRemaining: 312,
  totalQuestions: 10,
  updatedAt: "2026-09-04T09:00:00.000Z",
}

describe("quiz progress storage", () => {
  beforeEach(() => localStorage.clear())

  it("stores progress per authenticated user", () => {
    saveQuizProgress("user-a", snapshot)
    expect(getQuizProgress("user-a")).toEqual([snapshot])
    expect(getQuizProgress("user-b")).toEqual([])
  })

  it("replaces a quiz snapshot and clears it after submission", () => {
    saveQuizProgress("user-a", snapshot)
    saveQuizProgress("user-a", { ...snapshot, currentIndex: 4, updatedAt: "2026-09-04T09:05:00.000Z" })
    expect(getQuizProgress("user-a")).toHaveLength(1)
    expect(getQuizProgress("user-a")[0].currentIndex).toBe(4)
    clearQuizProgress("user-a", snapshot.quizId)
    expect(getQuizProgress("user-a")).toEqual([])
  })
})