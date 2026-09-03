import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { invalidateQuizCache } from "@/lib/quiz-cache"
import { validateQuizPayload } from "@/lib/quiz-validation"
import { isValidStructureLocation } from "@/lib/content-structure-validation"

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
    // Question payloads are never public. Keep the established admin path for
    // content management, but require a verified Supabase session for students.
    const studentClient = isAdmin ? null : await createClient()
    if (!isAdmin) {
      const { data: { user }, error: authError } = await studentClient?.auth.getUser() ?? { data: { user: null }, error: null }
      if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const supabase = isAdmin ? createAdminClient() : studentClient
    if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let query = supabase
      .from("quizzes")
      .select("*")
      .eq("id", id)
    if (!isAdmin) query = query.eq("enabled", true).eq("visibility", "public")
    const { data, error } = await query.single()

    if (error || !data) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    return NextResponse.json(
      { quiz: data },
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
    if (!await structureLocationExists(supabase, validated.data.structure_location)) {
      return NextResponse.json({ error: "Selected content structure location no longer exists" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("quizzes")
      .update(validated.data)
      .eq("id", id)
      .select()
      .single()

    if (error?.code === "PGRST116") return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    if (error) return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 })
    invalidateQuizCache()
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
