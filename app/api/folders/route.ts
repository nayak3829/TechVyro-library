import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { validateContentStructure } from "@/lib/content-structure-validation"


export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "folders")
      .single()

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    const res = NextResponse.json({ folders: data?.value ?? [] })
    // Short cache but allow revalidation - important for uploads
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return res
  } catch {
    return NextResponse.json({ error: "Unable to load folders" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    if (!Array.isArray(body?.folders)) {
      return NextResponse.json({ error: "folders must be an array" }, { status: 400 })
    }
    const validated = validateContentStructure(body.folders)
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 })
    const supabase = createAdminClient()

    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "folders", value: validated.folders, updated_at: new Date().toISOString() }, { onConflict: "key" })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
