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
  const allPdfs: Array<{
    id: string; title: string; category_id: string | null; view_count: number | null
    download_count: number | null; review_count: number | null; file_size: number | null; average_rating: number | null
  }> = []
  let page = 0
  let pdfQueryError: { message: string } | null = null
  while (true) {
    const { data, error } = await supabase
      .from("pdfs")
      .select("id, title, category_id, view_count, download_count, review_count, file_size, average_rating")
      .range(page * 1000, page * 1000 + 999)
    if (error) {
      pdfQueryError = error
      break
    }
    allPdfs.push(...(data ?? []))
    if (!data || data.length < 1000) break
    page++
  }
  const [categoriesResult, trendsResult] = await Promise.all([
    supabase.from("categories").select("id, name, color"),
    supabase.rpc("get_analytics_trends", { p_days: days }),
  ])
  const error = pdfQueryError || categoriesResult.error || trendsResult.error
  if (error) {
    console.error("[admin/analytics] query failed:", error.message)
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 })
  }

  const pdfs = allPdfs
  const categories = categoriesResult.data ?? []
  const totalViews = pdfs.reduce((sum, pdf) => sum + Number(pdf.view_count || 0), 0)
  const totalDownloads = pdfs.reduce((sum, pdf) => sum + Number(pdf.download_count || 0), 0)
  const totalReviews = pdfs.reduce((sum, pdf) => sum + Number(pdf.review_count || 0), 0)
  const totalStorage = pdfs.reduce((sum, pdf) => sum + Number(pdf.file_size || 0), 0)
  const reviewedPdfs = pdfs.filter(pdf => Number(pdf.review_count || 0) > 0).length
  const avgRating = totalReviews
    ? pdfs.reduce((sum, pdf) => sum + Number(pdf.average_rating || 0) * Number(pdf.review_count || 0), 0) / totalReviews
    : 0
  const categoryMap = new Map(categories.map(category => [category.id, {
    id: category.id,
    name: category.name,
    color: category.color,
    count: 0,
    views: 0,
    downloads: 0,
  }]))
  for (const pdf of pdfs) {
    const category = pdf.category_id ? categoryMap.get(pdf.category_id) : undefined
    if (category) {
      category.count++
      category.views += Number(pdf.view_count || 0)
      category.downloads += Number(pdf.download_count || 0)
    }
  }
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
  const top = (field: "view_count" | "download_count") => [...pdfs]
    .sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0))
    .slice(0, 5)
    .map(pdf => ({ id: pdf.id, title: pdf.title, views: Number(pdf.view_count || 0), downloads: Number(pdf.download_count || 0) }))

  return NextResponse.json({
    rangeDays: days,
    generatedAt: new Date().toISOString(),
    stats: {
      totalViews,
      totalDownloads,
      totalReviews,
      totalPdfs: pdfs.length,
      totalStorage,
      avgRating,
      reviewedPdfs,
      engagementRate: totalViews ? (totalDownloads / totalViews) * 100 : 0,
      avgDownloads: pdfs.length ? totalDownloads / pdfs.length : 0,
    },
    performance: {
      highRated: pdfs.filter(pdf => Number(pdf.average_rating || 0) >= 4).length,
      mediumRated: pdfs.filter(pdf => Number(pdf.average_rating || 0) >= 2 && Number(pdf.average_rating || 0) < 4).length,
      lowRated: pdfs.filter(pdf => Number(pdf.average_rating || 0) > 0 && Number(pdf.average_rating || 0) < 2).length,
      unrated: pdfs.filter(pdf => Number(pdf.average_rating || 0) === 0).length,
      topPerformers: pdfs.filter(pdf => Number(pdf.download_count || 0) >= 10 && Number(pdf.average_rating || 0) >= 4).length,
      underperformers: pdfs.filter(pdf => Number(pdf.view_count || 0) < 10 && Number(pdf.download_count || 0) === 0).length,
    },
    topPdfs: top("view_count"),
    topDownloads: top("download_count"),
    categories: [...categoryMap.values()].filter(category => category.count > 0),
    trends,
  }, { headers: { "Cache-Control": "private, no-store" } })
}