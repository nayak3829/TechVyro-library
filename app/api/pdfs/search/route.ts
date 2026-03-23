import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q")?.trim() || "").slice(0, 200)
  const limit = Math.min(parseInt(searchParams.get("limit") || "8", 10), 20)

  if (!q) return NextResponse.json({ pdfs: [] })

  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 })

    const { data, error } = await supabase
      .from("pdfs")
      .select("id, title, download_count, view_count, created_at")
      .ilike("title", `%${q}%`)
      .order("download_count", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[pdfs/search] error:", error)
      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }

    return NextResponse.json({ pdfs: data || [] })
  } catch (err) {
    console.error("[pdfs/search] error:", err)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
