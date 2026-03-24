import { NextResponse } from "next/server"
import { getAllSampleSeries, getSampleSeriesForCategory, mapUrlToCategory } from "@/lib/sample-tests"

function deriveWebUrl(apiUrl: string): string {
  // classx.co.in / appx.co.in: https://NAMEapi.classx.co.in → https://NAME.classx.co.in
  const classxMatch = apiUrl.match(/^(https?:\/\/)(\w+?)api\.(classx|appx)\.co\.in(.*)$/)
  if (classxMatch) return `${classxMatch[1]}${classxMatch[2]}.${classxMatch[3]}.co.in${classxMatch[4]}`
  // Generic: https://api.NAME.com → https://NAME.com
  return apiUrl.replace(/^(https?:\/\/)api\./, "$1")
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000) {
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

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
  "Cache-Control": "no-cache",
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

function findTestSeries(data: unknown, depth = 0): unknown[] {
  if (depth > 8 || !data) return []

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>
    if (typeof first === "object" && first !== null) {
      if ("title" in first || "name" in first || "slug" in first) return data as unknown[]
    }
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>
    const keys = ["testSeries", "test_series", "series", "courses", "data", "results", "items", "pageProps"]
    for (const key of keys) {
      if (key in obj) {
        const result = findTestSeries(obj[key], depth + 1)
        if (result.length > 0) return result
      }
    }
    for (const val of Object.values(obj)) {
      if (typeof val === "object" && val !== null) {
        const result = findTestSeries(val, depth + 1)
        if (result.length > 0) return result
      }
    }
  }

  return []
}

// Clean test series data to remove any platform identifiers
function cleanSeriesData(series: unknown[]): unknown[] {
  return series.map((item, idx) => {
    const s = item as Record<string, unknown>
    return {
      id: s.id || s.slug || `series-${idx}`,
      title: cleanTitle(String(s.title || s.name || `Test Series ${idx + 1}`)),
      slug: s.slug || String(s.id || idx),
      description: cleanDescription(String(s.description || s.subtitle || "")),
      total_tests: s.total_tests || s.test_count || s.totalTests || 10,
      total_questions: s.total_questions || s.totalQuestions || 0,
      duration: s.duration || s.time || 60,
      is_free: s.is_free ?? true,
      subjects: s.subjects || [],
      category: s.category || detectCategoryFromTitle(String(s.title || s.name || "")),
    }
  })
}

// Remove platform names from titles
function cleanTitle(title: string): string {
  // Remove common platform suffixes/prefixes
  const platformPatterns = [
    /\s*by\s+\w+\s*(academy|classes|institute|coaching|edu|education|online|learning)?/gi,
    /\s*-\s*\w+\s*(academy|classes|institute|coaching|edu)?$/gi,
    /^\w+\s*(academy|classes|institute|coaching)?\s*-\s*/gi,
    /\(\w+\s*(app|academy|classes)?\)/gi,
  ]
  let cleaned = title
  for (const pattern of platformPatterns) {
    cleaned = cleaned.replace(pattern, "")
  }
  return cleaned.trim() || title
}

function cleanDescription(desc: string): string {
  if (!desc) return "Complete preparation with practice tests and detailed solutions"
  return desc.length > 200 ? desc.substring(0, 200) + "..." : desc
}

