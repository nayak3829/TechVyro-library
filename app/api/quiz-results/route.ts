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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

function gradeAnswers(questions: unknown, answers: unknown) {
  if (!Array.isArray(questions) || !answers || typeof answers !== "object" || Array.isArray(answers)) return null
  const answerMap = answers as Record<string, unknown>
  const questionIds = new Set<string>()
  let correct = 0
  let wrong = 0
  for (const question of questions) {
    if (!question || typeof question !== "object") return null
    const raw = question as Record<string, unknown>
    const id = typeof raw.qid === "string" ? raw.qid : typeof raw.id === "string" ? raw.id : ""
    const options = raw.options
    const correctOption = raw.correct
    if (!id || questionIds.has(id) || !Array.isArray(options) || options.length === 0
      || !options.every(option => typeof option === "string") || !Number.isSafeInteger(correctOption)
      || (correctOption as number) < 1 || (correctOption as number) > options.length) return null
    questionIds.add(id)
    const answer = answerMap[id]
    if (answer !== undefined) {
      if (!Number.isSafeInteger(answer) || (answer as number) < 1 || (answer as number) > options.length) return null
      if (answer === correctOption) correct++
      else wrong++
    }
  }
  if (Object.keys(answerMap).some(id => !questionIds.has(id))) return null
  return { correct, wrong, skipped: questions.length - correct - wrong }
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

    if ("correct" in payload || "wrong" in payload || "skipped" in payload || "score" in payload || "percentage" in payload) {
      return NextResponse.json({ error: "Quiz scores must be calculated by the server" }, { status: 400 })
    }
    const clientAttemptId = typeof payload.clientAttemptId === "string" ? payload.clientAttemptId : ""
    if (!UUID_PATTERN.test(clientAttemptId)) return NextResponse.json({ error: "A valid client attempt ID is required" }, { status: 400 })
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

    const grading = gradeAnswers(quiz.questions, payload.answers)
    if (!grading) return NextResponse.json({ error: "Answers do not match this quiz's question and option format" }, { status: 400 })
    const { correct, wrong, skipped } = grading
    const total = correct + wrong + skipped
    const quizTimeLimit = typeof quiz.time_limit === "number" && Number.isSafeInteger(quiz.time_limit) && quiz.time_limit >= 0
      ? quiz.time_limit
      : MAX_TOTAL_TIME_SECONDS
    if (totalTime > Math.min(quizTimeLimit, MAX_TOTAL_TIME_SECONDS)) {
      return NextResponse.json({ error: "Total time exceeds this quiz's time limit" }, { status: 400 })
    }

    // Do not trust client-generated IDs, scores, percentages, timestamps, or user IDs.
    const percentage = Math.round((correct / total) * 100)
    const score = correct - (wrong * 0.25)

    const { data: submission, error } = await admin.rpc("insert_quiz_result_and_award_progress", {
      p_result_id: crypto.randomUUID(),
      p_user_id: user.id,
      p_client_attempt_id: clientAttemptId,
      p_name: name,
      p_score: score,
      p_percentage: percentage,
      p_correct: correct,
      p_wrong: wrong,
      p_skipped: skipped,
      p_total_time: totalTime,
      p_quiz_id: quiz.id,
      p_quiz_title: quiz.title,
    })
    if (error || !submission || typeof submission !== "object") {
      console.error("[quiz-results] Atomic result/progression write failed:", error?.message)
      return NextResponse.json({ error: "Failed to save quiz result" }, { status: 500 })
    }
    const saved = submission as {
      result: Record<string, unknown>
      progression: unknown
      duplicate: boolean
    }

    // Send Telegram notification (fire and forget)
    if (!saved.duplicate) {
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
    }

    return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } })
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
