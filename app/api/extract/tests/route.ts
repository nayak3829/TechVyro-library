import { NextResponse } from "next/server"
import { SAMPLE_SERIES } from "@/lib/sample-tests"

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000) {
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

function extractNextData(html: string): Record<string, unknown> | null {
  try {
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/)
    if (!match) return null
    return JSON.parse(match[1])
  } catch {
    return null
  }
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
  return tests.map((t, idx) => {
    const test = t as Record<string, unknown>
    return {
      id: test.id || test.slug || `test-${idx}`,
      title: cleanSubjectName(String(test.title || test.name || `Test ${idx + 1}`)),
      slug: test.slug || String(test.id || idx),
      duration: test.duration || test.time || 60,
      total_questions: test.total_questions || test.question_count || test.totalQuestions || 25,
      total_marks: test.total_marks || test.marks || 100,
      is_free: test.is_free ?? true,
    }
  })
}

// Clean subjects data
function cleanSubjectsData(subjects: unknown[]): unknown[] {
  return subjects.map((s, idx) => {
    const subj = s as Record<string, unknown>
    const tests = subj.tests ? cleanTestData(subj.tests as unknown[]) : []
    return {
      id: subj.id || `subject-${idx}`,
      name: cleanSubjectName(String(subj.name || subj.title || `Subject ${idx + 1}`)),
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

  // Handle sample series
  if (apiBase.startsWith("sample:")) {
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

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    Accept: "application/json, text/html, */*",
  }

  // Try API endpoints
  const apiEndpoints = [
    `${apiBase}/api/v1/test-series/${slug}/?format=json`,
    `${apiBase}/api/v1/test-series/${slug}/`,
    `${apiBase}/api/v2/test-series/${slug}/?format=json`,
    `${webBase}/api/v1/test-series/${slug}/?format=json`,
  ]

  for (const endpoint of apiEndpoints) {
    try {
      const res = await fetchWithTimeout(endpoint, { headers }, 10000)
      if (res.ok) {
        const json = await res.json()
        const subjects = cleanSubjectsData(findSubjects(json))
        const tests = cleanTestData(findTests(json))
        if (subjects.length > 0 || tests.length > 0) {
          return NextResponse.json({ success: true, subjects, tests, source: "api" })
        }
      }
    } catch {}
  }

  // Fallback: scrape __NEXT_DATA__
  try {
    const url = `${webBase.replace(/\/$/, "")}/test-series/${slug}/`
    const res = await fetchWithTimeout(url, { headers }, 15000)
    if (res.ok) {
      const html = await res.text()
      const nextData = extractNextData(html)
      if (nextData) {
        const props = (nextData as Record<string, unknown>)?.props
        const pageProps = (props as Record<string, unknown>)?.pageProps as Record<string, unknown>
        const rawSubjects: unknown[] = (pageProps?.subjects as unknown[]) || []
        const testsObj = pageProps?.tests || {}

        const flatTests: unknown[] = []
        if (typeof testsObj === "object" && testsObj !== null) {
          for (const arr of Object.values(testsObj)) {
            if (Array.isArray(arr)) flatTests.push(...arr)
          }
        }

        return NextResponse.json({
          success: true,
          subjects: cleanSubjectsData(rawSubjects),
          tests: cleanTestData(flatTests),
          testSeries: pageProps?.testSeries,
          source: "scrape",
        })
      }
    }
  } catch {}

  // Fallback: return sample tests for the category detected from slug/URL
  const category = detectCategory(slug, webBase, apiBase)
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
