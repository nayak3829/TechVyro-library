import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CategoriesSection } from "./categories-section"
import { StatsSection } from "./stats-section"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("homepage accessibility", () => {
  it("renders content hierarchy toggles as semantic buttons with valid expanded state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        folders: [{
          id: "competitive",
          name: "Competitive Exams",
          description: "",
          icon: "Folder",
          color: "#3b82f6",
          order: 0,
          enabled: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          categories: [{
            id: "ssc",
            name: "SSC",
            description: "",
            icon: "BookOpen",
            color: "#10b981",
            order: 0,
            enabled: true,
            sections: [{
              id: "notes",
              name: "Notes",
              description: "",
              icon: "FileText",
              pdfCount: 2,
              quizCount: 0,
              order: 0,
              enabled: true,
            }],
          }],
        }],
      }),
    } as Response)

    const { container } = render(<CategoriesSection categories={[]} pdfsByCategory={{}} />)
    const folderTrigger = await screen.findByRole("button", { name: /Competitive Exams/i })
    const categoryTrigger = screen.getByRole("button", { name: /SSC/i })

    expect(folderTrigger).toHaveAttribute("aria-expanded", "true")
    expect(categoryTrigger).toHaveAttribute("aria-expanded", "false")
    expect(container.querySelector("div[type='button']")).toBeNull()
  })

  it("keeps feature headings at level three beneath the section heading", () => {
    render(<StatsSection stats={{
      totalPdfs: 10,
      totalCategories: 2,
      totalDownloads: 20,
      totalViews: 30,
      avgRating: 4.5,
      thisWeekDownloads: 1,
      thisWeekUploads: 1,
    }} />)

    expect(screen.getByRole("heading", { level: 3, name: "Selected by Toppers" })).toBeVisible()
  })

  it("uses theme-accessible contrast for live stat annotations", () => {
    render(<StatsSection stats={{
      totalPdfs: 10,
      totalCategories: 2,
      totalDownloads: 20,
      totalViews: 22,
      avgRating: 0,
      thisWeekDownloads: 0,
      thisWeekUploads: 28,
    }} />)

    for (const annotation of [
      "+28 added this week",
      "2 subjects covered",
      "All time total",
      "22 all time",
    ]) {
      expect(screen.getByText(annotation)).toHaveClass("text-emerald-700", "dark:text-emerald-300")
      expect(screen.getByText(annotation)).not.toHaveClass("text-emerald-500")
    }
  })
})