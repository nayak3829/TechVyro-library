import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { invalidateQuizCache } from "@/lib/quiz-cache"
import { validateQuizPayload } from "@/lib/quiz-validation"
import { isValidStructureLocation } from "@/lib/content-structure-validation"
import { publishInAppNotification } from "@/lib/notifications"
import { becamePublicQuiz } from "@/lib/quiz-publication"

const QUIZ_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/

function studentQuizProjection(quiz: Record<string, unknown>) {
  const questions = Array.isArray(quiz.questions) ? quiz.questions.map((value) => {
    const question = value && typeof value === "object" ? value as Record<string, unknown> : {}
    const id = typeof question.id === "string" ? question.id : typeof question.qid === "string" ? question.qid : ""
    return {
      id,
      qid: id,
      question: typeof question.question === "string" ? question.question : "",
      options: Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === "string") : [],
      marks: typeof question.marks === "number" && Number.isFinite(question.marks) ? question.marks : 1,
    }
  }) : []
  return {
    id: quiz.id, title: quiz.title, description: quiz.description, category: quiz.category,
    time_limit: quiz.time_limit, enabled: quiz.enabled, questions,
  }
}

async function structureLocationExists(supabase: any, location: unknown) {
  if (!location) return true
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "folders")
    .single()
  return !error && isValidStructureLocation(location, Array.isArray(data?.value) ? data.value : [])
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const isAdmin = verifyAdminToken(extractToken(request))
    // The service-role lookup below is intentionally limited to a validated,
    // explicit path ID. Public list queries continue to expose public rows only.
    if (!isAdmin && !QUIZ_ID.test(id)) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    }
    // Question payloads are never public. Keep the established admin path for
    // content management, but require a verified Supabase session for students.
    const studentClient = isAdmin ? null : await createClient()
    if (!isAdmin) {
      const { data: { user }, error: authError } = await studentClient?.auth.getUser() ?? { data: { user: null }, error: null }
      if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // An explicit enabled unlisted link cannot be read through client RLS. Use
    // service role only after authentication and path validation, then constrain
    // the lookup to the two student-visible states.
    const supabase = createAdminClient()

    let query = supabase
      .from("quizzes")
      // Students receive only fields used to take the quiz; the question JSON
      // is further projected below to remove answer keys and explanations.
      .select(isAdmin ? "*" : "id,title,description,category,time_limit,enabled,questions")
      .eq("id", id)
    if (!isAdmin) query = query.eq("enabled", true).in("visibility", ["public", "unlisted"])
    const { data, error } = await query.single()

    if (error || !data) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    return NextResponse.json(
      { quiz: isAdmin ? data : studentQuizProjection(data as unknown as Record<string, unknown>) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    const validated = validateQuizPayload(body, true)
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })
    const supabase = createAdminClient()
    const { data: previous, error: previousError } = await supabase
      .from("quizzes")
      .select("id,title,enabled,visibility")
      .eq("id", id)
      .maybeSingle()
    if (previousError) return NextResponse.json({ error: "Failed to load quiz" }, { status: 500 })
    if (!previous) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    if (!await structureLocationExists(supabase, validated.data.structure_location)) {
      return NextResponse.json({ error: "Selected content structure location no longer exists" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("quizzes")
      .update(validated.data)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 })
    invalidateQuizCache()
    if (becamePublicQuiz(previous, data)) {
      try {
        await publishInAppNotification({
          kind: "quiz", entityId: data.id, title: `New quiz: ${data.title}`, body: "A new quiz is ready to take.",
          href: `/quiz/${data.id}`, payload: { quizId: data.id },
        })
      } catch (notificationError) {
        console.error("[notifications] Quiz fan-out failed:", notificationError)
      }
    }
    return NextResponse.json({ quiz: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from("quizzes").delete().eq("id", id).select("id").maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    invalidateQuizCache()
    if (!data) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
