import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const NO_STORE = { headers: { "Cache-Control": "no-store" } }
export async function GET(request: Request) {
  const db = await createClient()
  if (!db) return NextResponse.json({ error: "Authentication service is unavailable" }, { status: 503, ...NO_STORE })
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...NO_STORE })
  const url = new URL(request.url)
  const page = Number(url.searchParams.get("page") || "1")
  const limit = Number(url.searchParams.get("limit") || "20")
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    return NextResponse.json({ error: "Invalid pagination" }, { status: 400, ...NO_STORE })
  }
  const from = (page - 1) * limit
  const { data, error } = await db.from("community_submissions")
    .select("id,title,status,rejection_reason,approved_pdf_id,submitted_at,reviewed_at")
    .eq("user_id", user.id).order("submitted_at", { ascending: false }).range(from, from + limit - 1)
  if (error) return NextResponse.json({ error: "Could not load submissions" }, { status: 500, ...NO_STORE })
  return NextResponse.json({ submissions: data || [], page, limit }, NO_STORE)
}