import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { isValidStructureLocation, validateContentStructure } from "@/lib/content-structure-validation"
import { validateQuizPayload } from "@/lib/quiz-validation"

const validQuestion = {
  id: "question-1",
  type: "mcq",
  question: "  Which option is correct?  ",
  options: [" First ", "Second"],
  correct: 1,
  marks: 2,
  negativeMarks: 0.5,
  timeLimit: 30,
}

const validStructure = [
  {
    id: "folder-1",
    name: "  Exams ",
    categories: [
      {
        id: "category-1",
        name: "  Science ",
        sections: [{ id: "section-1", name: " Physics " }],
      },
    ],
  },
]

describe("quiz payload validation", () => {
  it("normalizes a valid complete quiz payload", () => {
    const result = validateQuizPayload({
      id: "quiz_2025-01",
      title: "  Practice Quiz  ",
      description: "  A description  ",
      category: "  Science ",
      section: " Physics ",
      timeLimit: "900",
      questions: [validQuestion],
      enabled: false,
      tags: [" Science ", "", 42, "physics"],
      visibility: "unlisted",
      difficulty: "hard",
      structureLocation: { folderId: "folder-1", categoryId: "category-1", sectionId: "section-1" },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        id: "quiz_2025-01",
        title: "Practice Quiz",
        description: "A description",
        category: "Science",
        section: "Physics",
        time_limit: 900,
        questions: [{
          id: "question-1",
          type: "mcq",
          question: "Which option is correct?",
          options: ["First", "Second"],
          correct: 1,
          correctOptions: [],
          marks: 2,
          negativeMarks: 0.5,
          explanation: "",
          timeLimit: 30,
        }],
        enabled: false,
        tags: ["Science", "physics"],
        visibility: "unlisted",
        difficulty: "hard",
        negative_marking: 0,
        passing_percentage: 0,
        shuffle_questions: false,
        shuffle_options: false,
        structure_location: { folderId: "folder-1", categoryId: "category-1", sectionId: "section-1" },
      },
    })
  })

  it.each([
    [{ ...validQuestion, correct: 3 }, "invalid correct answer"],
    [{ ...validQuestion, options: ["only one"] }, "must have 2 to 8 options"],
    [{ ...validQuestion, type: "multiselect", correctOptions: [0] }, "invalid correct options"],
  ])("rejects invalid question data: %s", (question, message) => {
    const result = validateQuizPayload({
      id: "quiz-1",
      title: "Quiz",
      questions: [question],
    })

    expect(result).toEqual({ ok: false, error: expect.stringContaining(message) })
  })

  it("rejects an incomplete Content Structure location", () => {
    const result = validateQuizPayload({
      id: "quiz-1",
      title: "Quiz",
      questions: [validQuestion],
      structureLocation: { folderId: "folder-1", categoryId: "", sectionId: "" },
    })

    expect(result).toEqual({ ok: false, error: "Choose a complete folder, category, and section" })
  })

  it("accepts long question, option, and explanation text", () => {
    const result = validateQuizPayload({
      id: "long-question-quiz",
      title: "Long Question Quiz",
      questions: [{
        ...validQuestion,
        question: "Q".repeat(12_000),
        options: [`A${"x".repeat(3_000)}`, `B${"y".repeat(3_000)}`],
        explanation: "E".repeat(20_000),
      }],
    })

    expect(result).toMatchObject({
      ok: true,
      data: {
        questions: [{
          question: "Q".repeat(12_000),
          explanation: "E".repeat(20_000),
        }],
      },
    })
  })

  it("rejects empty quizzes and duplicate question IDs while safely collapsing duplicate options", () => {
    expect(validateQuizPayload({ id: "quiz-1", title: "Quiz", questions: [] }))
      .toEqual({ ok: false, error: expect.stringContaining("between 1 and 500") })

    expect(validateQuizPayload({
      id: "quiz-1",
      title: "Quiz",
      questions: [validQuestion, { ...validQuestion }],
    })).toEqual({ ok: false, error: expect.stringContaining("duplicate ID") })

    const duplicateOptions = validateQuizPayload({
      id: "quiz-1",
      title: "Quiz",
      questions: [{
        ...validQuestion,
        options: ["First", " Second ", " second ", "Third"],
        correct: 3,
      }],
    })
    expect(duplicateOptions).toMatchObject({
      ok: true,
      data: {
        questions: [{
          options: ["First", "Second", "Third"],
          correct: 2,
        }],
      },
    })

    expect(validateQuizPayload({
      id: "quiz-1",
      title: "Quiz",
      questions: [{ ...validQuestion, options: ["Same", " same "] }],
    })).toEqual({ ok: false, error: expect.stringContaining("at least 2 distinct options") })
  })

  it.each([
    [{ id: "../quiz", title: "Quiz", questions: [] }, "Quiz ID is invalid"],
    [{ id: "quiz-1", title: " ", questions: [] }, "Title is required"],
    [{ id: "quiz-1", title: "Quiz", timeLimit: 59, questions: [] }, "Time limit must be between"],
    [{ id: "quiz-1", title: "Quiz", visibility: "friends", questions: [] }, "Visibility is invalid"],
  ])("rejects invalid quiz fields", (payload, message) => {
    expect(validateQuizPayload(payload)).toEqual({ ok: false, error: expect.stringContaining(message) })
  })
})

