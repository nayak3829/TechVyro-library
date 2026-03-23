import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"


function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const { data, error } = await supabase
      .from("quiz_results")
      .select("*")
      .order("percentage", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ results: data || [] })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("quiz_results")
      .insert({
        id: body.id,
        name: body.name,
        score: body.score || 0,
        percentage: body.percentage || 0,
        correct: body.correct || 0,
        wrong: body.wrong || 0,
        skipped: body.skipped || 0,
        total_time: body.totalTime || 0,
        quiz_id: body.quizId || null,
        quiz_title: body.quizTitle || "",
        created_at: body.timestamp || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send Telegram notification (fire and forget)
    const total = (body.correct || 0) + (body.wrong || 0) + (body.skipped || 0)
    const percentage = body.percentage || 0
    const medal = percentage >= 90 ? "🥇" : percentage >= 75 ? "🥈" : percentage >= 50 ? "🥉" : "📝"

    const message = [
      `${medal} <b>New Quiz Result!</b>`,
      "",
      `👤 <b>Student:</b> ${body.name || "Anonymous"}`,
      `📝 <b>Quiz:</b> ${body.quizTitle || "Unknown Quiz"}`,
      `✅ <b>Score:</b> ${percentage}% (${body.correct || 0}/${total} correct)`,
      body.wrong > 0 ? `❌ <b>Wrong:</b> ${body.wrong}` : "",
      body.totalTime > 0 ? `⏱️ <b>Time:</b> ${formatTime(body.totalTime)}` : "",
      "",
      "#TechVyro #Quiz #Leaderboard",
    ].filter(line => line !== "").join("\n")

    sendTelegramMessage(message).catch(() => {})

    return NextResponse.json({ result: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || null
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("quiz_results").delete().neq("id", "")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
