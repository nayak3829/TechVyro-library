import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getRecentDownloadCount } from "@/lib/analytics-events"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"
import { getPublicPdfStats } from "@/lib/public-pdf-stats"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    const adminSupabase = createAdminClient()

    const publicPdfQuery = (order: "created_at" | "download_count") => applyPublicPdfVisibility(supabase
        .from("pdfs")
        .select("id, title, download_count, view_count, created_at")
      ).order(order, { ascending: false }).limit(3)

    const [statsRes, recentRes, popularRes, catsRes, quizzesRes, weeklyDownloads] = await Promise.all([
      getPublicPdfStats(supabase),
      publicPdfQuery("created_at"),
      publicPdfQuery("download_count"),
      supabase.from("categories").select("id", { count: "exact", head: true }),
      adminSupabase.from("quizzes").select("id", { count: "exact", head: true })
        .eq("enabled", true).eq("visibility", "public").gt("question_count", 0),
      getRecentDownloadCount(7),
    ])

    const queryError = statsRes.error || recentRes.error || popularRes.error || catsRes.error || quizzesRes.error
    if (queryError) {
      console.error("[stats/summary] database query failed:", queryError.message)
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    const recentPdfs = (recentRes.data || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      download_count: p.download_count || 0,
      view_count: p.view_count || 0,
      created_at: p.created_at,
    }))

    const popularPdfs = (popularRes.data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        download_count: p.download_count || 0,
        view_count: p.view_count || 0,
        created_at: p.created_at,
      }))

    const latestUpload = recentPdfs[0] ? {
      id: recentPdfs[0].id,
      title: recentPdfs[0].title,
      created_at: recentPdfs[0].created_at,
    } : null

    return NextResponse.json({
      totalPdfs: statsRes.data?.totalPdfs ?? 0,
      totalDownloads: statsRes.data?.totalDownloads ?? 0,
      totalViews: statsRes.data?.totalViews ?? 0,
      totalCategories: catsRes.count ?? 0,
      totalQuizzes: quizzesRes.count ?? 0,
      avgRating: statsRes.data?.avgRating ?? 0,
      thisWeekDownloads: weeklyDownloads.count,
      thisWeekUploads: statsRes.data?.thisWeekUploads ?? 0,
      recentPdfs,
      popularPdfs,
      latestUpload,
    }, { headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    console.error("[stats/summary] error:", err)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
