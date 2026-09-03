const QUIZ_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/
const VISIBILITIES = new Set(["public", "unlisted", "private"])
const DIFFICULTIES = new Set(["easy", "medium", "hard"])
const QUESTION_TYPES = new Set(["mcq", "truefalse", "multiselect"])
const STRUCTURE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/

type ValidationResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string }

function boundedText(value: unknown, field: string, max: number | undefined, required = false): string {
  if (value === undefined || value === null) {
    if (required) throw new Error(`${field} is required`)
    return ""
  }
  if (typeof value !== "string") throw new Error(`${field} must be text`)
  const normalized = value.trim()
  if (required && !normalized) throw new Error(`${field} is required`)
  if (max !== undefined && normalized.length > max) throw new Error(`${field} is too long`)
  return normalized
}

function normalizeQuestions(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 500) {
    throw new Error("questions must contain between 1 and 500 items")
  }
  const questionIds = new Set<string>()
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Question ${index + 1} is invalid`)
    const q = raw as Record<string, unknown>
    const type = typeof q.type === "string" && QUESTION_TYPES.has(q.type) ? q.type : "mcq"
    const question = boundedText(q.question, `Question ${index + 1}`, undefined, true)
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 8) {
      throw new Error(`Question ${index + 1} must have 2 to 8 options`)
    }
    const parsedOptions = q.options.map((option, optionIndex) =>
      boundedText(option, `Question ${index + 1} option ${optionIndex + 1}`, undefined, true)
    )
    const options: string[] = []
    const optionIndexMap = new Map<number, number>()
    const uniqueOptionIndexes = new Map<string, number>()
    parsedOptions.forEach((option, optionIndex) => {
      const key = option.toLocaleLowerCase()
      let normalizedIndex = uniqueOptionIndexes.get(key)
      if (normalizedIndex === undefined) {
        options.push(option)
        normalizedIndex = options.length
        uniqueOptionIndexes.set(key, normalizedIndex)
      }
      optionIndexMap.set(optionIndex + 1, normalizedIndex)
    })
    if (options.length < 2) {
      throw new Error(`Question ${index + 1} must have at least 2 distinct options`)
    }
    const originalCorrect = Number(q.correct ?? 1)
    const correct = optionIndexMap.get(originalCorrect) ?? originalCorrect
    const correctOptions = Array.isArray(q.correctOptions)
      ? [...new Set(q.correctOptions.map(Number).map((item) => optionIndexMap.get(item) ?? item))]
      : []
    if (type === "multiselect") {
      if (!correctOptions.length || correctOptions.some((item) => !Number.isInteger(item) || item < 1 || item > options.length)) {
        throw new Error(`Question ${index + 1} has invalid correct options`)
      }
    } else if (!Number.isInteger(correct) || correct < 1 || correct > options.length) {
      throw new Error(`Question ${index + 1} has an invalid correct answer`)
    }
    const marks = Number(q.marks ?? 1)
    const negativeMarks = Number(q.negativeMarks ?? 0)
    const timeLimit = Number(q.timeLimit ?? 0)
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) throw new Error(`Question ${index + 1} has invalid marks`)
    if (!Number.isFinite(negativeMarks) || negativeMarks < 0 || negativeMarks > 100) throw new Error(`Question ${index + 1} has invalid negative marks`)
    if (!Number.isInteger(timeLimit) || timeLimit < 0 || timeLimit > 10800) throw new Error(`Question ${index + 1} has an invalid time limit`)
    const id = boundedText(q.id ?? `q-${index + 1}`, `Question ${index + 1} ID`, 100, true)
    if (questionIds.has(id)) throw new Error(`Question ${index + 1} has a duplicate ID`)
    questionIds.add(id)
    return {
      id,
      type,
      question,
      options,
      correct,
      correctOptions,
      marks,
      negativeMarks,
      explanation: boundedText(q.explanation, `Question ${index + 1} explanation`, undefined),
      timeLimit,
    }
  })
}

export function validateQuizPayload(value: unknown, partial = false): ValidationResult {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("A valid request body is required")
    const input = value as Record<string, unknown>
    const output: Record<string, unknown> = {}
    if (!partial || input.id !== undefined) {
      if (typeof input.id !== "string" || !QUIZ_ID.test(input.id)) throw new Error("Quiz ID is invalid")
      output.id = input.id
    }
    if (!partial || input.title !== undefined) output.title = boundedText(input.title, "Title", 200, true)
    if (!partial || input.description !== undefined) output.description = boundedText(input.description, "Description", 2000)
    if (!partial || input.category !== undefined) output.category = boundedText(input.category ?? "General", "Category", 80, true)
    if (!partial || input.section !== undefined) output.section = boundedText(input.section ?? "General", "Section", 80, true)
    if (!partial || input.timeLimit !== undefined) {
      const timeLimit = Number(input.timeLimit ?? 1200)
      if (!Number.isInteger(timeLimit) || timeLimit < 60 || timeLimit > 10800) throw new Error("Time limit must be between 60 and 10800 seconds")
      output.time_limit = timeLimit
    }
    if (!partial || input.enabled !== undefined) {
      if (typeof (input.enabled ?? true) !== "boolean") throw new Error("Enabled must be true or false")
      output.enabled = input.enabled ?? true
    }
    if (!partial || input.tags !== undefined) {
      if (!Array.isArray(input.tags ?? [])) throw new Error("Tags must be an array")
      output.tags = (input.tags as unknown[] ?? []).filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim()).filter(Boolean).slice(0, 20)
    }
    if (!partial || input.visibility !== undefined) {
      const visibility = input.visibility ?? "public"
      if (typeof visibility !== "string" || !VISIBILITIES.has(visibility)) throw new Error("Visibility is invalid")
      output.visibility = visibility
    }
    if (!partial || input.difficulty !== undefined) {
      const difficulty = input.difficulty ?? "medium"
      if (typeof difficulty !== "string" || !DIFFICULTIES.has(difficulty)) throw new Error("Difficulty is invalid")
      output.difficulty = difficulty
    }
    if (!partial || input.questions !== undefined) output.questions = normalizeQuestions(input.questions ?? [])
    if (!partial || input.negativeMarking !== undefined) {
      const value = Number(input.negativeMarking ?? 0)
      if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error("Negative marking must be between 0 and 100")
      output.negative_marking = value
    }
    if (!partial || input.passingPercentage !== undefined) {
      const value = Number(input.passingPercentage ?? 0)
      if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error("Passing percentage must be between 0 and 100")
      output.passing_percentage = value
    }
    for (const [requestField, databaseField] of [
      ["shuffleQuestions", "shuffle_questions"],
      ["shuffleOptions", "shuffle_options"],
    ] as const) {
      if (!partial || input[requestField] !== undefined) {
        const value = input[requestField] ?? false
        if (typeof value !== "boolean") throw new Error(`${requestField} must be true or false`)
        output[databaseField] = value
      }
    }
    if (!partial || input.structureLocation !== undefined) {
      const location = input.structureLocation
      if (location === undefined || location === null) {
        output.structure_location = null
      } else {
        if (!location || typeof location !== "object" || Array.isArray(location)) {
          throw new Error("Content structure location is invalid")
        }
        const candidate = location as Record<string, unknown>
        const parts = [candidate.folderId, candidate.categoryId, candidate.sectionId]
        if (!parts.every((part) => typeof part === "string" && STRUCTURE_ID.test(part))) {
          throw new Error("Choose a complete folder, category, and section")
        }
        output.structure_location = {
          folderId: candidate.folderId,
          categoryId: candidate.categoryId,
          sectionId: candidate.sectionId,
        }
      }
    }
    if (partial && Object.keys(output).length === 0) throw new Error("No valid fields to update")
    return { ok: true, data: output }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid quiz" }
  }
}