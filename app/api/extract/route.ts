import { NextResponse } from "next/server"
import { getAllSampleSeries, getSampleSeriesForCategory, mapUrlToCategory } from "@/lib/sample-tests"
import platforms from "@/lib/appx-platforms.json"

interface Platform {
  name: string
  api: string
}

const PLATFORM_LIST = platforms as Platform[]

function deriveWebUrl(apiUrl: string): string {
  const classxMatch = apiUrl.match(/^(https?:\/\/)(\w+?)api\.(classx|appx)\.co\.in(.*)$/)
  if (classxMatch) return `${classxMatch[1]}${classxMatch[2]}.${classxMatch[3]}.co.in${classxMatch[4]}`
  return apiUrl.replace(/^(https?:\/\/)api\./, "$1")
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
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
  "Origin": "https://web.classx.co.in",
  "Referer": "https://web.classx.co.in/",
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
  if (depth > 10 || !data) return []

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0] as Record<string, unknown>
    if (typeof first === "object" && first !== null) {
      if ("title" in first || "name" in first || "slug" in first || "id" in first) {
        return data as unknown[]
      }
    }
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>
    const keys = ["testSeries", "test_series", "series", "courses", "data", "results", "items", "pageProps", "batches", "contents", "folders"]
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

function cleanTitle(title: string): string {
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

function cleanSeriesData(series: unknown[]): unknown[] {
  return series.map((item, idx) => {
    const s = item as Record<string, unknown>
    return {
      id: s.id || s.slug || `series-${idx}`,
      title: cleanTitle(String(s.title || s.name || `Mock Test ${idx + 1}`)),
      slug: s.slug || String(s.id || idx),
      description: cleanDescription(String(s.description || s.subtitle || "")),
      total_tests: s.total_tests || s.test_count || s.totalTests || s.testsCount || 10,
      total_questions: s.total_questions || s.totalQuestions || 0,
      duration: s.duration || s.time || 60,
      is_free: s.is_free ?? true,
      subjects: s.subjects || [],
      category: s.category || detectCategoryFromTitle(String(s.title || s.name || "")),
    }
  })
}

// Try to fetch test series from a specific platform API
async function tryFetchFromPlatform(apiUrl: string): Promise<unknown[] | null> {
  const endpoints = [
    `/api/v1/test-series/?format=json`,
    `/api/v2/test-series/?format=json`,
    `/api/v1/test-series/`,
    `/api/v1/courses/?format=json`,
    `/api/v1/batches/?format=json`,
    `/api/v3/test-series/`,
    `/api/v2/courses/`,
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithTimeout(`${apiUrl}${endpoint}`, { headers: HEADERS }, 8000)
      if (res.ok) {
        const text = await res.text()
        try {
          const json = JSON.parse(text)
          const series = findTestSeries(json)
          if (series.length > 0) {
            return series
          }
        } catch {
          // Not JSON, try next endpoint
        }
      }
    } catch {
      // Timeout or network error, try next
    }
  }
  return null
}

