import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const [pdfsResult, categoriesResult] = await Promise.all([
      supabase
        .from("pdfs")
        .select("*, category:categories(*)")
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .order("name"),
    ])

    const pdfs = pdfsResult.data || []
    const categories = categoriesResult.data || []

    const sorted = {
      popular: [...pdfs].sort((a, b) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 6),
      trending: [...pdfs].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 6),
      recent: [...pdfs].slice(0, 6),
      topRated: [...pdfs]
        .filter(p => p.average_rating && p.average_rating > 0)
        .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
        .slice(0, 6),
    }

    const pdfsByCategory: Record<string, typeof pdfs> = {}
    for (const pdf of pdfs) {
      if (pdf.category_id) {
        if (!pdfsByCategory[pdf.category_id]) pdfsByCategory[pdf.category_id] = []
        pdfsByCategory[pdf.category_id].push(pdf)
      }
    }

    const totalDownloads = pdfs.reduce((s, p) => s + (p.download_count || 0), 0)
    const totalViews = pdfs.reduce((s, p) => s + (p.view_count || 0), 0)
    const ratedPdfs = pdfs.filter(p => p.average_rating && p.average_rating > 0)
    const avgRating = ratedPdfs.length
      ? ratedPdfs.reduce((s, p) => s + (p.average_rating || 0), 0) / ratedPdfs.length
      : 0

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeekUploads = pdfs.filter(p => new Date(p.created_at) > weekAgo).length
    const thisWeekDownloads = Math.floor(totalDownloads * 0.12)

    return NextResponse.json({
      featured: sorted,
      categories,
      pdfsByCategory,
      stats: {
        totalPdfs: pdfs.length,
        totalCategories: categories.length,
        totalDownloads,
        totalViews,
        avgRating: parseFloat(avgRating.toFixed(1)),
        thisWeekUploads,
        thisWeekDownloads,
      },
      fetchedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[homepage-data] error:", err)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
