import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const session = await createClient()
    if (!session) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    const { data: { user }, error: authError } = await session.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const admin = createAdminClient()
    const [progressResult, achievementsResult, ledgerResult, analyticsResult] = await Promise.all([
      admin.from("student_progress").select("total_xp,current_streak,longest_streak,last_study_date,updated_at").eq("user_id", user.id).maybeSingle(),
      admin.from("achievement_unlocks").select("achievement_key,unlocked_at").eq("user_id", user.id).order("unlocked_at", { ascending: false }),
      admin.from("xp_ledger").select("id,amount,reason,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25),
      admin.rpc("get_user_quiz_analytics", { p_user_id: user.id }),
    ])
    if (progressResult.error || achievementsResult.error || ledgerResult.error || analyticsResult.error) {
      return NextResponse.json({ error: "Failed to load study progress" }, { status: 500 })
    }

    return NextResponse.json({
      progress: progressResult.data || { total_xp: 0, current_streak: 0, longest_streak: 0, last_study_date: null, updated_at: null },
      achievements: achievementsResult.data || [],
      recentXp: ledgerResult.data || [],
      analytics: analyticsResult.data,
    }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}