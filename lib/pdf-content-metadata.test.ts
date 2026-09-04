import { describe, expect, it } from "vitest"
import {
  clearPdfContentDependents,
  formValueToMetadata,
  metadataToFormValue,
  normalizePdfContentMetadata,
} from "./pdf-content-metadata"

describe("PDF content metadata", () => {
  it("normalizes each supported cascade", () => {
    expect(normalizePdfContentMetadata({
      contentType: "exams", contentCategory: "SSC", contentSubcategory: "SSC CGL", subject: null,
    })).toMatchObject({ content_type: "exams", content_category: "SSC", content_subcategory: "SSC CGL" })
    expect(normalizePdfContentMetadata({
      contentType: "school", contentCategory: "Class 10", contentSubcategory: "CBSE", subject: "Mathematics",
    }).subject).toBe("Mathematics")

    const persisted = formValueToMetadata({
      contentType: "college", contentCategory: "B.Tech", detail: "Computer Science",
      semester: "Semester 3", subject: "Algorithms",
    })
    expect(persisted.contentSubcategory).toBe("Computer Science · Semester 3")
    expect(metadataToFormValue({
      content_type: "college", content_category: "B.Tech",
      content_subcategory: String(persisted.contentSubcategory), subject: "Algorithms",
    })).toMatchObject({ detail: "Computer Science", semester: "Semester 3" })
  })

  it("rejects malformed, incomplete, and unbounded values", () => {
    expect(() => normalizePdfContentMetadata({
      contentType: "exam", contentCategory: "SSC", contentSubcategory: "CGL",
    })).toThrow(/Content type/)
    expect(() => normalizePdfContentMetadata({
      contentType: "school", contentCategory: "Class 13", contentSubcategory: "CBSE", subject: "Math",
    })).toThrow(/Class is invalid/)
    expect(() => normalizePdfContentMetadata({
      contentType: "college", contentCategory: "B.Tech",
      contentSubcategory: "Computer Science · Semester 99", subject: "Algorithms",
    })).toThrow(/Semester is invalid/)
    expect(() => normalizePdfContentMetadata({
      contentType: "exams", contentCategory: "SSC", contentSubcategory: "x".repeat(161),
    })).toThrow(/at most 160/)
  })

  it("clears all downstream values whenever a parent changes", () => {
    const value = {
      contentType: "college" as const, contentCategory: "B.Tech", detail: "Computer Science",
      semester: "Semester 3", subject: "Algorithms",
    }
    expect(clearPdfContentDependents(value, "contentCategory", "B.Sc")).toEqual({
      ...value, contentCategory: "B.Sc", detail: "", semester: "", subject: "",
    })
    expect(clearPdfContentDependents(value, "semester", "Semester 4")).toEqual({
      ...value, semester: "Semester 4", subject: "",
    })
  })

  it("permits fully empty legacy metadata only when explicitly requested", () => {
    expect(normalizePdfContentMetadata({}, { allowEmpty: true })).toEqual({
      content_type: null, content_category: null, content_subcategory: null, subject: null,
    })
    expect(() => normalizePdfContentMetadata({})).toThrow()
  })
})