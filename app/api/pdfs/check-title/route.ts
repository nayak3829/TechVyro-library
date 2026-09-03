import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    const { searchParams } = new URL(request.url)
    const title = searchParams.get("title")
    if (!title?.trim()) return NextResponse.json({ exists: false })

    const supabase = createAdminClient()

    const { data } = await supabase
      .from("pdfs")
      .select("id, title")
      .ilike("title", title.trim())
      .single()

    return NextResponse.json({ exists: !!data, existingTitle: data?.title || null })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
