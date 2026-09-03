import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import PlayPage from "./page"

let currentUser: object | null = { id: "student" }
let currentParams = new URLSearchParams()
const router = { back: vi.fn(), push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => currentParams,
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: currentUser, loading: false }),
}))

vi.mock("@/components/quiz/quiz-player", () => ({
  QuizPlayer: () => <div>Quiz loaded</div>,
}))

describe("live test start analytics", () => {
  beforeEach(() => {
    currentUser = { id: "student" }
    router.push.mockReset()
    currentParams = new URLSearchParams({
      testId: "live-1",
      apiBase: "https://alpha-api.example.com",
      title: "Live Test",
      platform: "Alpha Academy",
      category: "ssc",
      location: "homepage",
    })
  })

  afterEach(() => {
    cleanup()
    delete window.umami
    vi.restoreAllMocks()
  })

  it("tracks a live start only after questions load successfully", async () => {
    const track = vi.fn()
    window.umami = { track }
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        questions: [{ qid: "1", question: "Q", options: ["A"], correct: 0, marks: 1, explanation: "" }],
      }),
    } as Response)

    render(<PlayPage />)
    expect(track).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /start test now/i }))

    expect(await screen.findByText("Quiz loaded")).toBeVisible()
    expect(track).toHaveBeenCalledWith("live_test_series_started", {
      platform: "Alpha Academy",
      category: "ssc",
      location: "homepage",
    })
  })

  it("does not track when question loading fails", async () => {
    const track = vi.fn()
    window.umami = { track }
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Unavailable" }),
    } as Response)

    render(<PlayPage />)
    fireEvent.click(screen.getByRole("button", { name: /start test now/i }))

    expect(await screen.findByText("Could Not Load Test")).toBeVisible()
    expect(track).not.toHaveBeenCalled()
  })

  it("preserves dimensions for a direct test-series page start", async () => {
    currentParams.set("location", "test_series_page")
    currentParams.set("category", "banking")
    const track = vi.fn()
    window.umami = { track }
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        questions: [{ qid: "1", question: "Q", options: ["A"], correct: 0, marks: 1, explanation: "" }],
      }),
    } as Response)

    render(<PlayPage />)
    fireEvent.click(screen.getByRole("button", { name: /start test now/i }))

    await screen.findByText("Quiz loaded")
    expect(track).toHaveBeenCalledWith("live_test_series_started", {
      platform: "Alpha Academy",
      category: "banking",
      location: "test_series_page",
    })
  })

  it("redirects every unauthenticated start to login with its complete destination", async () => {
    currentUser = null
    const track = vi.fn()
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    window.umami = { track }

    render(<PlayPage />)
    fireEvent.click(screen.getByRole("button", { name: /start test now/i }))

    expect(router.push).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent(`/test-series/play?${currentParams.toString()}`)}`,
    )
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })
})