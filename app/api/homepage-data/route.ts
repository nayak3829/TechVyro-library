import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getRecentDownloadCount } from "@/lib/analytics-events"
import { maybeRunPdfMaintenance } from "@/lib/pdf-job-runner"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"
import { getPublicPdfStats } from "@/lib/public-pdf-stats"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  void maybeRunPdfMaintenance()
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const publicPdfQuery = (order: "created_at" | "download_count" | "view_count" | "average_rating") =>
      applyPublicPdfVisibility(supabase
        .from("pdfs")
        .select(`
          id, title, description, file_size, category_id, download_count,
          view_count, average_rating, review_count, created_at, updated_at,
          visibility, allow_download, tags, scheduled_at, thumbnail_path,
          category:categories(id, name, slug, color, created_at)
        `)
        )
        .order(order, { ascending: false })
        .limit(6)

    const [popularResult, trendingResult, recentResult, topRatedResult, statsResult, categoriesResult, weeklyDownloads] = await Promise.all([
      publicPdfQuery("download_count"),
      publicPdfQuery("view_count"),
      publicPdfQuery("created_at"),
      publicPdfQuery("average_rating"),
      getPublicPdfStats(supabase),
      supabase
        .from("categories")
        .select("id, name, slug, color, created_at", { count: "exact" })
        .order("name")
        .limit(200),
      getRecentDownloadCount(7),
    ])

    const queryError = [popularResult, trendingResult, recentResult, topRatedResult, statsResult, categoriesResult]
      .find((result) => result.error)?.error
    if (queryError) {
      const error = queryError
      console.error("[homepage-data] database query failed:", error?.message)
      return NextResponse.json({ error: "Failed to fetch homepage data" }, { status: 500 })
    }

    const cardRows = [
      ...(popularResult.data || []),
      ...(trendingResult.data || []),
      ...(recentResult.data || []),
      ...(topRatedResult.data || []),
    ]
    const withThumbnailUrl = (pdf: any) => {
      const { thumbnail_path: thumbnailPath, ...safePdf } = pdf
      return {
        ...safePdf,
        ...(thumbnailPath ? { thumbnail_url: `/api/pdfs/${pdf.id}/thumbnail` } : {}),
      }
    }
    const pdfs = Array.from(new Map(cardRows.map((pdf) => [pdf.id, withThumbnailUrl(pdf)])).values())
    const categories = categoriesResult.data || []

    const sorted = {
      popular: (popularResult.data || []).map(withThumbnailUrl),
      trending: (trendingResult.data || []).map(withThumbnailUrl),
      recent: (recentResult.data || []).map(withThumbnailUrl),
      topRated: (topRatedResult.data || []).map(withThumbnailUrl),
    }

    const pdfsByCategory: Record<string, typeof pdfs> = {}
    for (const pdf of pdfs) {
      if (pdf.category_id) {
        if (!pdfsByCategory[pdf.category_id]) pdfsByCategory[pdf.category_id] = []
        pdfsByCategory[pdf.category_id].push(pdf)
      }
    }

    return NextResponse.json({
      featured: sorted,
      categories,
      pdfsByCategory,
      stats: {
        totalPdfs: statsResult.data?.totalPdfs ?? 0,
        totalCategories: categoriesResult.count ?? categories.length,
        totalDownloads: statsResult.data?.totalDownloads ?? 0,
        totalViews: statsResult.data?.totalViews ?? 0,
        avgRating: statsResult.data?.avgRating ?? 0,
        aggregatesComplete: true,
        thisWeekUploads: statsResult.data?.thisWeekUploads ?? 0,
        thisWeekDownloads: weeklyDownloads.count,
      },
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[homepage-data] error:", err)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
