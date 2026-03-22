import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

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
    return NextResponse.json({ result: data })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
