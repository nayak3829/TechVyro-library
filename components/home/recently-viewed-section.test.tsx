import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RecentlyViewedSection } from "./recently-viewed-section"
import { saveQuizProgress } from "@/lib/study-progress"

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}))

vi.mock("@/hooks/use-favorites", () => ({
  useFavorites: () => ({ favorites: ["pdf-2"], isLoaded: true }),
}))

describe("RecentlyViewedSection", () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem("techvyro_recently_viewed", JSON.stringify([
      {
        id: "pdf-1",
        title: "Operating Systems Notes",
        type: "pdf",
        viewedAt: "2026-09-04T09:00:00.000Z",
      },
    ]))
    saveQuizProgress("user-1", {
      quizId: "quiz-1",
      title: "Networking Basics",
      currentIndex: 1,
      answers: { 0: 1 },
      marked: [false, false, false],
      visited: [true, true, false],
      questionTimes: [5, 0, 0],
      timeRemaining: 540,
      totalQuestions: 3,
      updatedAt: "2026-09-04T09:05:00.000Z",
    })
  })

  it("combines unfinished quizzes, recent items, and saved PDFs", async () => {
    render(
      <RecentlyViewedSection
        pdfs={[
          { id: "pdf-1", title: "Operating Systems Notes" },
          { id: "pdf-2", title: "Database Notes" },
        ]}
        quizzes={[{ id: "quiz-1", title: "Networking Basics" }]}
      />
    )

    expect(await screen.findByText("Pick up where you left off")).toBeInTheDocument()
    expect(screen.getByText("Networking Basics")).toBeInTheDocument()
    expect(screen.getByText("1 of 3 answered")).toBeInTheDocument()
    expect(screen.getByText("Operating Systems Notes")).toBeInTheDocument()
    expect(screen.getByText("Database Notes")).toBeInTheDocument()
    expect(screen.getByText("Saved PDF")).toBeInTheDocument()
  })
})