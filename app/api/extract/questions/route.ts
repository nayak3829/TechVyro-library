import { NextResponse } from "next/server"
import type { SampleQuestion, SampleSeries } from "@/lib/sample-tests"
import { createClient } from "@/lib/supabase/server"
import {
  fetchWithTimeout as fetchTrustedQuizApi,
  readLimitedText,
  validatePublicHttpsUrl,
} from "@/lib/quiz-remote-fetch"

// Lazy load sample test helpers only when needed (saves ~215KB from initial bundle)
async function loadSampleHelpers() {
  const module = await import("@/lib/sample-tests")
  return {
    getSampleQuestions: module.getSampleQuestions,
    getAllSampleSeries: module.getAllSampleSeries,
    getSampleSeriesForCategory: module.getSampleSeriesForCategory,
    mapUrlToCategory: module.mapUrlToCategory,
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
    const questionText = stripHtml(String(q.question || q.title || q.question_title || "")).slice(0, 10_000)
    if (!questionText || questionText.length < 2) return null

    const rawOptions = (q.options || []).slice(0, 10)
    const optionEntries = rawOptions
      .map((option, rawIndex) => ({
        rawIndex,
        option,
        text: stripHtml(String(option.option || option.text || option.value || "")).slice(0, 2_000),
      }))
      .filter(({ text }) => text.length > 0)
    const options = optionEntries.map(({ text }) => text)

    if (options.length < 2) return null

    const rawAnswer = q.answer ?? q.correct_answer ?? q.correct_option ?? q.correct
    if (rawAnswer === undefined || rawAnswer === null) return null

    const answerText = String(rawAnswer).trim()
    let rawCorrectIndex = rawOptions.findIndex((option) =>
      (option.optionKey !== undefined && option.optionKey.toLowerCase() === answerText.toLowerCase()) ||
      (option.id !== undefined && String(option.id) === answerText),
    )
    if (rawCorrectIndex < 0 && /^[a-j]$/i.test(answerText)) {
      rawCorrectIndex = answerText.toLowerCase().charCodeAt(0) - "a".charCodeAt(0)
    }
    if (rawCorrectIndex < 0 && /^\d+$/.test(answerText)) {
      const numericAnswer = Number(answerText)
      rawCorrectIndex = numericAnswer === 0 ? 0 : numericAnswer - 1
    }

    const correctIdx = optionEntries.findIndex(({ rawIndex }) => rawIndex === rawCorrectIndex)
    if (correctIdx < 0) return null

    return {
      qid: String(q.id || idx + 1),
      question: questionText,
      options,
      correct: correctIdx + 1,
      marks: typeof q.marks === "number" && Number.isFinite(q.marks) ? Math.max(0, Math.min(q.marks, 100)) : 1,
      explanation: stripHtml(String(q.solution || q.explanation || "")).slice(0, 10_000),
    }
  } catch {
    return null
  }
}

