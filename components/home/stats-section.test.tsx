import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StatsSection } from "./stats-section"

describe("StatsSection trust signals", () => {
  it("renders server totals immediately instead of contradictory zero placeholders", () => {
    render(<StatsSection stats={{
      totalPdfs: 4,
      totalCategories: 1,
      totalDownloads: 0,
      totalViews: 7,
      avgRating: 0,
      thisWeekDownloads: 0,
      thisWeekUploads: 4,
    }} />)

    expect(screen.getByText("4", { selector: "span" })).toBeVisible()
    expect(screen.getByText("1", { selector: "span" })).toBeVisible()
    expect(screen.getByText("7", { selector: "span" })).toBeVisible()
    expect(screen.getByText("+4 added this week")).toBeVisible()
  })
})