function detectCategoryFromTitle(title: string): string {
  const t = title.toLowerCase()
  if (t.includes("ssc") || t.includes("cgl") || t.includes("chsl") || t.includes("mts")) return "ssc"
  if (t.includes("bank") || t.includes("ibps") || t.includes("sbi") || t.includes("rbi")) return "banking"
  if (t.includes("nda") || t.includes("cds") || t.includes("defence") || t.includes("army")) return "defence"
  if (t.includes("railway") || t.includes("rrb") || t.includes("ntpc")) return "railways"
  if (t.includes("upsc") || t.includes("ias") || t.includes("pcs")) return "upsc"
  if (t.includes("jee") || t.includes("neet") || t.includes("physics")) return "jee-neet"
  if (t.includes("ctet") || t.includes("teacher") || t.includes("tet")) return "teaching"
  if (t.includes("police") || t.includes("constable")) return "police"
  return "general"
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const inputUrl = searchParams.get("url")?.trim()
  // Direct API URL from appx.json database
  const directApiUrl = searchParams.get("apiUrl")?.trim()

  if (!inputUrl && !directApiUrl) {
    return NextResponse.json({ error: "url or apiUrl required" }, { status: 400 })
  }

  // Shortcut: if apiUrl starts with "sample:" return sample tests immediately
  if (directApiUrl?.startsWith("sample:")) {
    const category = directApiUrl.replace("sample:", "")
    const sampleSeries = getSampleSeriesForCategory(category)
    const fallback = sampleSeries.length > 0 ? sampleSeries : getAllSampleSeries().slice(0, 3)
    const testSeries = fallback.map(s => ({
      id: s.id, title: s.title, slug: s.slug,
      description: s.description, total_tests: s.tests.length, isSample: true,
    }))
    return NextResponse.json({
      success: true, testSeries, source: "sample",
      apiBase: directApiUrl, webBase: inputUrl || "",
      notice: "Showing sample practice tests.",
    })
  }

  // Determine the API and web base URLs
  let apiUrl: string
  let webUrl: string

  if (directApiUrl) {
    // Direct API URL from appx.json - most reliable path
    apiUrl = directApiUrl.replace(/\/$/, "")
    webUrl = deriveWebUrl(apiUrl)
  } else {
    const raw = inputUrl!
    if (raw.startsWith("http")) {
      const u = new URL(raw)
      const host = u.hostname.replace(/^www\./, "")
      apiUrl = `https://${host.replace(/api\./, "")}api.${host.replace(/.*?api\./, "")}`
      webUrl = raw
    } else {
      const host = raw.replace(/^www\./, "")
      apiUrl = `https://api.${host}`
      webUrl = `https://${host}`
    }
  }

  console.log(`[Extract] Starting for apiUrl=${apiUrl} webUrl=${webUrl}`)

  // Try all AppX API endpoints in parallel
  const tryEndpoint = async (url: string, type: "api" | "scrape"): Promise<{ series: unknown[]; type: string } | null> => {
    try {
      const res = await fetchWithTimeout(url, { headers: HEADERS }, 8000)
      if (!res.ok) return null
      const text = await res.text()
      if (type === "api") {
        const json = JSON.parse(text)
        const series = findTestSeries(json)
        return series.length > 0 ? { series, type: "api" } : null
      } else {
        const nextData = extractNextData(text)
        if (nextData) {
          const series = findTestSeries(nextData)
          return series.length > 0 ? { series, type: "scrape" } : null
        }
        return null
      }
    } catch {
      return null
    }
  }

  const allAttempts = [
    tryEndpoint(`${apiUrl}/api/v1/test-series/?format=json`, "api"),
    tryEndpoint(`${apiUrl}/api/v2/test-series/?format=json`, "api"),
    tryEndpoint(`${apiUrl}/api/v1/test-series/`, "api"),
    tryEndpoint(`${apiUrl}/api/v1/courses/?format=json`, "api"),
    tryEndpoint(`${webUrl}/test-series/`, "scrape"),
    tryEndpoint(`${webUrl}/courses/`, "scrape"),
  ]

  const results = await Promise.allSettled(allAttempts)
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      const { series, type } = result.value
      const cleanedSeries = cleanSeriesData(series)
      console.log(`[Extract] Found ${cleanedSeries.length} series via ${type}`)
      return NextResponse.json({ 
        success: true, 
        testSeries: cleanedSeries, 
        source: type, 
        apiBase: apiUrl, 
        webBase: webUrl 
      })
    }
  }

  console.log(`[Extract] All direct methods failed, using sample tests`)

  // Fallback: return sample tests matching the platform category
  const category = mapUrlToCategory(webUrl)
  const sampleSeries = getSampleSeriesForCategory(category)
  const fallback = sampleSeries.length > 0 ? sampleSeries : getAllSampleSeries().slice(0, 3)

  const testSeries = fallback.map(s => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    description: s.description,
    total_tests: s.tests.length,
    isSample: true,
  }))

  return NextResponse.json({
    success: true,
    testSeries,
    source: "sample",
    apiBase: `sample:${category}`,
    webBase: webUrl,
    notice: "Showing sample practice tests.",
  })
}
