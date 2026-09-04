import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

const STATUSES = ["pending", "approved", "rejected"]
const NO_STORE = { headers: { "Cache-Control": "no-store" } }
export async function GET(request: Request) {
  if (!verifyAdminToken(extractToken(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401, ...NO_STORE })
  const url = new URL(request.url)
  const status = url.searchParams.get("status") || "pending"
  const limit = Number(url.searchParams.get("limit") || "50")
  const offset = Number(url.searchParams.get("offset") || "0")
  if (!STATUSES.includes(status) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || !Number.isSafeInteger(offset) || offset < 0) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400, ...NO_STORE })
  }
  const { data, error } = await createAdminClient().from("community_submissions").select(
    "id,title,content_type,content_category,content_subcategory,subject,submitter_name,file_size,page_count,status,submitted_at,reviewed_at,approved_pdf_id",
  ).eq("status", status).order("submitted_at", { ascending: status === "pending" }).range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: "Could not load submissions" }, { status: 500, ...NO_STORE })
  return NextResponse.json({ submissions: data || [] }, NO_STORE)
}