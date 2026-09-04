import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getQuizList, invalidateQuizCache } from "@/lib/quiz-cache"
import { validateQuizPayload } from "@/lib/quiz-validation"
import { isValidStructureLocation } from "@/lib/content-structure-validation"
import { publishInAppNotification } from "@/lib/notifications"

async function structureLocationExists(supabase: any, location: unknown) {
  if (!location) return true
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "folders")
    .single()
  return !error && isValidStructureLocation(location, Array.isArray(data?.value) ? data.value : [])
}

export async function GET(request: Request) {
  try {
    const isAdmin = verifyAdminToken(extractToken(request))
    // Admin reads must observe changes made by another process immediately.
    const list = await getQuizList({ bypassCache: true })
    const quizzes = isAdmin
      ? list
      : list
        .filter((quiz) => quiz.enabled && quiz.hasContent && quiz.visibility === "public")
        .map(quiz => ({
          ...quiz,
          questions: quiz.questions.map(question => ({ id: typeof question.id === "string" ? question.id : "" })),
        }))
    const response = NextResponse.json({ quizzes })
    response.headers.set("Cache-Control", "private, no-store")
    return response
  } catch (err) {
    console.error("[quiz-api] GET quizzes exception:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => null)
    const validated = validateQuizPayload(body)
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })
    const supabase = createAdminClient()
    if (!await structureLocationExists(supabase, validated.data.structure_location)) {
      return NextResponse.json({ error: "Selected content structure location no longer exists" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("quizzes")
      .insert({ ...validated.data, created_at: new Date().toISOString() })
      .select()
      .single()

    if (error?.code === "23505") return NextResponse.json({ error: "A quiz with this ID already exists" }, { status: 409 })
    if (error) return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 })
    invalidateQuizCache()
    if (data.visibility === "public" && data.enabled) {
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
