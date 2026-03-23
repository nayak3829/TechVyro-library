import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"


export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) return NextResponse.json({ error: "Quiz not found" }, { status: 404 })
    return NextResponse.json({ quiz: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || null
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.timeLimit !== undefined) updateData.time_limit = body.timeLimit
    if (body.questions !== undefined) updateData.questions = body.questions
    if (body.enabled !== undefined) updateData.enabled = body.enabled
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.visibility !== undefined) updateData.visibility = body.visibility
    if (body.section !== undefined) updateData.section = body.section
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty
    if (body.structureLocation !== undefined) updateData.structure_location = body.structureLocation

    const { data, error } = await supabase
      .from("quizzes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ quiz: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || null
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("quizzes").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
