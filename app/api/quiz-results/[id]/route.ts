import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"


export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || null
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("quiz_results").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
