import { NextResponse } from "next/server"
import { getAllSampleSeries, getSampleSeriesForCategory, mapUrlToCategory } from "@/lib/sample-tests"
import platforms from "@/lib/appx-platforms.json"
import {
  fetchWithTimeout as fetchTrustedQuizApi,
  readLimitedText,
} from "@/lib/quiz-remote-fetch"

interface Platform {
  name: string
  api: string
}

const PLATFORM_LIST = platforms as Platform[]
const PLATFORM_HOSTS = new Set(
  PLATFORM_LIST.flatMap(({ api }) => {
    try {
      const apiUrl = new URL(api)
      return [apiUrl.hostname.toLowerCase(), new URL(deriveWebUrl(api)).hostname.toLowerCase()]
    } catch {
      return []
    }
  }),
)

// Simple in-memory cache: key = category, value = {data, timestamp}
const bulkCache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function deriveWebUrl(apiUrl: string): string {
  const classxMatch = apiUrl.match(/^(https?:\/\/)(\w+?)api\.(classx|appx)\.co\.in(.*)$/)
  if (classxMatch) return `${classxMatch[1]}${classxMatch[2]}.${classxMatch[3]}.co.in${classxMatch[4]}`
  return apiUrl.replace(/^(https?:\/\/)api\./, "$1")
}

function findAllowedPlatform(input: string): { apiUrl: string; webUrl: string } | null {
  let supplied: URL
  try {
    supplied = new URL(input.startsWith("http://") || input.startsWith("https://") ? input : `https://${input}`)
  } catch {
    return null
  }

  if (supplied.protocol !== "https:" || supplied.username || supplied.password || !PLATFORM_HOSTS.has(supplied.hostname.toLowerCase())) {
    return null
  }

  const platform = PLATFORM_LIST.find(({ api }) => {
    try {
      const apiUrl = new URL(api)
      return apiUrl.hostname.toLowerCase() === supplied.hostname.toLowerCase()
        || new URL(deriveWebUrl(api)).hostname.toLowerCase() === supplied.hostname.toLowerCase()
    } catch {
      return false
    }
  })
  return platform ? { apiUrl: platform.api.replace(/\/$/, ""), webUrl: deriveWebUrl(platform.api).replace(/\/$/, "") } : null
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
  if (t.includes("ssc") || t.includes("cgl") || t.includes("chsl") || t.includes("mts") || t.includes("gd") || t.includes("stenographer")) return "ssc"
  if (t.includes("bank") || t.includes("ibps") || t.includes("sbi") || t.includes("rbi") || t.includes("clerk") || t.includes("po exam")) return "banking"
  if (t.includes("nda") || t.includes("cds") || t.includes("defence") || t.includes("army") || t.includes("navy") || t.includes("airforce") || t.includes("agniveer")) return "defence"
  if (t.includes("railway") || t.includes("rrb") || t.includes("ntpc") || t.includes("alp") || t.includes("group d")) return "railways"
  if (t.includes("upsc") || t.includes("ias") || t.includes("pcs") || t.includes("civil service") || t.includes("mpsc") || t.includes("bpsc") || t.includes("uppsc")) return "upsc"
  if (t.includes("jee") || t.includes("neet") || t.includes("physics") || t.includes("chemistry") || t.includes("biology") || t.includes("medical") || t.includes("engineering entrance")) return "jee-neet"
  if (t.includes("ctet") || t.includes("teacher") || t.includes("tet") || t.includes("b.ed") || t.includes("bed") || t.includes("kvs") || t.includes("nvs") || t.includes("dsssb")) return "teaching"
  if (t.includes("police") || t.includes("constable") || t.includes("si exam") || t.includes("sub inspector")) return "police"
  if (t.includes("agriculture") || t.includes("agri") || t.includes("krishi") || t.includes("farming")) return "agriculture"
  if (t.includes("gate") || t.includes("ese") || t.includes("isro") || t.includes("drdo")) return "engineering"
  if (t.includes("law") || t.includes("clat") || t.includes("judiciary") || t.includes("legal")) return "law"
  return "general"
}

function cleanSeriesData(series: unknown[]): unknown[] {
  return series.slice(0, 500).map((item, idx) => {
    const s = item as Record<string, unknown>
    return {
      id: String(s.id ?? s.slug ?? `series-${idx}`).slice(0, 200),
      title: cleanTitle(String(s.title ?? s.name ?? `Mock Test ${idx + 1}`)).slice(0, 300),
      slug: String(s.slug ?? s.id ?? idx).slice(0, 200),
      description: cleanDescription(String(s.description || s.subtitle || "")),
      total_tests: s.total_tests ?? s.test_count ?? s.totalTests ?? s.testsCount ?? 10,
      total_questions: s.total_questions ?? s.totalQuestions ?? 0,
      duration: s.duration ?? s.time ?? 60,
      is_free: s.is_free ?? true,
      subjects: s.subjects || [],
      category: s.category || detectCategoryFromTitle(String(s.title || s.name || "")),
      isSample: s.isSample ?? false,
      _sourceApi: s._sourceApi,
      _sourceWeb: s._sourceWeb,
      _platformName: s._platformName,
    }
  })
}

