import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

interface RouteProps {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // Increment view count
    const { error } = await supabase.rpc("increment_view_count", { pdf_id: id })

    if (error) {
      // Fallback to manual increment if RPC doesn't exist
      const { data: pdf } = await supabase
        .from("pdfs")
        .select("view_count")
        .eq("id", id)
        .single()

      if (pdf) {
        await supabase
          .from("pdfs")
          .update({ view_count: (pdf.view_count || 0) + 1 })
          .eq("id", id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] View count error:", error)
    return NextResponse.json({ error: "Failed to update view count" }, { status: 500 })
  }
}
