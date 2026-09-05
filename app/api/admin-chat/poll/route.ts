import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { isValidPollCursor } from "@/lib/admin-chat-validation"
import {
  checkAdminChatRateLimit,
  getAdminChatSessionId,
  getAdminChatSessionState,
  isAdminChatSessionSecurityConfigured,
  rateLimitedResponse,
} from "@/lib/admin-chat-security"
import { isRequestOriginAllowed } from "@/lib/request-origin"

export async function GET(req: Request) {
  try {
    if (!isRequestOriginAllowed(req, { checkSafeMethods: true })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!isAdminChatSessionSecurityConfigured()) {
      return NextResponse.json({ error: "Admin chat session security is not configured" }, { status: 500 })
    }
    const sessionId = getAdminChatSessionId(req)
    if (!sessionId) {
      return NextResponse.json({ error: "Invalid or missing chat session" }, { status: 401 })
    }
    const { searchParams } = new URL(req.url)
    const since = searchParams.get("since") // ISO timestamp

    if (!isValidPollCursor(since)) {
      return NextResponse.json({ error: "Invalid poll cursor" }, { status: 400 })
    }
    const rateLimit = await checkAdminChatRateLimit("poll", req, sessionId)
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfterSeconds)

    if (!isAdminConfigured()) {
      return NextResponse.json({ messages: [] })
    }

    const supabase = createAdminClient()
    const { data: session, error: sessionError } = await supabase
      .from("admin_chat_sessions")
      .select("id, created_at, last_message_at")
      .eq("id", sessionId)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (!session) {
      return NextResponse.json({ error: "Unknown session" }, { status: 404 })
    }
    if (getAdminChatSessionState(session) === "expired") {
      return NextResponse.json({ error: "Session expired" }, { status: 410 })
    }

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
    return NextResponse.json({ error: "Failed to poll messages" }, { status: 500 })
  }
}