// Try to fetch test series from a specific platform API
async function tryFetchFromPlatform(
  apiUrl: string,
  timeout = 3_500,
  endpointLimit = 3,
): Promise<unknown[] | null> {
  const endpoints = [
    `/api/v1/test-series/?format=json`,
    `/api/v2/test-series/?format=json`,
    `/api/v1/test-series/`,
    `/api/v1/courses/?format=json`,
    `/api/v1/batches/?format=json`,
    `/api/v3/test-series/`,
    `/api/v2/courses/`,
  ]

  for (const endpoint of endpoints.slice(0, endpointLimit)) {
    try {
      const res = await fetchTrustedQuizApi(`${apiUrl}${endpoint}`, timeout)
      if (res.ok) {
        const contentType = res.headers.get("content-type")?.toLowerCase() || ""
        if (!contentType.includes("application/json")) {
          await res.body?.cancel()
          continue
        }
        const text = await readLimitedText(res)
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const inputUrl = searchParams.get("url")?.trim()
  const directApiUrl = searchParams.get("apiUrl")?.trim()
  const bulkMode = searchParams.get("bulk") === "true"
  const category = searchParams.get("category")?.trim()

  // Bulk mode: fetch from APX platforms and return test series
  if (bulkMode) {
    // Check cache first
    const cacheKey = category || "all"
    const cached = bulkCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { "X-Cache": "HIT", "Cache-Control": "no-store" }
      })
    }

    // Get sample series for this category as base
    const sampleSeries = category ? getSampleSeriesForCategory(category) : getAllSampleSeries()
    const baseSeries = sampleSeries.length > 0 ? sampleSeries : getAllSampleSeries()
    
    // Format sample series
    const formattedSamples = baseSeries.map(s => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description,
      total_tests: s.tests.length,
      total_questions: s.tests.reduce((acc, t) => acc + (t.questions?.length || 5), 0),
      duration: s.tests[0]?.duration || 60,
      is_free: true,
      category: s.category || category || "general",
      isSample: true,
      _sourceApi: `sample:${s.category}`,
      _sourceWeb: "",
    }))

    // Try to fetch LIVE data from ALL APX platforms
    // APX platforms use Next.js and store data in __NEXT_DATA__ script tag
    const liveSeries: unknown[] = []
    
    // Keep homepage discovery bounded and deterministic for a given day.
    // A rotating window preserves coverage without launching hundreds of
    // outbound requests on a cold process.
    const platformLimit = Math.min(4, PLATFORM_LIST.length)
    const dailyOffset = Math.floor(Date.now() / 86_400_000) % PLATFORM_LIST.length
    const platformsToTry = Array.from(
      { length: platformLimit },
      (_, index) => PLATFORM_LIST[(dailyOffset + index) % PLATFORM_LIST.length],
    )

    // Fetch a bounded rotating set of approved API hosts.
    const fetchPromises = platformsToTry.map(async (platform) => {
      const webUrl = deriveWebUrl(platform.api)
      try {
        const series = await tryFetchFromPlatform(platform.api, 2_500, 2)
        if (series?.length) {
          return series.slice(0, 10).map(s => ({
            ...(s as object),
            _sourceApi: platform.api,
            _sourceWeb: webUrl,
            _platformName: platform.name,
            isSample: false,
          }))
        }
      } catch {
        // Failed to fetch
      }
      return []
    })

    const results = await Promise.allSettled(fetchPromises)
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.length > 0) {
        liveSeries.push(...result.value)
      }
    }

    // Clean and filter by category if specified
    let cleanedLive = cleanSeriesData(liveSeries)
    
    // Filter by category if specified (not "all")
    if (category && category !== "all") {
      cleanedLive = cleanedLive.filter((s: unknown) => {
        const series = s as { category?: string; title?: string }
        return series.category === category || 
               detectCategoryFromTitle(series.title || "") === category
      })
    }

    // If we got live data, combine with samples
    if (cleanedLive.length > 0) {
      const responseData = {
        success: true,
        testSeries: [...cleanedLive, ...formattedSamples],
        source: "apx-live",
        count: cleanedLive.length + formattedSamples.length,
        liveCount: cleanedLive.length,
        platformsChecked: platformsToTry.length,
      }
      bulkCache.set(cacheKey, { data: responseData, ts: Date.now() })
      return NextResponse.json(responseData)
    }

    // No live data, return samples only
    const sampleData = {
      success: true,
      testSeries: formattedSamples,
      source: "sample",
      count: formattedSamples.length,
      liveCount: 0,
      notice: "Showing practice tests",
    }
    bulkCache.set(cacheKey, { data: sampleData, ts: Date.now() })
    return NextResponse.json(sampleData)
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

  // Specific live extraction is deliberately restricted to the APX hosts we ship.
  // Never use caller-controlled hosts for server-side requests.
  const platform = findAllowedPlatform(directApiUrl || inputUrl!)
  if (!platform) {
    return NextResponse.json({ error: "Only known APX platform URLs are supported" }, { status: 400 })
  }
  const { apiUrl, webUrl } = platform

  const series = await tryFetchFromPlatform(apiUrl)

  if (series && series.length > 0) {
    const cleanedSeries = cleanSeriesData(series)
    return NextResponse.json({
      success: true,
      testSeries: cleanedSeries,
      source: "live",
      apiBase: apiUrl,
      webBase: webUrl,
    })
  }

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
