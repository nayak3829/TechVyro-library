import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("trust signal contracts", () => {
  it("does not fabricate activity or unsupported content claims", () => {
    const leaderboard = readFileSync("app/quiz/leaderboard/page.tsx", "utf8")
    const testimonials = readFileSync("components/home/testimonials-section.tsx", "utf8")
    const testSeries = readFileSync("app/test-series/page.tsx", "utf8")

    expect(leaderboard).toContain("No completed quiz attempts yet")
    expect(leaderboard).toContain("signed-in students complete a public quiz")
    expect(testimonials).not.toMatch(/10,000\\+|all engineering subjects|NCERT solutions|Biology and Chemistry/)
    expect(testSeries).not.toContain("9,686+")
    expect(testSeries).toContain("Study PDFs for")
    expect(testSeries).toContain("are coming soon")
  })
})