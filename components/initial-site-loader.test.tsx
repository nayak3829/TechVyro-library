import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { InitialSiteLoader } from "./initial-site-loader"

vi.mock("@/components/ui/page-loader", () => ({
  TechVyroLoader: ({ text }: { text: string }) => <span>{text}</span>,
}))

describe("InitialSiteLoader", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("stays visible briefly, fades, and cannot get stuck", () => {
    render(<InitialSiteLoader />)
    expect(screen.getByRole("status", { name: "TechVyro is loading" })).toBeVisible()

    act(() => vi.advanceTimersByTime(550))
    expect(screen.getByRole("status")).toHaveClass("opacity-0")

    act(() => vi.advanceTimersByTime(250))
    expect(screen.queryByRole("status")).toBeNull()
  })
})