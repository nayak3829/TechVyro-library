export type QuizDifficulty = "easy" | "medium" | "hard"

type DifficultyQuestion = {
  question?: unknown
  options?: unknown
  type?: unknown
}

type DifficultyInput = {
  title?: unknown
  description?: unknown
  context?: unknown
  questions?: unknown
}

const EASY_CUES = /\b(easy|basic|beginner|simple|fundamental|introductory|class\s*[1-8])\b/i
const HARD_CUES = /\b(hard|advanced|difficult|tough|expert|high[-\s]?level|olympiad|research|assertion[-\s]?reason|case study)\b/i
const COMPLEX_VERBS = /\b(analy[sz]e|evaluate|derive|prove|justify|calculate|determine|infer|compare|differentiate|integrate|synthesize|critique)\b/i
const SIMPLE_VERBS = /\b(name|identify|define|recall|state|choose|match|true or false)\b/i

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function analyzeQuizDifficulty(input: DifficultyInput): QuizDifficulty {
  const questions = Array.isArray(input.questions)
    ? input.questions.filter((item): item is DifficultyQuestion => Boolean(item) && typeof item === "object")
    : []
  const metadata = [text(input.title), text(input.description), text(input.context)].join(" ")

  if (HARD_CUES.test(metadata)) return "hard"
  if (EASY_CUES.test(metadata)) return "easy"
  if (!questions.length) return "medium"

  let score = 0
  for (const question of questions) {
    const prompt = text(question.question)
    const options = Array.isArray(question.options) ? question.options.map(text).filter(Boolean) : []
    const averageOptionLength = options.length
      ? options.reduce((total, option) => total + option.length, 0) / options.length
      : 0

    if (COMPLEX_VERBS.test(prompt)) score += 2
    if (SIMPLE_VERBS.test(prompt)) score -= 1
    if (prompt.length > 450) score += 2
    else if (prompt.length > 220) score += 1
    else if (prompt.length < 90) score -= 0.5
    if (averageOptionLength > 160) score += 1
    if (question.type === "multiselect") score += 1
    if (question.type === "truefalse") score -= 0.5
  }

  const averageScore = score / questions.length
  if (averageScore >= 1.25) return "hard"
  if (averageScore <= -0.75) return "easy"
  return "medium"
}

export function isQuizDifficulty(value: unknown): value is QuizDifficulty {
  return value === "easy" || value === "medium" || value === "hard"
}