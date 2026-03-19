import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    
    const { data, error } = await supabase
      .from("pdfs")
      .select(`
        *,
        category:categories(*)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching PDFs:", error)
      return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 })
    }

    return NextResponse.json({ pdfs: data })
  } catch (error) {
    console.error("[v0] PDFs GET error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
