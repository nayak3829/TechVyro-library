import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"
import { checkRateLimit, clientAddress, readBoundedJson, RequestBodyError } from "@/lib/ai-request-security"

const LEADERBOARD_FIELDS = "id,name,score,percentage,correct,wrong,skipped,total_time,quiz_id,quiz_title,created_at"
// Leaderboard needs the performance breakdown; never include user_id or other
// account metadata in this public projection.
const PUBLIC_LEADERBOARD_FIELDS = "id,name,score,percentage,correct,wrong,skipped,total_time,quiz_id,quiz_title,created_at,quiz:quizzes!inner(enabled,visibility)"
const MAX_NAME_LENGTH = 100
const MAX_TOTAL_TIME_SECONDS = 86_400

function escapeTelegramHtml(value: string): string {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userFilter = searchParams.get("user")
    const quizId = searchParams.get("quizId")

    // If ?user=me, return only the current user's results
    if (userFilter === "me") {
      const supabase = await createClient()
      if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      let query = supabase
        .from("quiz_results")
        .select(LEADERBOARD_FIELDS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200)
      if (quizId) query = query.eq("quiz_id", quizId)
      const { data, error } = await query

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ results: data || [] })
    }

    const admin = createAdminClient()
    let query = admin
      .from("quiz_results")
      .select(PUBLIC_LEADERBOARD_FIELDS)
      .eq("quiz.enabled", true)
      .eq("quiz.visibility", "public")
      .order("percentage", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200)
    if (quizId) query = query.eq("quiz_id", quizId)
    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // The join is only an access-control guard. Do not expose quiz metadata
    // beyond the intentionally public result fields.
    const results = (data || []).map(({ quiz: _quiz, ...result }) => result)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Bind every result to the server-verified identity. Never allow a
    // client-provided user ID (or an unauthenticated "guest") to create one.
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase?.auth.getUser() ?? { data: { user: null }, error: null }
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const rate = checkRateLimit(`quiz-results:${clientAddress(request)}`, 20, 60_000)
    if (!rate.allowed) {
      const response = NextResponse.json({ error: "Too many submissions. Please try again shortly." }, { status: 429 })
      response.headers.set("Retry-After", String(rate.retryAfter))
      return response
    }

    let body: unknown
    try {
      body = await readBoundedJson(request, 16 * 1024)
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
    }
    const payload = body as Record<string, unknown>

    const name = typeof payload.name === "string" ? payload.name.trim() : ""
    if (!name || name.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters` }, { status: 400 })
    }

    const quizId = typeof payload.quizId === "string" ? payload.quizId.trim() : ""
    if (!quizId || quizId.length > 128) {
      return NextResponse.json({ error: "A valid quiz ID is required" }, { status: 400 })
    }

    const { correct, wrong, skipped } = payload
    if (!isNonNegativeInteger(correct) || !isNonNegativeInteger(wrong) || !isNonNegativeInteger(skipped)) {
      return NextResponse.json({ error: "Correct, wrong, and skipped must be non-negative integers" }, { status: 400 })
    }
    const total = correct + wrong + skipped
    if (total === 0) {
      return NextResponse.json({ error: "At least one answered or skipped question is required" }, { status: 400 })
    }

    const totalTime = payload.totalTime
    if (!isNonNegativeInteger(totalTime) || totalTime > MAX_TOTAL_TIME_SECONDS) {
      return NextResponse.json({ error: `Total time must be a non-negative integer up to ${MAX_TOTAL_TIME_SECONDS} seconds` }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: quiz, error: quizError } = await admin
      .from("quizzes")
      .select("id,title,enabled,questions,time_limit")
      .eq("id", quizId)
      .eq("enabled", true)
      .eq("visibility", "public")
      .maybeSingle()

    if (quizError) return NextResponse.json({ error: "Failed to validate quiz" }, { status: 500 })
    if (!quiz) return NextResponse.json({ error: "Quiz not found or unavailable" }, { status: 404 })

    const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0
    if (questionCount === 0 || total > questionCount) {
      return NextResponse.json({ error: "Result counts do not match this quiz" }, { status: 400 })
    }
    const quizTimeLimit = typeof quiz.time_limit === "number" && Number.isSafeInteger(quiz.time_limit) && quiz.time_limit >= 0
      ? quiz.time_limit
      : MAX_TOTAL_TIME_SECONDS
    if (totalTime > Math.min(quizTimeLimit, MAX_TOTAL_TIME_SECONDS)) {
      return NextResponse.json({ error: "Total time exceeds this quiz's time limit" }, { status: 400 })
    }

    // Do not trust client-generated IDs, scores, percentages, timestamps, or user IDs.
    const percentage = Math.round((correct / total) * 100)
    const score = correct - (wrong * 0.25)

    const { data, error } = await admin
      .from("quiz_results")
      .insert({
        id: crypto.randomUUID(),
        name,
        score,
        percentage,
        correct,
        wrong,
        skipped,
        total_time: totalTime,
        quiz_id: quiz.id,
        quiz_title: quiz.title,
        user_id: user.id,
      })
      .select(LEADERBOARD_FIELDS)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send Telegram notification (fire and forget)
    const medal = percentage >= 90 ? "🥇" : percentage >= 75 ? "🥈" : percentage >= 50 ? "🥉" : "📝"

    const message = [
      `${medal} <b>New Quiz Result!</b>`,
      "",
      `👤 <b>Student:</b> ${escapeTelegramHtml(name)}`,
      `📝 <b>Quiz:</b> ${escapeTelegramHtml(quiz.title)}`,
      `✅ <b>Score:</b> ${percentage}% (${correct}/${total} correct)`,
      wrong > 0 ? `❌ <b>Wrong:</b> ${wrong}` : "",
      totalTime > 0 ? `⏱️ <b>Time:</b> ${formatTime(totalTime)}` : "",
      "",
      "#TechVyro #Quiz #Leaderboard",
    ].filter(line => line !== "").join("\n")

    sendTelegramMessage(message).catch(() => {})

    return NextResponse.json({ result: data }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("quiz_results").delete().neq("id", "")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
