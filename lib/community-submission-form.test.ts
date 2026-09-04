import { describe, expect, it } from "vitest"

import { inferCommunityHierarchy, validateCommunityHierarchy } from "./community-submission-form"

describe("community submission form suggestions", () => {
  it("suggests SSC hierarchy from analyzed PDF content", () => {
    const result = inferCommunityHierarchy({
      title: "SSC CGL Geography Notes",
      text: "Staff Selection Commission CGL study material",
      keywords: ["ssc", "geography"],
    })
    expect(result).toEqual({
      contentType: "exams",
      contentCategory: "SSC",
      detail: "SSC CGL Geography Notes",
      semester: "",
      subject: "",
    })
    expect(validateCommunityHierarchy(result!)).toBeNull()
  })

  it("only suggests academic hierarchy when confidence signals are present", () => {
    expect(inferCommunityHierarchy({ title: "My document", text: "General information" })).toBeNull()
  })

  it("recognizes semester phrasing for diploma material", () => {
    expect(inferCommunityHierarchy({
      title: "Diploma Mechanical Semester 3 Notes",
      metadata: { subject: "Thermodynamics" },
    })).toMatchObject({
      contentType: "diploma",
      contentCategory: "Mechanical",
      semester: "Semester 3",
      subject: "Thermodynamics",
    })
  })
})