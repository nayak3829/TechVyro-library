import { NextResponse } from "next/server"
import { getAllSampleSeries, getSampleSeriesForCategory, mapUrlToCategory } from "@/lib/sample-tests"

function deriveWebUrl(apiUrl: string): string {
  // classx.co.in / appx.co.in: https://NAMEapi.classx.co.in → https://NAME.classx.co.in
  const classxMatch = apiUrl.match(/^(https?:\/\/)(\w+?)api\.(classx|appx)\.co\.in(.*)$/)
  if (classxMatch) return `${classxMatch[1]}${classxMatch[2]}.${classxMatch[3]}.co.in${classxMatch[4]}`
  // Generic: https://api.NAME.com → https://NAME.com
  return apiUrl.replace(/^(https?:\/\/)api\./, "$1")
}

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
    // Direct API URL from appx.json — most reliable path
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
      const res = await fetchWithTimeout(url, { headers: HEADERS }, 3000)
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
    tryEndpoint(`${webUrl}/test-series/`, "scrape"),
    tryEndpoint(`${webUrl}/courses/`, "scrape"),
  ]

  const results = await Promise.allSettled(allAttempts)
  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      const { series, type } = result.value
      console.log(`[Extract] Found ${(series as unknown[]).length} series via ${type}`)
      return NextResponse.json({ success: true, testSeries: series, source: type, apiBase: apiUrl, webBase: webUrl })
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
    description: s.description + " (Sample)",
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
