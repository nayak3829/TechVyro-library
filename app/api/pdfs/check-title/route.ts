import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get("title")
    if (!title?.trim()) return NextResponse.json({ exists: false })

    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ exists: false })

    const { data } = await supabase
      .from("pdfs")
      .select("id, title")
      .ilike("title", title.trim())
      .single()

    return NextResponse.json({ exists: !!data, existingTitle: data?.title || null })
  } catch {
    return NextResponse.json({ exists: false })
  }
}
