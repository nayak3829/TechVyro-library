import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import platformsData from "@/lib/appx-platforms.json"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { publishInAppNotification } from "@/lib/notifications"
import {
  fetchWithTimeout as fetchTrustedQuizApi,
  readLimitedText as readLimitedQuizText,
} from "@/lib/quiz-remote-fetch"
import { readBoundedJson, RequestBodyError } from "@/lib/ai-request-security"

interface Platform {
  name: string
  api: string
}

const PLATFORM_LIST: Platform[] = platformsData as Platform[]
const MAX_SYNC_PLATFORMS = 20
const MAX_SERIES_PER_PLATFORM = 100

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback
}

function normalizedCategoryValue(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().slice(0, 80)
  return normalized && /^[\p{L}\p{N}\s/_-]+$/u.test(normalized) ? normalized : null
}

function normalizedThumbnailUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return ""
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return ""
    return url.toString().slice(0, 2_000)
  } catch {
    return ""
  }
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
  
  const endpoints = [
    "/api/v1/test-series/?format=json",
    "/api/v2/test-series/?format=json",
    "/api/v1/courses/?format=json",
  ]
  for (const endpoint of endpoints) {
    try {
      const res = await fetchTrustedQuizApi(`${platform.api.replace(/\/$/, "")}${endpoint}`, 4_000)
      if (res.ok) {
        const contentType = res.headers.get("content-type")?.toLowerCase() || ""
        if (!contentType.includes("application/json")) {
          await res.body?.cancel()
          continue
        }
        const series = findTestSeries(JSON.parse(await readLimitedQuizText(res)))
        if (series.length > 0) {
          return { series: series.slice(0, MAX_SERIES_PER_PLATFORM), webUrl }
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
    let body: unknown
    try {
      body = await readBoundedJson(request, 4 * 1024)
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status })
      }
      throw error
    }
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
    const normalizedCategory = normalizedCategoryValue(category)
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
        const firstSeriesCategory = normalizedCategoryValue((series[0] as Record<string, unknown>).category)
        const platformCategory = normalizedCategory ?? firstSeriesCategory ?? "general"
        
        // Upsert platform
        const { data: platformData, error: platformError } = await supabase
          .from("apx_platforms")
          .upsert({
            name: platform.name,
            api_url: platform.api,
            web_url: webUrl,
            category: platformCategory,
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
            category: normalizedCategory ?? normalizedCategoryValue(s.category) ?? platformCategory,
            total_tests: boundedNumber(s.total_tests || s.testsCount, 10, 0, 10000),
            total_questions: boundedNumber(s.total_questions || s.questionsCount, 0, 0, 100000),
            duration: boundedNumber(s.duration, 60, 1, 10000),
            is_free: Boolean(s.is_free ?? s.isFree ?? true),
            thumbnail_url: normalizedThumbnailUrl(s.thumbnail || s.image),
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
    
    if (results.series > 0) {
      const dateKey = new Date().toISOString().slice(0, 10)
      const notificationCategory = normalizedCategory ?? "all"
      try {
        await publishInAppNotification({
          kind: "test",
          entityId: `catalog-${notificationCategory.replace(/[^A-Za-z0-9_-]/g, "-")}-${dateKey}`,
          title: "Mock test catalogue updated",
          body: `${results.series} test series ${results.series === 1 ? "was" : "were"} refreshed${normalizedCategory ? ` in ${normalizedCategory}` : ""}.`,
          href: "/test-series",
          payload: { category: normalizedCategory, series: results.series },
        })
      } catch (error) {
        console.error("[notifications] Test catalogue fan-out failed:", error)
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