// Try to scrape from web URL
async function tryScrapeFromWeb(webUrl: string): Promise<unknown[] | null> {
  const paths = ["/test-series", "/test-series/", "/courses", "/courses/", "/"]
  
  for (const path of paths) {
    try {
      const res = await fetchWithTimeout(`${webUrl}${path}`, { headers: HEADERS }, 8000)
      if (res.ok) {
        const html = await res.text()
        const nextData = extractNextData(html)
        if (nextData) {
          const series = findTestSeries(nextData)
          if (series.length > 0) {
            return series
          }
        }
      }
    } catch {
      // Continue to next path
    }
  }
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const inputUrl = searchParams.get("url")?.trim()
  const directApiUrl = searchParams.get("apiUrl")?.trim()
  const bulkMode = searchParams.get("bulk") === "true"
  const category = searchParams.get("category")?.trim()

  // Bulk mode: fetch from multiple APX platforms and filter by category
  if (bulkMode && category) {
    // Keywords to filter test series TITLES by category
    const categoryTitleKeywords: Record<string, string[]> = {
      ssc: ["ssc", "cgl", "chsl", "mts", "gd", "staff selection", "ssc je", "stenographer"],
      banking: ["bank", "ibps", "sbi", "rbi", "clerk", "po ", "probationary", "finance", "nabard"],
      defence: ["nda", "cds", "defence", "army", "navy", "airforce", "capf", "agniveer", "military", "afcat"],
      railways: ["railway", "rrb", "ntpc", "group d", "technician", "loco pilot", "alp", "je railway"],
      upsc: ["upsc", "ias", "civil service", "prelims", "mains", "cse", "epfo", "capf ac"],
      teaching: ["ctet", "tet", "teacher", "kvs", "nvs", "dsssb", "super tet", "b.ed"],
      police: ["police", "constable", "si ", "sub inspector", "delhi police", "up police"],
      "jee-neet": ["jee", "neet", "physics", "chemistry", "biology", "engineering", "iit", "aiims", "bitsat"],
    }

    const filterKeywords = categoryTitleKeywords[category] || []
    
    // Randomly select platforms from the full list to get variety
    const shuffledPlatforms = [...PLATFORM_LIST].sort(() => Math.random() - 0.5)
    const platformsToTry = shuffledPlatforms.slice(0, 15)

    console.log(`[v0] Fetching from ${platformsToTry.length} random APX platforms for category ${category}`)

    const allSeries: unknown[] = []
    
    // Try to fetch from platforms in parallel (limit to 8 concurrent)
    const fetchPromises = platformsToTry.slice(0, 8).map(async (platform) => {
      try {
        const series = await tryFetchFromPlatform(platform.api)
        if (series && series.length > 0) {
          return series.map(s => ({
            ...(s as object),
            _sourceApi: platform.api,
            _sourceWeb: deriveWebUrl(platform.api),
            _platformName: platform.name,
          }))
        }
      } catch {
        // Ignore failures
      }
      return []
    })

    const results = await Promise.allSettled(fetchPromises)
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allSeries.push(...result.value)
      }
    }

    console.log(`[v0] Fetched ${allSeries.length} total series from APX platforms`)

    // Filter by category if we have keywords, otherwise return all
    let filteredSeries = allSeries
    if (filterKeywords.length > 0 && category !== "all") {
      filteredSeries = allSeries.filter(item => {
        const s = item as Record<string, unknown>
        const title = String(s.title || s.name || "").toLowerCase()
        const desc = String(s.description || s.subtitle || "").toLowerCase()
        return filterKeywords.some(kw => title.includes(kw) || desc.includes(kw))
      })
      console.log(`[v0] Filtered to ${filteredSeries.length} series matching ${category}`)
    }

    if (filteredSeries.length > 0) {
      return NextResponse.json({
        success: true,
        testSeries: cleanSeriesData(filteredSeries),
        source: "apx-bulk",
        count: filteredSeries.length,
        totalFetched: allSeries.length,
      })
    }

    // If filtering removed everything but we had data, return unfiltered
    if (allSeries.length > 0) {
      return NextResponse.json({
        success: true,
        testSeries: cleanSeriesData(allSeries.slice(0, 20)),
        source: "apx-bulk",
        count: Math.min(allSeries.length, 20),
        notice: `Showing all available test series (no ${category} specific found)`,
      })
    }

    // Fallback to sample tests with category-specific data
    const sampleSeries = getSampleSeriesForCategory(category)
    const fallbackSeries = sampleSeries.length > 0 ? sampleSeries : getAllSampleSeries()
    return NextResponse.json({
      success: true,
      testSeries: fallbackSeries.map(s => ({
        id: s.id, title: s.title, slug: s.slug,
        description: s.description, total_tests: s.tests.length, 
        total_questions: s.tests.reduce((acc, t) => acc + (t.questions?.length || 5), 0),
        duration: 60, is_free: true, category: s.category || category,
        isSample: true,
      })),
      source: "sample",
      notice: "APX platforms unavailable. Showing practice tests.",
    })
  }

  if (!inputUrl && !directApiUrl) {
    // No specific URL provided - return sample data from all categories
    const allSamples = getAllSampleSeries()
    return NextResponse.json({
      success: true,
      testSeries: allSamples.map(s => ({
        id: s.id, title: s.title, slug: s.slug,
        description: s.description, total_tests: s.tests.length,
        total_questions: s.tests.reduce((acc, t) => acc + (t.questions?.length || 5), 0),
        duration: 60, is_free: true, category: s.category,
        isSample: true,
      })),
      source: "sample",
      notice: "Showing practice tests from our library.",
    })
  }

  // Sample tests shortcut
  if (directApiUrl?.startsWith("sample:")) {
    const cat = directApiUrl.replace("sample:", "")
    const sampleSeries = getSampleSeriesForCategory(cat)
    const fallback = sampleSeries.length > 0 ? sampleSeries : getAllSampleSeries().slice(0, 3)
    const testSeries = fallback.map(s => ({
      id: s.id, title: s.title, slug: s.slug,
      description: s.description, total_tests: s.tests.length, isSample: true,
    }))
    return NextResponse.json({
      success: true, testSeries, source: "sample",
      apiBase: directApiUrl, webBase: inputUrl || "",
      notice: "Showing practice tests.",
    })
  }

  // Determine URLs
  let apiUrl: string
  let webUrl: string

  if (directApiUrl) {
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

  console.log(`[v0] Extract API: apiUrl=${apiUrl} webUrl=${webUrl}`)

  // Try API first, then web scraping
  let series = await tryFetchFromPlatform(apiUrl)
  
  if (!series || series.length === 0) {
    series = await tryScrapeFromWeb(webUrl)
  }

  if (series && series.length > 0) {
    const cleanedSeries = cleanSeriesData(series)
    console.log(`[v0] Found ${cleanedSeries.length} series`)
    return NextResponse.json({
      success: true,
      testSeries: cleanedSeries,
      source: "live",
      apiBase: apiUrl,
      webBase: webUrl,
    })
  }

  console.log(`[v0] No series found, using sample tests`)

  // Fallback to sample tests
  const cat = mapUrlToCategory(webUrl)
  const sampleSeries = getSampleSeriesForCategory(cat)
  const fallback = sampleSeries.length > 0 ? sampleSeries : getAllSampleSeries().slice(0, 3)

  return NextResponse.json({
    success: true,
    testSeries: fallback.map(s => ({
      id: s.id, title: s.title, slug: s.slug,
      description: s.description, total_tests: s.tests.length, isSample: true,
    })),
    source: "sample",
    apiBase: `sample:${cat}`,
    webBase: webUrl,
    notice: "Showing practice tests.",
  })
}
