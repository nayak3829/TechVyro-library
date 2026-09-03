import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    const [quizRes, quizCountRes, favRes, favCountRes] = await Promise.all([
      admin
        .from("quiz_results")
        .select("id, quiz_id, quiz_title, score, percentage, correct, wrong, skipped, total_time, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("quiz_results")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      admin
        .from("pdf_favorites")
        .select("pdf_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("pdf_favorites")
        .select("pdf_id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ])

    if (quizRes.error || quizCountRes.error || favRes.error || favCountRes.error) {
      return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
    }
    const quizResults = quizRes.data || []
    const favoriteIds = (favRes.data || []).map((f: { pdf_id: string }) => f.pdf_id)

    let favoritePdfs: any[] = []
    if (favoriteIds.length > 0) {
      const { data: pdfs } = await applyPublicPdfVisibility(admin
        .from("pdfs")
        .select("id, title, description, download_count, view_count, created_at")
        .in("id", favoriteIds)
        )
        .limit(50)
      favoritePdfs = pdfs || []
    }

    const totalQuizzes = quizCountRes.count ?? quizResults.length
    // quizResults is intentionally capped at the latest 100. Keep derived
    // scores on that same scope rather than mixing a capped numerator with an
    // all-time denominator.
    const scoreSampleSize = quizResults.length
    const bestScore = scoreSampleSize > 0 ? Math.max(...quizResults.map((r: any) => Number(r.percentage))) : 0
    const avgScore = scoreSampleSize > 0
      ? Math.round(quizResults.reduce((sum: number, r: any) => sum + Number(r.percentage), 0) / scoreSampleSize)
      : 0

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Student",
        createdAt: user.created_at,
        avatarUrl: user.user_metadata?.avatar_url || null,
      },
      stats: {
        totalQuizzes,
        bestScore,
        avgScore,
        totalFavorites: favCountRes.count ?? favoriteIds.length,
        quizResultsReturned: quizResults.length,
        quizResultsCapped: totalQuizzes > quizResults.length,
        scoreStatsScope: totalQuizzes > quizResults.length ? "latest_100" : "all",
        favoritesReturned: favoriteIds.length,
        favoritesCapped: (favCountRes.count ?? favoriteIds.length) > favoriteIds.length,
      },
      quizResults,
      favoritePdfs,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await request.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, name: name.trim() })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