function normalizeSampleQuestions(questions: SampleQuestion[]): SampleQuestion[] {
  return questions.slice(0, 500).map((question) => ({
    ...question,
    correct: question.correct + 1,
  }))
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

export async function GET(request: Request) {
  // This route returns answer keys and explanations, including for sample
  // series. A request parameter is not proof of identity.
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase?.auth.getUser() ?? { data: { user: null }, error: null }
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const testId = searchParams.get("testId")
  const apiBase = searchParams.get("apiBase")

  if (!testId || !apiBase) {
    return NextResponse.json({ error: "testId and apiBase required" }, { status: 400 })
  }
  if (testId.length > 200 || /[\u0000-\u001f]/.test(testId)) {
    return NextResponse.json({ error: "Invalid test identifier" }, { status: 400 })
  }

  // Short-circuit: sample tests — skip all live API calls (lazy loaded)
  if (apiBase.startsWith("sample:")) {
    const { getSampleQuestions, getAllSampleSeries, getSampleSeriesForCategory } = await loadSampleHelpers()
    
    // First try direct test ID match
    const sampleQ = getSampleQuestions(testId)
    if (sampleQ && sampleQ.length > 0) {
      const questions = normalizeSampleQuestions(sampleQ)
      return NextResponse.json({ success: true, questions, total: questions.length }, { headers: { "Cache-Control": "no-store" } })
    }
    
    // Find the test or series to get its category for fallback
    let testCategory = "ssc-banking"
    let foundQuestions: SampleQuestion[] | null = null
    
    for (const series of getAllSampleSeries()) {
      // Check if testId matches a test ID
      const matchedTest = series.tests.find(t => t.id === testId)
      if (matchedTest) {
        testCategory = series.category
        if (matchedTest.questions && matchedTest.questions.length > 0) {
          foundQuestions = matchedTest.questions
        }
        break
      }
      
      // Check if testId matches series slug or series ID (clicking on series card)
      if (series.slug === testId || series.id === testId) {
        testCategory = series.category
        // Find first test in this series with questions
        const testWithQuestions = series.tests.find(t => t.questions && t.questions.length > 0)
        if (testWithQuestions) {
          foundQuestions = testWithQuestions.questions
        }
        break
      }
    }
    
    if (foundQuestions && foundQuestions.length > 0) {
      const questions = normalizeSampleQuestions(foundQuestions)
      return NextResponse.json({ success: true, questions, total: questions.length }, { headers: { "Cache-Control": "no-store" } })
    }
    
    // Fallback: get sample questions from same category
    const categorySeries = getSampleSeriesForCategory(testCategory)
    for (const series of categorySeries) {
      for (const test of series.tests) {
        if (test.questions && test.questions.length > 0) {
          return NextResponse.json({ 
            success: true, 
            questions: normalizeSampleQuestions(test.questions),
            total: Math.min(test.questions.length, 500),
            notice: "Showing practice questions from this category."
          }, { headers: { "Cache-Control": "no-store" } })
        }
      }
    }
    
    // Ultimate fallback: get any available sample questions
    for (const series of getAllSampleSeries()) {
      for (const test of series.tests) {
        if (test.questions && test.questions.length > 0) {
          return NextResponse.json({ 
            success: true, 
            questions: normalizeSampleQuestions(test.questions),
            total: Math.min(test.questions.length, 500),
            notice: "Showing sample practice questions."
          }, { headers: { "Cache-Control": "no-store" } })
        }
      }
    }
    
    return NextResponse.json({ error: "No sample questions available", testId }, { status: 404 })
  }

  let safeApiBase: string
  try {
    safeApiBase = (await validatePublicHttpsUrl(apiBase)).toString().replace(/\/$/, "")
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid API URL" },
      { status: 400 },
    )
  }

  const safeTestId = encodeURIComponent(testId)

  const endpoints = [
    `${safeApiBase}/api/v1/test/${safeTestId}/questions/?format=json`,
    `${safeApiBase}/api/v1/test/${safeTestId}/questions/`,
    `${safeApiBase}/api/v1/tests/${safeTestId}/questions/?format=json`,
    `${safeApiBase}/api/v1/tests/${safeTestId}/questions/`,
    `${safeApiBase}/api/v1/test-series/test/${safeTestId}/questions/?format=json`,
    `${safeApiBase}/api/v2/test/${safeTestId}/questions/?format=json`,
    `${safeApiBase}/api/v1/quiz/${safeTestId}/questions/?format=json`,
  ]

  const tryQuestionEndpoint = async (endpoint: string): Promise<NormalizedQuestion[] | null> => {
    try {
      const res = await fetchTrustedQuizApi(endpoint, 3000)
      if (!res.ok) return null
      const contentType = res.headers.get("content-type")?.toLowerCase() || ""
      if (!contentType.includes("application/json")) {
        await res.body?.cancel()
        return null
      }
      const text = await readLimitedText(res)
      let json: unknown
      try { json = JSON.parse(text) } catch { return null }
      const rawQuestions = findQuestions(json).slice(0, 500)
      if (rawQuestions.length > 0) {
        const questions = rawQuestions.map((q, i) => normalizeQuestion(q as AppXQuestion, i)).filter(Boolean) as NormalizedQuestion[]
        return questions.length > 0 ? questions : null
      }
      return null
    } catch {
      return null
    }
  }

  for (let index = 0; index < endpoints.length; index += 2) {
    const questionResults = await Promise.all(endpoints.slice(index, index + 2).map(tryQuestionEndpoint))
    const questions = questionResults.find((result) => result !== null)
    if (questions) {
      return NextResponse.json({ success: true, questions, total: questions.length }, { headers: { "Cache-Control": "no-store" } })
    }
  }

  // Check if this is a sample test ID (lazy load helpers)
  const { getSampleQuestions, getAllSampleSeries, getSampleSeriesForCategory, mapUrlToCategory } = await loadSampleHelpers()
  
  const sampleQuestions = getSampleQuestions(testId)
  if (sampleQuestions && sampleQuestions.length > 0) {
    const questions = normalizeSampleQuestions(sampleQuestions)
    return NextResponse.json({ success: true, questions, total: questions.length }, { headers: { "Cache-Control": "no-store" } })
  }

  // Also try matching by slug — find a test in sample series
  for (const series of getAllSampleSeries()) {
    const matchedTest = series.tests.find(t => t.id === testId || t.id.includes(testId) || testId.includes(t.id))
    if (matchedTest) {
      const questions = normalizeSampleQuestions(matchedTest.questions)
      return NextResponse.json({ success: true, questions, total: questions.length }, { headers: { "Cache-Control": "no-store" } })
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
      questions: normalizeSampleQuestions(fallbackTest.questions),
      total: Math.min(fallbackTest.questions.length, 500),
      notice: "Showing sample practice questions.",
    }, { headers: { "Cache-Control": "no-store" } })
  }

  return NextResponse.json({
    error: "Could not load questions for this test.",
  }, { status: 404 })
}
