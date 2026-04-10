import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { searchParams } = request.nextUrl
    const search = searchParams.get("search")?.trim() || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "1000"), 1000)
    const offset = parseInt(searchParams.get("offset") || "0")
    const categoryId = searchParams.get("categoryId") || ""

    let query = supabase
      .from("pdfs")
      .select(`*, category:categories(*)`)
      .order("created_at", { ascending: false })

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    if (limit < 1000) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error("[pdfs] Error fetching PDFs:", error)
      return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 })
    }

    // Prevent caching to ensure fresh data after uploads
    const response = NextResponse.json({ pdfs: data || [] })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return response
  } catch (error) {
    console.error("[pdfs] PDFs GET error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
