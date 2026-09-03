import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import platformsData from "@/lib/appx-platforms.json"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

interface Platform {
  name: string
  api: string
}

const PLATFORM_LIST: Platform[] = platformsData as Platform[]
const MAX_HTML_BYTES = 2 * 1024 * 1024
const MAX_SYNC_PLATFORMS = 20
const MAX_SERIES_PER_PLATFORM = 100

async function readLimitedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") || 0)
  if (declaredLength > MAX_HTML_BYTES) throw new Error("Platform response is too large")
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_HTML_BYTES) {
      await reader.cancel()
      throw new Error("Platform response is too large")
    }
    chunks.push(value)
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(result)
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback
}

// Derive web URL from API URL
function deriveWebUrl(apiUrl: string): string {
  try {
    const url = new URL(apiUrl)
    const host = url.hostname.replace(/api\./, "").replace(/api$/, "")
    return `https://${host}`
  } catch {
    return apiUrl.replace(/api\./, "").replace(/api$/, "")
  }
}

// Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 8000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

// Extract __NEXT_DATA__ from HTML
function extractNextData(html: string): Record<string, unknown> | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/i)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

// Find test series in various data structures
function findTestSeries(data: unknown): unknown[] {
  if (!data || typeof data !== "object") return []
  const obj = data as Record<string, unknown>
  const props = obj.props as Record<string, unknown> | undefined
  const pageProps = props?.pageProps as Record<string, unknown> | undefined
  const pagePropsData = pageProps?.data as Record<string, unknown> | undefined
  
  // Check common paths
  const paths = [
    pageProps?.testSeries,
    pagePropsData?.testSeries,
    pageProps?.courses,
    pagePropsData?.courses,
    pagePropsData,
    obj.testSeries,
    obj.courses,
    obj.data,
    obj.results,
  ]
  
  for (const path of paths) {
    if (Array.isArray(path) && path.length > 0) {
      return path
    }
  }
  
  return []
}

// Fetch test series from a platform
async function fetchFromPlatform(platform: Platform): Promise<{
  series: unknown[]
  webUrl: string
}> {
  const webUrl = deriveWebUrl(platform.api)
  
  // Try web scraping first
  const paths = ["/test-series/", "/test-series", "/courses/", "/"]
  for (const path of paths) {
    try {
      const res = await fetchWithTimeout(`${webUrl}${path}`, { headers: HEADERS }, 6000)
      if (res.ok) {
        const html = await readLimitedText(res)
        const nextData = extractNextData(html)
        if (nextData) {
          const series = findTestSeries(nextData)
          if (series.length > 0) {
            return { series, webUrl }
          }
        }
      }
    } catch {
      continue
    }
  }
  
  return { series: [], webUrl }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: "Request body must be a JSON object" }, { status: 400 })
    }
    const { category, limit = 10 } = body as { category?: unknown; limit?: unknown }
    if (category !== undefined && (typeof category !== "string" || category.trim().length > 80)) {
      return NextResponse.json({ success: false, error: "Category is invalid" }, { status: 400 })
    }
    const normalizedLimit = typeof limit === "number" ? limit : Number.NaN
    if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > MAX_SYNC_PLATFORMS) {
      return NextResponse.json({ success: false, error: `Limit must be between 1 and ${MAX_SYNC_PLATFORMS}` }, { status: 400 })
    }
    const normalizedCategory = typeof category === "string" && category.trim() ? category.trim() : "general"
    const supabase = createAdminClient()
    
    // Select random platforms to sync
    const shuffled = [...PLATFORM_LIST].sort(() => Math.random() - 0.5)
    const platformsToSync = shuffled.slice(0, normalizedLimit)
    
    const results = {
      synced: 0,
      platforms: 0,
      series: 0,
      errors: [] as string[],
    }
    
    for (const platform of platformsToSync) {
      try {
        const { series, webUrl } = await fetchFromPlatform(platform)
        
        if (series.length === 0) continue
        
        // Upsert platform
        const { data: platformData, error: platformError } = await supabase
          .from("apx_platforms")
          .upsert({
            name: platform.name,
            api_url: platform.api,
            web_url: webUrl,
            category: normalizedCategory,
            is_active: true,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: "api_url" })
          .select("id")
          .single()
        
        if (platformError) {
          results.errors.push(`Platform ${platform.name}: ${platformError.message}`)
          continue
        }
        
        results.platforms++
        
        // Insert test series
        for (const item of series.slice(0, MAX_SERIES_PER_PLATFORM)) {
          const s = item as Record<string, unknown>
          const seriesData = {
            platform_id: platformData.id,
            external_id: String(s.id || s.slug || "").slice(0, 200),
            slug: String(s.slug || s.id || `series-${Date.now()}`).slice(0, 200),
            title: String(s.title || s.name || "Untitled").slice(0, 300),
            description: String(s.description || s.subtitle || "").slice(0, 5000),
            category: normalizedCategory || String(s.category || "general").slice(0, 80),
            total_tests: boundedNumber(s.total_tests || s.testsCount, 10, 0, 10000),
            total_questions: boundedNumber(s.total_questions || s.questionsCount, 0, 0, 100000),
            duration: boundedNumber(s.duration, 60, 1, 10000),
            is_free: Boolean(s.is_free ?? s.isFree ?? true),
            thumbnail_url: String(s.thumbnail || s.image || "").slice(0, 2000),
            metadata: { sourceId: s.id ?? null, sourceSlug: s.slug ?? null },
          }
          
          const { error: seriesError } = await supabase
            .from("apx_test_series")
            .upsert(seriesData, { onConflict: "platform_id,slug" })
          
          if (!seriesError) {
            results.series++
          }
        }
        
        results.synced++
      } catch (err) {
        results.errors.push(`${platform.name}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }
    
    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") || "all"
  const requestedLimit = Number(searchParams.get("limit") || "50")
  const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 50
  if (category.length > 80) {
    return NextResponse.json({ success: false, error: "Category is invalid", testSeries: [] }, { status: 400 })
  }
  
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: "Database connection not available",
        testSeries: [],
      }, { status: 503 })
    }
    
    let query = supabase
      .from("apx_test_series")
      .select(`
        *,
        platform:apx_platforms(name, web_url, api_url)
      `)
      .order("created_at", { ascending: false })
      .limit(limit)
    
    if (category && category !== "all") {
      query = query.eq("category", category)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    // Transform for frontend
    const testSeries = (data || []).map(s => ({
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description,
      total_tests: s.total_tests,
      total_questions: s.total_questions,
      duration: s.duration,
      is_free: s.is_free,
      category: s.category,
      isSample: false,
      _sourceApi: s.platform?.api_url,
      _sourceWeb: s.platform?.web_url,
      _platformName: s.platform?.name,
    }))
    
    return NextResponse.json({
      success: true,
      testSeries,
      count: testSeries.length,
      source: "supabase",
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      testSeries: [],
    }, { status: 500 })
  }
}
