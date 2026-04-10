import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"


export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ folders: [] })

    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "folders")
      .single()

    const res = NextResponse.json({ folders: data?.value ?? [] })
    // Short cache but allow revalidation - important for uploads
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return res
  } catch {
    return NextResponse.json({ folders: [] })
  }
}

export async function PUT(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || null
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "folders", value: body.folders ?? [], updated_at: new Date().toISOString() }, { onConflict: "key" })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
