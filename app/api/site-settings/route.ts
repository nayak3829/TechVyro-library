import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get("key")

  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ settings: {} })

    if (key) {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .single()
      return NextResponse.json({ value: data?.value ?? null })
    }

    const { data } = await supabase.from("site_settings").select("key, value")
    const settings: Record<string, unknown> = {}
    for (const row of data ?? []) {
      settings[row.key] = row.value
    }
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ settings: {} })
  }
}

export async function PUT(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || null
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Use admin client (service role key) to bypass RLS for write operations
    const supabase = createAdminClient()

    // Ensure table exists before upserting (ignore errors if RPC doesn't exist)
    try { await supabase.rpc("create_site_settings_if_not_exists") } catch { /* ignore */ }

    const entries = Object.entries(body as Record<string, unknown>).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from("site_settings")
      .upsert(entries, { onConflict: "key" })

    if (error) {
      // If table doesn't exist, try to create it via raw SQL then retry
      if (error.code === "42P01") {
        const { error: createError } = await supabase.rpc("exec_sql", {
          sql: `CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW());`
        })
        if (!createError) {
          const { error: retryError } = await supabase.from("site_settings").upsert(entries, { onConflict: "key" })
          if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 })
          return NextResponse.json({ success: true })
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
