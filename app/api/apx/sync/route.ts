import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import platformsData from "@/lib/appx-platforms.json"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

interface Platform {
  name: string
  api: string
}

const PLATFORM_LIST: Platform[] = platformsData as Platform[]

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
  
  // Check common paths
  const paths = [
    obj.props?.pageProps?.testSeries,
    obj.props?.pageProps?.data?.testSeries,
    obj.props?.pageProps?.courses,
    obj.props?.pageProps?.data?.courses,
    obj.props?.pageProps?.data,
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
        const html = await res.text()
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
  try {
    const { category, limit = 10 } = await request.json()
    const supabase = await createClient()
    
    // Select random platforms to sync
    const shuffled = [...PLATFORM_LIST].sort(() => Math.random() - 0.5)
    const platformsToSync = shuffled.slice(0, limit)
    
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
            category: category || "general",
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
        for (const item of series) {
          const s = item as Record<string, unknown>
          const seriesData = {
            platform_id: platformData.id,
            external_id: String(s.id || s.slug || ""),
            slug: String(s.slug || s.id || `series-${Date.now()}`),
            title: String(s.title || s.name || "Untitled"),
            description: String(s.description || s.subtitle || ""),
            category: category || String(s.category || "general"),
            total_tests: Number(s.total_tests || s.testsCount || 10),
            total_questions: Number(s.total_questions || s.questionsCount || 0),
            duration: Number(s.duration || 60),
            is_free: Boolean(s.is_free ?? s.isFree ?? true),
            thumbnail_url: String(s.thumbnail || s.image || ""),
            metadata: s,
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
  const limit = parseInt(searchParams.get("limit") || "50")
  
  try {
    const supabase = await createClient()
    
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
