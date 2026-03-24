import { NextResponse } from "next/server"
import { getSampleQuestions, getAllSampleSeries, getSampleSeriesForCategory, mapUrlToCategory } from "@/lib/sample-tests"

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 3000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return res
  } catch (e) {
    clearTimeout(id)
    throw e
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim()
}

interface AppXQuestion {
  id?: string | number
  question?: string
  title?: string
  question_title?: string
  options?: Array<{ option?: string; text?: string; optionKey?: string; id?: number; value?: string }>
  answer?: string | number
  correct_option?: string | number
  correct?: string | number
  correct_answer?: string | number
  solution?: string
  explanation?: string
  marks?: number
  negative_marks?: number
}

interface NormalizedQuestion {
  qid: string
  question: string
  options: string[]
  correct: number
  marks: number
  explanation: string
}

function normalizeQuestion(q: AppXQuestion, idx: number): NormalizedQuestion | null {
  try {
    const questionText = stripHtml(String(q.question || q.title || q.question_title || ""))
    if (!questionText || questionText.length < 2) return null

    const rawOptions = q.options || []
    const options = rawOptions.map((o) =>
      stripHtml(String(o.option || o.text || o.value || ""))
    ).filter(o => o.length > 0)

    if (options.length < 2) return null

    let correctIdx = 0
    const rawAnswer = q.answer ?? q.correct_answer ?? q.correct_option ?? q.correct

    if (typeof rawAnswer === "number") {
      correctIdx = rawAnswer > options.length ? rawAnswer - 1 : rawAnswer
    } else if (typeof rawAnswer === "string") {
      const letter = rawAnswer.toLowerCase().trim()
      if (["a", "b", "c", "d", "e"].includes(letter)) {
        correctIdx = letter.charCodeAt(0) - "a".charCodeAt(0)
      } else {
        const num = parseInt(letter)
        if (!isNaN(num)) correctIdx = num > options.length ? num - 1 : num
      }
    }

    if (rawOptions.length > 0 && typeof rawAnswer === "string") {
      const matchIdx = rawOptions.findIndex(
        (o) => o.optionKey === rawAnswer || String(o.id) === String(rawAnswer)
      )
      if (matchIdx >= 0) correctIdx = matchIdx
    }

    correctIdx = Math.max(0, Math.min(correctIdx, options.length - 1))

    return {
      qid: String(q.id || idx + 1),
      question: questionText,
      options,
      correct: correctIdx,
      marks: q.marks ?? 1,
      explanation: stripHtml(String(q.solution || q.explanation || "")),
    }
  } catch {
    return null
  }
}

function findQuestions(data: unknown, depth = 0): unknown[] {
  if (depth > 6 || !data) return []

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>
    if (typeof first === "object" && first !== null) {
      if ("question" in first || "options" in first || "question_title" in first) return data
    }
    for (const item of data) {
      const found = findQuestions(item, depth + 1)
      if (found.length > 0) return found
    }
  }

  if (typeof data === "object" && data !== null) {
    for (const key of ["questions", "data", "results", "items", "content", "tests"]) {
      const val = (data as Record<string, unknown>)[key]
      if (Array.isArray(val) && val.length > 0) {
        const found = findQuestions(val, depth + 1)
        if (found.length > 0) return found
      }
    }
    for (const val of Object.values(data as object)) {
      if (typeof val === "object" && val !== null) {
        const found = findQuestions(val, depth + 1)
        if (found.length > 0) return found
      }
    }
  }
  return []
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const testId = searchParams.get("testId")
  const apiBase = searchParams.get("apiBase")

  if (!testId || !apiBase) {
    return NextResponse.json({ error: "testId and apiBase required" }, { status: 400 })
  }

  // Short-circuit: sample tests — skip all live API calls
  if (apiBase.startsWith("sample:")) {
    const sampleQ = getSampleQuestions(testId)
    if (sampleQ && sampleQ.length > 0) {
      return NextResponse.json({ success: true, questions: sampleQ, total: sampleQ.length })
    }
    for (const series of getAllSampleSeries()) {
      const matched = series.tests.find(t => t.id === testId)
      if (matched) {
        return NextResponse.json({ success: true, questions: matched.questions, total: matched.questions.length })
      }
    }
    return NextResponse.json({ error: "Sample test not found", testId }, { status: 404 })
  }

  const errors: string[] = []

  const endpoints = [
    `${apiBase}/api/v1/test/${testId}/questions/?format=json`,
    `${apiBase}/api/v1/test/${testId}/questions/`,
    `${apiBase}/api/v1/tests/${testId}/questions/?format=json`,
    `${apiBase}/api/v1/tests/${testId}/questions/`,
    `${apiBase}/api/v1/test-series/test/${testId}/questions/?format=json`,
    `${apiBase}/api/v2/test/${testId}/questions/?format=json`,
    `${apiBase}/api/v1/quiz/${testId}/questions/?format=json`,
  ]

  const tryQuestionEndpoint = async (endpoint: string): Promise<NormalizedQuestion[] | null> => {
    try {
      const res = await fetchWithTimeout(endpoint, { headers: HEADERS }, 3000)
      if (!res.ok) { errors.push(`${endpoint}: HTTP ${res.status}`); return null }
      const text = await res.text()
      let json: unknown
      try { json = JSON.parse(text) } catch { return null }
      const rawQuestions = findQuestions(json)
      if (rawQuestions.length > 0) {
        const questions = rawQuestions.map((q, i) => normalizeQuestion(q as AppXQuestion, i)).filter(Boolean) as NormalizedQuestion[]
        return questions.length > 0 ? questions : null
      }
      return null
    } catch (e) {
      errors.push(`${endpoint}: ${e instanceof Error ? e.message : "timeout"}`)
      return null
    }
  }

  const questionResults = await Promise.allSettled(endpoints.map(tryQuestionEndpoint))
  for (const result of questionResults) {
    if (result.status === "fulfilled" && result.value) {
      return NextResponse.json({ success: true, questions: result.value, total: result.value.length })
    }
  }

  // Check if this is a sample test ID
  const sampleQuestions = getSampleQuestions(testId)
  if (sampleQuestions && sampleQuestions.length > 0) {
    return NextResponse.json({ success: true, questions: sampleQuestions, total: sampleQuestions.length })
  }

  // Also try matching by slug — find a test in sample series
  for (const series of getAllSampleSeries()) {
    const matchedTest = series.tests.find(t => t.id === testId || t.id.includes(testId) || testId.includes(t.id))
    if (matchedTest) {
      return NextResponse.json({ success: true, questions: matchedTest.questions, total: matchedTest.questions.length })
    }
  }

  // Last resort: category-based sample fallback (live test that requires auth)
  const category = mapUrlToCategory(apiBase)
  const categorySeries = getSampleSeriesForCategory(category)
  const fallbackSeries = categorySeries.length > 0 ? categorySeries[0] : getAllSampleSeries()[0]
  if (fallbackSeries && fallbackSeries.tests.length > 0) {
    const fallbackTest = fallbackSeries.tests[0]
    return NextResponse.json({
      success: true,
      questions: fallbackTest.questions,
      total: fallbackTest.questions.length,
      notice: "Showing sample practice questions.",
    })
  }

  return NextResponse.json({
    error: "Could not load questions for this test.",
    debug: errors.slice(0, 4),
  }, { status: 404 })
}
