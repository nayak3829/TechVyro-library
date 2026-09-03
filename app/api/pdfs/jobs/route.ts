import { createAdminClient } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { NextResponse } from "next/server"
import { runDuePdfJobs } from "@/lib/pdf-job-runner"

function auth(request: Request) { return verifyAdminToken(extractToken(request)) }
export async function GET(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const url = new URL(request.url)
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 200)
  const { data, error } = await createAdminClient().from("pdf_jobs").select("*").order("created_at", { ascending: false }).limit(limit)
  if (error) return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 })
  return NextResponse.json({ jobs: data || [] })
}
export async function POST(request: Request) {
  if (!auth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (body.action === "process" || body.action === "run") {
    return NextResponse.json(await runDuePdfJobs(typeof body.limit === "number" ? body.limit : 10))
  }
  if (typeof body.id !== "string") return NextResponse.json({ error: "Job id is required" }, { status: 400 })
  const db = createAdminClient()
  const { data, error } = await db.from("pdf_jobs").update({
    status: "queued", available_at: new Date().toISOString(), leased_at: null,
    lease_expires_at: null, last_error: null, updated_at: new Date().toISOString(),
  }).eq("id", body.id).select().maybeSingle()
  if (error) return NextResponse.json({ error: "Failed to retry job" }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Job not found" }, { status: 404 })
  return NextResponse.json({ job: data })
}