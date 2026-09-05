import { NextResponse } from "next/server"
import type { SampleSeries } from "@/lib/sample-tests"
import {
  fetchWithTimeout as fetchTrustedQuizApi,
  readLimitedText,
  validatePublicHttpsUrl,
} from "@/lib/quiz-remote-fetch"

// Lazy load sample tests only when needed (saves ~215KB from initial bundle)
async function getSampleSeries(): Promise<SampleSeries[]> {
  const { SAMPLE_SERIES } = await import("@/lib/sample-tests")
  return SAMPLE_SERIES
}

// Clean subject/folder names to remove platform identifiers
function cleanSubjectName(name: string): string {
  // Remove common platform patterns
  const patterns = [
    /\s*by\s+\w+/gi,
    /\s*-\s*\w+\s*(academy|classes|institute)?$/gi,
    /\(\w+\)/gi,
  ]
  let cleaned = name
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "")
  }
  return cleaned.trim() || name
}

// Clean and normalize test data
function cleanTestData(tests: unknown[]): unknown[] {
  return tests.slice(0, 500).map((t, idx) => {
    const test = t as Record<string, unknown>
    return {
      id: String(test.id ?? test.slug ?? `test-${idx}`).slice(0, 200),
      title: cleanSubjectName(String(test.title ?? test.name ?? `Test ${idx + 1}`)).slice(0, 300),
      slug: String(test.slug ?? test.id ?? idx).slice(0, 200),
      duration: test.duration ?? test.time ?? 60,
      total_questions: test.total_questions ?? test.question_count ?? test.totalQuestions ?? 25,
      total_marks: test.total_marks ?? test.marks ?? 100,
      is_free: test.is_free ?? true,
    }
  })
}

