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

    const { data } = await supabase.rpc("find_pdfs_by_normalized_title", {
      p_title: title.trim(), p_exclude_id: null, p_limit: 10,
    })

    const matches = Array.isArray(data) ? data : []
    return NextResponse.json({ exists: matches.length > 0, existingTitle: matches[0]?.title || null, matches })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
