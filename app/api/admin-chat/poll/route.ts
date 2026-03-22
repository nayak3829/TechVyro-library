import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get("sessionId")
    const since = searchParams.get("since") // ISO timestamp

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ messages: [] })
    }

    const supabase = createAdminClient()

    let query = supabase
      .from("admin_chat_messages")
      .select("id, sender, message, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })

    if (since) {
      query = query.gt("created_at", since)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ messages: data || [] })
  } catch (err) {
    console.error("admin-chat/poll:", err)
    return NextResponse.json({ messages: [] })
  }
}
