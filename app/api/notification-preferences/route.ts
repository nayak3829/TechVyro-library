import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const FIELDS = "pdfs,quizzes,tests,digest_mode,created_at,updated_at"

async function authenticatedUser() {
  const supabase = await createClient()
  if (!supabase) return { error: NextResponse.json({ error: "Database not configured" }, { status: 503 }) }
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  return { userId: user.id }
}

async function preferencesFor(userId: string) {
  const db = createAdminClient()
  const existing = await db.from("notification_preferences").select(FIELDS).eq("user_id", userId).maybeSingle()
  if (existing.error) throw new Error(existing.error.message)
  if (existing.data) return existing.data

  const inserted = await db.from("notification_preferences").insert({ user_id: userId }).select(FIELDS).maybeSingle()
  if (inserted.data) return inserted.data
  // A simultaneous first request may have won the unique-key race.
  const raced = await db.from("notification_preferences").select(FIELDS).eq("user_id", userId).maybeSingle()
  if (raced.error || !raced.data) throw new Error(inserted.error?.message || raced.error?.message || "Could not initialize preferences")
  return raced.data
}

export async function GET() {
  const auth = await authenticatedUser()
  if ("error" in auth) return auth.error
  try {
    return NextResponse.json({ preferences: await preferencesFor(auth.userId) })
  } catch (error) {
    console.error("[notifications] preference initialization failed:", error)
    return NextResponse.json({ error: "Failed to load notification preferences" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticatedUser()
  if ("error" in auth) return auth.error
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid preferences" }, { status: 400 })
  const allowed = ["pdfs", "quizzes", "tests", "digest_mode"]
  const keys = Object.keys(body)
  if (!keys.length || keys.some(key => !allowed.includes(key)) ||
    ["pdfs", "quizzes", "tests"].some(key => key in body && typeof body[key] !== "boolean") ||
    ("digest_mode" in body && !["immediate", "daily"].includes(body.digest_mode))) {
    return NextResponse.json({ error: "Invalid notification preferences" }, { status: 400 })
  }
  try {
    await preferencesFor(auth.userId)
    const { data, error } = await createAdminClient().from("notification_preferences")
      .update({ ...body, updated_at: new Date().toISOString() }).eq("user_id", auth.userId).select(FIELDS).single()
    if (error) return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 })
    return NextResponse.json({ preferences: data })
  } catch (error) {
    console.error("[notifications] preference update failed:", error)
    return NextResponse.json({ error: "Failed to update notification preferences" }, { status: 500 })
  }
}