export interface QuizProgressSnapshot {
  quizId: string
  title: string
  currentIndex: number
  answers: Record<number, number>
  marked: boolean[]
  visited: boolean[]
  questionTimes: number[]
  timeRemaining: number
  totalQuestions: number
  updatedAt: string
}

const QUIZ_PROGRESS_PREFIX = "techvyro_quiz_progress"
const MAX_SAVED_QUIZZES = 20

function storageKey(userId: string) {
  return `${QUIZ_PROGRESS_PREFIX}:${userId}`
}

function asNonNegativeInteger(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : fallback
}

function normalizeSnapshot(value: unknown): QuizProgressSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.quizId !== "string"
    || typeof candidate.title !== "string"
    || typeof candidate.updatedAt !== "string"
  ) return null

  const totalQuestions = asNonNegativeInteger(candidate.totalQuestions)
  if (totalQuestions === 0) return null

  const rawAnswers = candidate.answers && typeof candidate.answers === "object" && !Array.isArray(candidate.answers)
    ? candidate.answers as Record<string, unknown>
    : {}
  const answers = Object.fromEntries(
    Object.entries(rawAnswers)
      .map(([index, answer]) => [Number(index), asNonNegativeInteger(answer, -1)] as const)
      .filter(([index, answer]) => Number.isSafeInteger(index) && index >= 0 && index < totalQuestions && answer >= 0)
  )

  const booleans = (input: unknown) => Array.isArray(input)
    ? input.slice(0, totalQuestions).map(Boolean)
    : []
  const times = Array.isArray(candidate.questionTimes)
    ? candidate.questionTimes.slice(0, totalQuestions).map(value => asNonNegativeInteger(value))
    : []

  return {
    quizId: candidate.quizId,
    title: candidate.title,
    currentIndex: Math.min(asNonNegativeInteger(candidate.currentIndex), totalQuestions - 1),
    answers,
    marked: booleans(candidate.marked),
    visited: booleans(candidate.visited),
    questionTimes: times,
    timeRemaining: asNonNegativeInteger(candidate.timeRemaining),
    totalQuestions,
    updatedAt: candidate.updatedAt,
  }
}

export function getQuizProgress(userId: string): QuizProgressSnapshot[] {
  if (typeof window === "undefined" || !userId) return []
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]")
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeSnapshot)
      .filter((item): item is QuizProgressSnapshot => item !== null)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  } catch {
    return []
  }
}

export function saveQuizProgress(userId: string, snapshot: QuizProgressSnapshot) {
  if (typeof window === "undefined" || !userId) return
  const normalized = normalizeSnapshot(snapshot)
  if (!normalized) return
  const next = [
    normalized,
    ...getQuizProgress(userId).filter(item => item.quizId !== normalized.quizId),
  ].slice(0, MAX_SAVED_QUIZZES)
  localStorage.setItem(storageKey(userId), JSON.stringify(next))
}

export function clearQuizProgress(userId: string, quizId: string) {
  if (typeof window === "undefined" || !userId || !quizId) return
  const remaining = getQuizProgress(userId).filter(item => item.quizId !== quizId)
  localStorage.setItem(storageKey(userId), JSON.stringify(remaining))
}