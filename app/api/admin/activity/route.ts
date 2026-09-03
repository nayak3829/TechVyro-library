import { NextResponse } from "next/server"
import { z } from "zod"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.coerce.number().int().positive().optional(),
  action: z.enum(["created", "updated", "deleted"]).optional(),
  resource: z.string().regex(/^[a-z_]+$/).max(50).optional(),
  search: z.string().trim().max(100).optional(),
}).strict()

export async function GET(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 })
  }

  const searchParams = new URL(request.url).searchParams
  for (const key of new Set(searchParams.keys())) {
    if (searchParams.getAll(key).length > 1) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 })
    }
  }
  const raw = Object.fromEntries(searchParams)
  const parsed = querySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 })
  }
  const { limit, cursor, action, resource, search } = parsed.data
  const supabase = createAdminClient()
  let query = supabase
    .from("audit_events")
    .select("id, action, resource_type, resource_id, actor_type, summary, metadata, created_at")
    .order("id", { ascending: false })
    .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .limit(limit + 1)

  if (cursor) query = query.lt("id", cursor)
  if (action) query = query.eq("action", action)
  if (resource) query = query.eq("resource_type", resource)
  if (search) {
    const escapedSearch = search.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&")
    query = query.ilike("summary", `%${escapedSearch}%`)
  }

  const { data, error } = await query
  if (error) {
    console.error("[admin/activity] query failed:", error.message)
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 })
  }

  const rows = data ?? []
  const hasMore = rows.length > limit
  const events = rows.slice(0, limit)
  return NextResponse.json({
    events,
    nextCursor: hasMore ? events.at(-1)?.id ?? null : null,
    hasMore,
    retentionDays: 365,
    generatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "private, no-store" } })
}