// Clean subjects data
function cleanSubjectsData(subjects: unknown[]): unknown[] {
  return subjects.slice(0, 100).map((s, idx) => {
    const subj = s as Record<string, unknown>
    const tests = subj.tests ? cleanTestData(subj.tests as unknown[]) : []
    return {
      id: subj.id || `subject-${idx}`,
      name: cleanSubjectName(String(subj.name ?? subj.title ?? `Subject ${idx + 1}`)).slice(0, 200),
      tests,
    }
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get("slug")
  const apiBase = searchParams.get("apiBase")
  const webBase = searchParams.get("webBase")

  if (!slug || !apiBase) {
    return NextResponse.json({ error: "slug and apiBase required" }, { status: 400 })
  }
  if (slug.length > 200 || /[\u0000-\u001f]/.test(slug)) {
    return NextResponse.json({ error: "Invalid series identifier" }, { status: 400 })
  }

  // Handle sample series (lazy loaded)
  if (apiBase.startsWith("sample:")) {
    const SAMPLE_SERIES = await getSampleSeries()
    const series = SAMPLE_SERIES.find(s => s.slug === slug || s.id === slug)
    if (series) {
      const subjects = [{
        id: series.id,
        name: series.title,
        tests: series.tests.map(t => ({
          id: t.id,
          title: t.title,
          duration: t.duration,
          total_questions: t.total_questions,
          is_free: true,
        }))
      }]
      return NextResponse.json({ success: true, subjects, tests: [], source: "sample" })
    }
    return NextResponse.json({ error: "Sample series not found" }, { status: 404 })
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
  const safeSlug = encodeURIComponent(slug)

  // Try API endpoints
  const apiEndpoints = [
    `${safeApiBase}/api/v1/test-series/${safeSlug}/?format=json`,
    `${safeApiBase}/api/v1/test-series/${safeSlug}/`,
    `${safeApiBase}/api/v2/test-series/${safeSlug}/?format=json`,
  ]

  const tryApiEndpoint = async (endpoint: string) => {
    try {
      const res = await fetchTrustedQuizApi(endpoint, 10000)
      if (res.ok) {
        const contentType = res.headers.get("content-type")?.toLowerCase() || ""
        if (!contentType.includes("application/json")) {
          await res.body?.cancel()
          return null
        }
        const json = JSON.parse(await readLimitedText(res))
        const subjects = cleanSubjectsData(findSubjects(json))
        const tests = cleanTestData(findTests(json))
        if (subjects.length > 0 || tests.length > 0) {
          return { subjects, tests }
        }
      }
    } catch {
      // Another endpoint may still provide the series.
    }
    return null
  }

  const apiResults = await Promise.all(apiEndpoints.slice(0, 2).map(tryApiEndpoint))
  if (!apiResults.some(Boolean)) apiResults.push(await tryApiEndpoint(apiEndpoints[2]))
  const apiResult = apiResults.find(result => result !== null)
  if (apiResult) {
    return NextResponse.json({ success: true, ...apiResult, source: "api" })
  }

  // Fallback: return sample tests for the category detected from slug/URL (lazy loaded)
  const SAMPLE_SERIES = await getSampleSeries()
  const category = detectCategory(slug, webBase || "", apiBase)
  const sampleSeries = SAMPLE_SERIES.filter(s => 
    s.category === category || s.slug.includes(category)
  )
  
  if (sampleSeries.length > 0) {
    // Use the first matching sample series
    const series = sampleSeries[0]
    const subjects = [{
      id: series.id,
      name: series.title,
      tests: series.tests.map(t => ({
        id: t.id,
        title: t.title,
        duration: t.duration,
        total_questions: t.total_questions,
        is_free: true,
      }))
    }]
    return NextResponse.json({ 
      success: true, 
      subjects, 
      tests: [], 
      source: "sample-fallback",
      notice: "Live data unavailable. Showing practice tests." 
    })
  }

  // Last resort: return generic sample tests
  const genericSample = SAMPLE_SERIES[0]
  if (genericSample) {
    const subjects = [{
      id: genericSample.id,
      name: genericSample.title,
      tests: genericSample.tests.map(t => ({
        id: t.id,
        title: t.title,
        duration: t.duration,
        total_questions: t.total_questions,
        is_free: true,
      }))
    }]
    return NextResponse.json({ 
      success: true, 
      subjects, 
      tests: [], 
      source: "sample-fallback",
      notice: "Live data unavailable. Showing practice tests." 
    })
  }

  return NextResponse.json({ error: "Could not fetch test details" }, { status: 404 })
}

// Detect category from slug or URL
function detectCategory(slug: string, webBase: string, apiBase: string): string {
  const combined = `${slug} ${webBase} ${apiBase}`.toLowerCase()
  
  if (combined.includes("ssc") || combined.includes("cgl") || combined.includes("chsl")) return "ssc"
  if (combined.includes("bank") || combined.includes("ibps") || combined.includes("sbi")) return "banking"
  if (combined.includes("nda") || combined.includes("defence") || combined.includes("cds")) return "nda"
  if (combined.includes("railway") || combined.includes("rrb") || combined.includes("ntpc")) return "railways"
  if (combined.includes("upsc") || combined.includes("ias") || combined.includes("pcs")) return "upsc"
  if (combined.includes("jee") || combined.includes("neet") || combined.includes("physics")) return "jee-neet"
  if (combined.includes("ctet") || combined.includes("tet") || combined.includes("teacher")) return "teaching"
  
  return "ssc-banking" // default
}

function findSubjects(data: unknown): unknown[] {
  if (!data || typeof data !== "object") return []
  for (const key of ["subjects", "sections", "folders", "categories"]) {
    const val = (data as Record<string, unknown>)[key]
    if (Array.isArray(val)) return val
  }
  for (const val of Object.values(data as object)) {
    const found = findSubjects(val)
    if (found.length) return found
  }
  return []
}

function findTests(data: unknown): unknown[] {
  if (!data || typeof data !== "object") return []
  const obj = data as Record<string, unknown>

  if ("tests" in obj) {
    const t = obj["tests"]
    if (Array.isArray(t)) return t
    if (typeof t === "object" && t !== null) {
      const flat: unknown[] = []
      for (const arr of Object.values(t)) {
        if (Array.isArray(arr)) flat.push(...arr)
      }
      if (flat.length) return flat
    }
  }

  for (const val of Object.values(obj)) {
    const found = findTests(val)
    if (found.length) return found
  }
  return []
}
