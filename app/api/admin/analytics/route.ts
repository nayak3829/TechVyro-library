import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"

const ALLOWED_RANGES = new Set([7, 30, 90])

export async function GET(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const requestedDays = Number(new URL(request.url).searchParams.get("days") || "7")
  const days = ALLOWED_RANGES.has(requestedDays) ? requestedDays : 7
  const supabase = createAdminClient()
  const [summaryResult, trendsResult] = await Promise.all([
    supabase.rpc("get_admin_analytics_summary"),
    supabase.rpc("get_analytics_trends", { p_days: days }),
  ])
  const error = summaryResult.error || trendsResult.error
  if (error || !summaryResult.data || typeof summaryResult.data !== "object") {
    console.error("[admin/analytics] query failed:", error?.message)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }

  const summary = summaryResult.data as Record<string, unknown>
  const trends = (trendsResult.data ?? []).map((point: {
    event_date: string
    views: number | string | null
    downloads: number | string | null
  }) => {
    const date = new Date(`${point.event_date}T00:00:00.000Z`)
    return {
      date: point.event_date,
      day: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      views: Number(point.views || 0),
      downloads: Number(point.downloads || 0),
    }
  })

  return NextResponse.json({
    rangeDays: days,
    generatedAt: new Date().toISOString(),
    stats: summary.stats,
    performance: summary.performance,
    topPdfs: summary.topPdfs,
    topDownloads: summary.topDownloads,
    categories: summary.categories,
    trends,
  }, { headers: { "Cache-Control": "private, no-store" } })
}