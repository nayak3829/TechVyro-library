import { describe, expect, it } from "vitest"
import { inspectPdfSafety } from "./pdf-safety"

describe("PDF active-content safety inspection", () => {
  it("marks passive bytes clean", () => {
    expect(inspectPdfSafety(new TextEncoder().encode("%PDF-1.7 passive")).malwareStatus).toBe("clean")
  })
  it("marks active-content indicators suspicious with bounded descriptions", () => {
    const result = inspectPdfSafety(new TextEncoder().encode("%PDF-1.7 /JavaScript /OpenAction"))
    expect(result.malwareStatus).toBe("suspicious")
    expect(result.warnings).toEqual([
      "PDF contains active-content marker /JavaScript",
      "PDF contains active-content marker /OpenAction",
    ])
  })
})