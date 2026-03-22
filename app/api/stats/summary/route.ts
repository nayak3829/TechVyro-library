import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const [pdfsRes, catsRes, quizzesRes] = await Promise.all([
      supabase
        .from("pdfs")
        .select("id, title, download_count, view_count, created_at, file_size, average_rating, review_count")
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("id, name"),
      supabase.from("quizzes").select("id"),
    ])

    const pdfs = pdfsRes.data || []
    const categories = catsRes.data || []
    const quizzes = quizzesRes.data || []

    const totalPdfs = pdfs.length
    const totalDownloads = pdfs.reduce((s, p) => s + (p.download_count || 0), 0)
    const totalViews = pdfs.reduce((s, p) => s + (p.view_count || 0), 0)
    const totalCategories = categories.length
    const totalQuizzes = quizzes.length

    const ratingsArr = pdfs.filter(p => p.average_rating && p.average_rating > 0)
    const avgRating = ratingsArr.length > 0
      ? ratingsArr.reduce((s, p) => s + (p.average_rating || 0), 0) / ratingsArr.length
      : 0

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeekPdfs = pdfs.filter(p => new Date(p.created_at) >= weekAgo)
    const thisWeekDownloads = thisWeekPdfs.reduce((s, p) => s + (p.download_count || 0), 0)

    const recentPdfs = pdfs.slice(0, 3).map(p => ({
      id: p.id,
      title: p.title,
      download_count: p.download_count || 0,
      view_count: p.view_count || 0,
      created_at: p.created_at,
    }))

    const popularPdfs = [...pdfs]
      .sort((a, b) => (b.download_count || 0) - (a.download_count || 0))
      .slice(0, 3)
      .map(p => ({
        id: p.id,
        title: p.title,
        download_count: p.download_count || 0,
        view_count: p.view_count || 0,
        created_at: p.created_at,
      }))

    const latestUpload = pdfs[0] ? {
      id: pdfs[0].id,
      title: pdfs[0].title,
      created_at: pdfs[0].created_at,
    } : null

    return NextResponse.json({
      totalPdfs,
      totalDownloads,
      totalViews,
      totalCategories,
      totalQuizzes,
      avgRating: Number(avgRating.toFixed(1)),
      thisWeekDownloads,
      thisWeekUploads: thisWeekPdfs.length,
      recentPdfs,
      popularPdfs,
      latestUpload,
    })
  } catch (err) {
    console.error("[stats/summary] error:", err)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
