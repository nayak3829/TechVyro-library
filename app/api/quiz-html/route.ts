import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import {
  fetchWithTimeout,
  validatePublicHttpsUrl,
} from "@/lib/quiz-remote-fetch"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
const MAX_REMOTE_JSON_BYTES = 2 * 1024 * 1024
const MAX_QUESTIONS = 500

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!)
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() || ""
  if (contentType && !contentType.includes("json")) throw new Error("Quiz API did not return JSON")
  const declaredSize = Number(response.headers.get("content-length") || 0)
  if (declaredSize > MAX_REMOTE_JSON_BYTES) throw new Error("Quiz response is too large")
  const text = await response.text()
  if (Buffer.byteLength(text, "utf8") > MAX_REMOTE_JSON_BYTES) throw new Error("Quiz response is too large")
  return JSON.parse(text)
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

interface RawQuestion {
  id?: string | number
  question?: string
  title?: string
  question_title?: string
  option_1?: string
  option_2?: string
  option_3?: string
  option_4?: string
  option_5?: string
  options?: Array<{ option?: string; text?: string; optionKey?: string }>
  answer?: string | number
  correct_option?: string | number
  correct?: string | number
  correct_answer?: string | number
  positive_marks?: number
  marks?: number
  negative_marks?: number
  solution?: string
  explanation?: string
}

function convertToTemplateFormat(q: RawQuestion, idx: number): Record<string, unknown> {
  const questionText = stripHtml(String(q.question || q.title || q.question_title || `Question ${idx + 1}`))
  
  let opt1 = "", opt2 = "", opt3 = "", opt4 = ""
  
  if (q.option_1 && q.option_2) {
    opt1 = stripHtml(q.option_1)
    opt2 = stripHtml(q.option_2)
    opt3 = stripHtml(q.option_3 || "")
    opt4 = stripHtml(q.option_4 || "")
  } else if (Array.isArray(q.options) && q.options.length >= 2) {
    const opts = q.options.map(o => stripHtml(String(o.option || o.text || "")))
    opt1 = opts[0] || ""
    opt2 = opts[1] || ""
    opt3 = opts[2] || ""
    opt4 = opts[3] || ""
  }

  let correctOption = "1"
  const raw = q.answer ?? q.correct_answer ?? q.correct_option ?? q.correct
  if (typeof raw === "number") {
    correctOption = String(raw > 4 ? raw - 4 : raw)
  } else if (typeof raw === "string") {
    const letter = raw.toLowerCase().trim()
    if (["a", "b", "c", "d"].includes(letter)) {
      correctOption = String(letter.charCodeAt(0) - "a".charCodeAt(0) + 1)
    } else {
      correctOption = raw || "1"
    }
  }

  return {
    id: q.id || idx + 1,
    question: questionText,
    option_1: opt1,
    option_2: opt2,
    option_3: opt3,
    option_4: opt4,
    correct_option: correctOption,
    positive_marks: q.positive_marks ?? q.marks ?? 1,
    negative_marks: q.negative_marks ?? 0.25,
    solution: stripHtml(String(q.solution || q.explanation || "")),
  }
}

function findRawQuestions(data: unknown, depth = 0): RawQuestion[] {
  if (depth > 6 || !data) return []
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>
    if (typeof first === "object" && first !== null) {
      if ("question" in first || "option_1" in first || "options" in first || "question_title" in first) {
        return data as RawQuestion[]
      }
    }
    for (const item of data) {
      const found = findRawQuestions(item, depth + 1)
      if (found.length > 0) return found
    }
  }
  if (typeof data === "object" && data !== null) {
    for (const key of ["questions", "data", "results", "items", "content"]) {
      const val = (data as Record<string, unknown>)[key]
      if (Array.isArray(val) && val.length > 0) {
        const found = findRawQuestions(val, depth + 1)
        if (found.length > 0) return found
      }
    }
    for (const val of Object.values(data as object)) {
      if (typeof val === "object" && val !== null) {
        const found = findRawQuestions(val, depth + 1)
        if (found.length > 0) return found
      }
    }
  }
  return []
}

