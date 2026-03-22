import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function verifyAdminToken(token: string | null): boolean {
  if (!token) return false
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const [storedPassword, timestamp] = decoded.split(":")
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    const maxAge = 24 * 60 * 60 * 1000
    return storedPassword === adminPassword && tokenAge < maxAge
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, description, category, time_limit, questions, enabled, created_at, tags, visibility, section, difficulty, structure_location")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[quiz-api] GET quizzes error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ quizzes: data || [] })
  } catch (err) {
    console.error("[quiz-api] GET quizzes exception:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || null
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        id: body.id,
        title: body.title,
        description: body.description || "",
        category: body.category || "General",
        time_limit: body.timeLimit || 1200,
        questions: body.questions || [],
        enabled: body.enabled !== undefined ? body.enabled : true,
        created_at: body.createdAt || new Date().toISOString(),
        tags: body.tags || [],
        visibility: body.visibility || "public",
        section: body.section || "General",
        difficulty: body.difficulty || "medium",
        structure_location: body.structureLocation || null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ quiz: data })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
