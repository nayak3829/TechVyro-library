import { NextResponse } from "next/server"
import { getAllSampleSeries, getSampleSeriesForCategory, mapUrlToCategory } from "@/lib/sample-tests"

function buildApiUrl(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`)
    const host = url.hostname.replace(/^www\./, "")
    return `https://api.${host}`
  } catch {
    return ""
  }
}

function buildWebUrl(input: string): string {
  if (input.startsWith("http")) return input
  return `https://${input.replace(/^www\./, "")}`
}

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

// Fetch via proxy to bypass Cloudflare/IP blocks
async function proxyFetch(targetUrl: string): Promise<{ text: string; ok: boolean } | null> {
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
    `https://cors-anywhere.herokuapp.com/${targetUrl}`,
  ]

  for (const proxyUrl of proxies) {
    try {
      const res = await fetchWithTimeout(proxyUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "*/*",
          "X-Requested-With": "XMLHttpRequest",
        }
      }, 12000)

      if (!res.ok) continue

      const data = await res.json().catch(() => null)
      if (data?.contents) return { text: data.contents, ok: true }

      // Some proxies return plain text
      const text = await res.text().catch(() => "")
      if (text && text.length > 100) return { text, ok: true }
    } catch {}
  }
  return null
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
    for (const item of data) {
      const found = findTestSeries(item, depth + 1)
      if (found.length > 0) return found
    }
  }

  if (typeof data === "object" && data !== null) {
    const keys = ["testSeries", "test_series", "courses", "series", "data", "items", "results", "list", "content", "tests"]
    for (const key of keys) {
      const val = (data as Record<string, unknown>)[key]
      if (Array.isArray(val) && val.length > 0) {
        const found = findTestSeries(val, depth + 1)
        if (found.length > 0) return found
      }
    }
    for (const val of Object.values(data as object)) {
      if (typeof val === "object" && val !== null) {
        const found = findTestSeries(val, depth + 1)
        if (found.length > 0) return found
      }
    }
  }
  return []
}

const DIRECT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const inputUrl = searchParams.get("url")?.trim()

  if (!inputUrl) {
    return NextResponse.json({ error: "URL required" }, { status: 400 })
  }

  const webUrl = buildWebUrl(inputUrl)
  const apiUrl = buildApiUrl(webUrl)
  const errors: string[] = []

  console.log(`[Extract] Starting extraction for: ${webUrl}`)

  // Run all direct attempts in parallel with a race — first winner wins
  const tryEndpoint = async (url: string, type: "api" | "scrape"): Promise<{ series: unknown[]; type: string } | null> => {
    try {
      const res = await fetchWithTimeout(url, { headers: DIRECT_HEADERS }, 3000)
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
    tryEndpoint(`${webUrl}/api/v1/test-series/?format=json`, "api"),
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

  console.log(`[Extract] All direct methods failed for ${webUrl}, using sample tests`)

  // Fallback: return sample tests matching the platform category
  const category = mapUrlToCategory(webUrl)
  const sampleSeries = getSampleSeriesForCategory(category)
  const fallback = sampleSeries.length > 0 ? sampleSeries : getAllSampleSeries().slice(0, 3)

  // Format sample series to match the expected TestSeries shape
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
    notice: "Live extraction not available for this platform. Showing sample tests instead.",
  })
}