function getSampleQuestions(count = 25): Record<string, unknown>[] {
  const topics = ["General Knowledge", "Mathematics", "English", "Reasoning", "Current Affairs"]
  const questions: Record<string, unknown>[] = []
  for (let i = 0; i < count; i++) {
    const topic = topics[i % topics.length]
    questions.push({
      id: i + 1,
      question: `${topic} Practice Question ${i + 1}: Select the correct answer from the options below.`,
      option_1: "Option A - First choice",
      option_2: "Option B - Second choice",
      option_3: "Option C - Third choice",
      option_4: "Option D - Fourth choice",
      correct_option: "1",
      positive_marks: 1,
      negative_marks: 0.25,
      solution: "This is a sample practice question. The correct answer is Option A.",
    })
  }
  return questions
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase?.auth.getUser() ?? { data: { user: null }, error: null }
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const testId = searchParams.get("testId") || ""
  const apiBase = searchParams.get("apiBase") || ""
  const title = searchParams.get("title") || "Mock Test"
  const seriesTitle = searchParams.get("seriesTitle") || "Practice Test Series"
  const duration = parseInt(searchParams.get("duration") || "60")

  let questions: Record<string, unknown>[] = []
  let source = "sample"

  if (apiBase && !apiBase.startsWith("sample:") && testId) {
    let safeApiBase: string
    try {
      safeApiBase = (await validatePublicHttpsUrl(apiBase)).toString().replace(/\/$/, "")
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid API URL" },
        { status: 400 }
      )
    }

    const endpoints = [
      `${safeApiBase}/api/v1/test/${encodeURIComponent(testId)}/questions/?format=json`,
      `${safeApiBase}/api/v1/test/${encodeURIComponent(testId)}/questions/`,
      `${safeApiBase}/api/v1/tests/${encodeURIComponent(testId)}/questions/?format=json`,
      `${safeApiBase}/api/v2/test/${encodeURIComponent(testId)}/questions/?format=json`,
    ]

    for (const endpoint of endpoints) {
      try {
        const res = await fetchWithTimeout(endpoint)
        if (res.ok) {
            const json = await readBoundedJson(res)
          const raw = findRawQuestions(json)
          if (raw.length > 0) {
            questions = raw.slice(0, MAX_QUESTIONS).map((q, i) => convertToTemplateFormat(q, i))
            source = "live"
            break
          }
        }
      } catch {
        continue
      }
    }
  }

  if (questions.length === 0) {
    questions = getSampleQuestions(25)
    source = "sample"
  }

  const templatePath = path.join(process.cwd(), "public", "quiz-template.html")
  let template = ""
  try {
    template = fs.readFileSync(templatePath, "utf8")
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 500 })
  }

  const safeTitle = escapeHtml(title.slice(0, 200))
  const safeSeriesTitle = escapeHtml(seriesTitle.slice(0, 200))
  const safeDuration = Number.isInteger(duration) && duration >= 1 && duration <= 300 ? duration : 60
  const jsonData = JSON.stringify(questions).replace(/</g, "\\u003c").replace(/>/g, "\\u003e")
  let html = template
    .replace(/\{test_name\}/g, safeTitle)
    .replace(/\{test_series_name\}/g, safeSeriesTitle)
    .replace(/\{website_url\}/g, "TechVyro")
    .replace(/\{json_data\}/g, jsonData)
    .replace(/\{test_time\}/g, String(safeDuration))

  html = html.replace(
    /<div class="modal-backdrop/g,
    '<div style="display:none" class="modal-backdrop-hidden'
  )
  const joinModalMatch = html.match(/joinChannelModal[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/m)
  if (joinModalMatch) {
    html = html.replace(joinModalMatch[0], "")
  }
  html = html.replace(/joinChannelModal/g, "devNull")
  html = html.replace(
    /setTimeout\([^)]*joinChannelModal[^)]*\)/g,
    "setTimeout(function(){})"
  )

  const meta = `<!-- source:${source} questions:${questions.length} -->\n`
  html = html.replace("<!DOCTYPE html>", `<!DOCTYPE html>\n${meta}`)

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Source": source,
      "X-Questions": String(questions.length),
    },
  })
}
