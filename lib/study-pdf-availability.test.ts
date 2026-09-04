import { describe, expect, it } from "vitest"

import { deriveStudyPdfAvailability } from "./study-pdf-availability"

describe("deriveStudyPdfAvailability", () => {
  it("derives mock-category PDF availability from live public content counts", () => {
    const availability = deriveStudyPdfAvailability({
      folders: [{
        categories: [
          { name: "SSC", pdfCount: 4, sections: [{ name: "SSC CGL", pdfCount: 4 }] },
          { name: "Banking", pdfCount: 0, sections: [] },
        ],
      }],
    })

    expect(availability.ssc).toBe(true)
    expect(availability.banking).toBe(false)
    expect(availability.defence).toBe(false)
  })
})