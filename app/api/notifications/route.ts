import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FIELDS = "id,kind,title,body,href,payload,status,created_at,read_at,dismissed_at"

async function authenticatedClient() {
  const supabase = await createClient()
  if (!supabase) return { error: NextResponse.json({ error: "Database not configured" }, { status: 503 }) }
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  return { supabase, userId: user.id }
}

function parseCursor(cursor: string | null): { createdAt: string, id: string } | null | "invalid" {
  if (!cursor) return null
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    return typeof value?.createdAt === "string" && !Number.isNaN(Date.parse(value.createdAt)) && UUID.test(value.id)
      ? { createdAt: value.createdAt, id: value.id }
      : "invalid"
  } catch {
    return "invalid"
  }
}

export async function GET(request: Request) {
  const auth = await authenticatedClient()
  if ("error" in auth) return auth.error
  const { searchParams } = new URL(request.url)
  const limitValue = searchParams.get("limit") || "30"
  const limit = Number(limitValue)
  const unread = searchParams.get("unread")
  const cursor = parseCursor(searchParams.get("cursor"))
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (unread !== null && unread !== "true" && unread !== "false") || cursor === "invalid") {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 })
  }

  const unreadCountQuery = auth.supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.userId)
    .eq("status", "unread")
  let query = auth.supabase.from("notifications").select(FIELDS).eq("user_id", auth.userId)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1)
  if (unread === "true") query = query.eq("status", "unread")
  if (cursor) query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
  const [{ data, error }, { count: unreadCount, error: countError }] = await Promise.all([query, unreadCountQuery])
  if (error || countError) return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  const rows = data || []
  const page = rows.slice(0, limit)
  const last = page[page.length - 1]
  const nextCursor = rows.length > limit && last
    ? Buffer.from(JSON.stringify({ createdAt: last.created_at, id: last.id })).toString("base64url")
    : null
  return NextResponse.json({ notifications: page, nextCursor, unreadCount: unreadCount || 0 })
}

export async function PATCH(request: Request) {
  const auth = await authenticatedClient()
  if ("error" in auth) return auth.error
  const body = await request.json().catch(() => null)
  const action = body?.action
  const id = body?.id
  const all = body?.all === true
  if (!["read", "dismiss"].includes(action) || (all && id !== undefined) || (!all && (!UUID.test(id)))) {
    return NextResponse.json({ error: "Provide a notification id or all: true with a valid action" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const changes = action === "read"
    ? { status: "read", read_at: now, dismissed_at: null }
    : { status: "dismissed", dismissed_at: now }
  let query = auth.supabase.from("notifications").update(changes).eq("user_id", auth.userId)
  if (all) {
    query = action === "read" ? query.eq("status", "unread") : query.in("status", ["unread", "read"])
  } else {
    query = query.eq("id", id)
  }
  const { data, error } = await query.select("id,status,read_at,dismissed_at")
  if (error) return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  return NextResponse.json({ notifications: data || [] })
}