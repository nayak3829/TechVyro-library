import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QuizPlayer } from "./quiz-player"
import { saveQuizProgress } from "@/lib/study-progress"

describe("QuizPlayer progress restoration", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      json: async () => ({ results: [] }),
    }))
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("resumes the authenticated user's unfinished question", async () => {
    saveQuizProgress("user-1", {
      quizId: "quiz-1",
      title: "Networking Basics",
      currentIndex: 1,
      answers: { 0: 1 },
      marked: [false, true, false],
      visited: [true, true, false],
      questionTimes: [5, 0, 0],
      timeRemaining: 540,
      totalQuestions: 3,
      updatedAt: "2026-09-04T09:00:00.000Z",
    })

    render(
      <QuizPlayer
        title="Networking Basics"
        quizId="quiz-1"
        userId="user-1"
        userName="Student"
        timeLimit={600}
        questions={[
          { qid: "q1", question: "Question one", options: ["A", "B"], correct: 1, marks: 1 },
          { qid: "q2", question: "Question two", options: ["A", "B"], correct: 2, marks: 1 },
          { qid: "q3", question: "Question three", options: ["A", "B"], correct: 1, marks: 1 },
        ]}
      />
    )

    await waitFor(() => expect(screen.getByText("Q 2 / 3")).toBeInTheDocument())
    expect(screen.getByText("Question two")).toBeInTheDocument()
  })
})