describe("content structure validation", () => {
  it("normalizes a valid hierarchy and recognizes its location", () => {
    const result = validateContentStructure(validStructure)

    expect(result).toMatchObject({
      ok: true,
      folders: [{
        id: "folder-1",
        name: "Exams",
        categories: [{
          id: "category-1",
          name: "Science",
          color: "#6366f1",
          sections: [{ id: "section-1", name: "Physics" }],
        }],
      }],
    })
    if (!result.ok) throw new Error(result.error)

    expect(isValidStructureLocation(
      { folderId: "folder-1", categoryId: "category-1", sectionId: "section-1" },
      result.folders,
    )).toBe(true)
    expect(isValidStructureLocation(
      { folderId: "folder-1", categoryId: "category-1", sectionId: "other-section" },
      result.folders,
    )).toBe(false)
  })

  it("rejects duplicate IDs and duplicate sibling names", () => {
    const duplicateId = structuredClone(validStructure)
    duplicateId[0].categories[0].sections[0].id = "folder-1"
    expect(validateContentStructure(duplicateId)).toEqual({
      ok: false,
      error: "Duplicate content structure ID: folder-1",
    })

    const duplicateName = structuredClone(validStructure)
    duplicateName[0].categories.push({
      id: "category-2",
      name: "science",
      sections: [],
    })
    expect(validateContentStructure(duplicateName)).toEqual({
      ok: false,
      error: "Duplicate category in Exams: science",
    })
  })

  it("rejects invalid hierarchy shapes and invalid color values", () => {
    expect(validateContentStructure([{ id: "folder-1", name: "Exams", categories: {} }])).toEqual({
      ok: false,
      error: "Exams categories are invalid",
    })
    expect(validateContentStructure([{ ...validStructure[0], color: "blue" }])).toEqual({
      ok: false,
      error: "Exams color must be a 6-digit hex color",
    })
  })
})

describe("quiz HTML route in sample mode", () => {
  it("requires authentication even for sample HTML", async () => {
    const title = "</title><script>window.injected=1</script>"
    const seriesTitle = "<img src=x onerror=window.injected=2>"
    const query = new URLSearchParams({
      apiBase: "sample:",
      title,
      seriesTitle,
      duration: "301",
    })

    const { GET: quizHtml } = await import("@/app/api/quiz-html/route")
    const response = await quizHtml(new NextRequest(`https://example.test/api/quiz-html?${query}`))

    expect(response.status).toBe(401)
  })
})