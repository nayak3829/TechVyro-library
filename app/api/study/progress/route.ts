import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { calculateQuizAnalytics, type QuizResultForAnalytics } from "@/lib/study-progression-analytics"

const RESULT_FIELDS = "id,quiz_id,quiz_title,percentage,correct,wrong,skipped,created_at,quiz:quizzes(id,title,category)"

export async function GET() {
  try {
    const session = await createClient()
    if (!session) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    const { data: { user }, error: authError } = await session.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminClient()
    const [progressResult, achievementsResult, ledgerResult] = await Promise.all([
      admin.from("student_progress").select("total_xp,current_streak,longest_streak,last_study_date,updated_at").eq("user_id", user.id).maybeSingle(),
      admin.from("achievement_unlocks").select("achievement_key,unlocked_at").eq("user_id", user.id).order("unlocked_at", { ascending: false }),
      admin.from("xp_ledger").select("id,amount,reason,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25),
    ])
    if (progressResult.error || achievementsResult.error || ledgerResult.error) {
      return NextResponse.json({ error: "Failed to load study progress" }, { status: 500 })
    }

    const results: QuizResultForAnalytics[] = []
    for (let page = 0; ; page++) {
      const { data, error } = await admin
        .from("quiz_results")
        .select(RESULT_FIELDS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(page * 1000, page * 1000 + 999)
      if (error) return NextResponse.json({ error: "Failed to load quiz analytics" }, { status: 500 })
      results.push(...((data || []) as QuizResultForAnalytics[]))
      if (!data || data.length < 1000) break
    }

    return NextResponse.json({
      progress: progressResult.data || { total_xp: 0, current_streak: 0, longest_streak: 0, last_study_date: null, updated_at: null },
      achievements: achievementsResult.data || [],
      recentXp: ledgerResult.data || [],
      analytics: calculateQuizAnalytics(results),
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}