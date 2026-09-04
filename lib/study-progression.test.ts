import { describe, expect, it } from "vitest"
import { calculateQuizAnalytics } from "./study-progression-analytics"

describe("study progression analytics", () => {
  it("derives trends, totals, and weak areas from the student's result rows", () => {
    const analytics = calculateQuizAnalytics([
      { id: "1", quiz_id: "network", quiz_title: "Network", percentage: 100, correct: 5, wrong: 0, skipped: 0, created_at: "2026-01-02T00:00:00Z", quiz: { title: "Network", category: "Infrastructure" } },
      { id: "2", quiz_id: "security", quiz_title: "Security", percentage: 40, correct: 2, wrong: 3, skipped: 0, created_at: "2026-01-01T00:00:00Z", quiz: { title: "Security", category: "Security" } },
    ])

    expect(analytics.allTime).toMatchObject({ attempts: 2, averageScore: 70, bestScore: 100, correct: 7, wrong: 3, accuracy: 70 })
    expect(analytics.recentScoreTrend.map(point => point.quizId)).toEqual(["security", "network"])
    expect(analytics.byQuiz).toHaveLength(2)
    expect(analytics.weakestAreas[0]).toMatchObject({ key: "Security", accuracy: 40 })
  })
})