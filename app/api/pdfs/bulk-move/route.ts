import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { ids, category_id } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No PDFs specified" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("pdfs")
      .update({ category_id: category_id || null })
      .in("id", ids)

    if (error) {
      console.error("Error moving PDFs:", error)
      return NextResponse.json({ error: "Failed to move PDFs" }, { status: 500 })
    }

    return NextResponse.json({ updated: ids.length })
  } catch (error) {
    console.error("Error in bulk move:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
