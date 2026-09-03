import { describe, expect, it } from "vitest"

import { analyzeQuizDifficulty, resolveQuizDifficulty } from "@/lib/quiz-difficulty"

describe("quiz difficulty analysis", () => {
  it("classifies short recall questions as easy", () => {
    expect(analyzeQuizDifficulty({
      title: "General Knowledge",
      questions: [
        { question: "Name the capital of India.", options: ["Delhi", "Mumbai"] },
        { question: "Identify the largest ocean.", options: ["Pacific", "Atlantic"] },
      ],
    })).toBe("easy")
  })

  it("classifies long analytical questions as hard", () => {
    expect(analyzeQuizDifficulty({
      title: "Physics Practice",
      questions: [
        {
          question: `Analyze the following experimental situation and derive the relationship between the measured quantities. ${"Detailed conditions ".repeat(30)}`,
          options: ["Relationship A", "Relationship B", "Relationship C"],
        },
        {
          type: "multiselect",
          question: "Evaluate each statement and determine every conclusion that must follow.",
          options: ["Conclusion one", "Conclusion two", "Conclusion three"],
        },
      ],
    })).toBe("hard")
  })

  it("uses explicit level cues when the source provides them", () => {
    expect(analyzeQuizDifficulty({
      title: "Advanced Mathematics Mock Test",
      questions: [{ question: "What is 2 + 2?", options: ["3", "4"] }],
    })).toBe("hard")
  })

  it("uses medium when the evidence is mixed", () => {
    expect(analyzeQuizDifficulty({
      title: "Science Quiz",
      questions: [{
        question: "Which statement best explains this scientific observation?",
        options: ["Statement one", "Statement two", "Statement three"],
      }],
    })).toBe("medium")
  })

  it("preserves analyzed levels for bulk Auto and applies explicit overrides", () => {
    expect(resolveQuizDifficulty("easy", "auto")).toBe("easy")
    expect(resolveQuizDifficulty("hard", "auto")).toBe("hard")
    expect(resolveQuizDifficulty("easy", "hard")).toBe("hard")
  })
})