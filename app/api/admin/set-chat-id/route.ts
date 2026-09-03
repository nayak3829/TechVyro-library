import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"

export async function POST(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { chatId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "A JSON request body is required" }, { status: 400 })
  }

  const chatId = typeof body.chatId === "string" ? body.chatId.trim() : ""
  if (!/^-?\d{1,20}$/.test(chatId)) {
    return NextResponse.json({ error: "chatId must be a valid Telegram numeric chat ID" }, { status: 400 })
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Unable to update chat ID" }, { status: 500 })
  }

  try {
    const supabase = createAdminClient()
    const { data: existing, error: readError } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general_settings")
      .single()
    if (readError && readError.code !== "PGRST116") {
      return NextResponse.json({ error: "Unable to update chat ID" }, { status: 500 })
    }

    const merged = { ...(existing?.value as object || {}), telegramChatId: chatId }
    const { error: updateError } = await supabase
      .from("site_settings")
      .upsert({ key: "general_settings", value: merged, updated_at: new Date().toISOString() }, { onConflict: "key" })

    if (updateError) {
      return NextResponse.json({ error: "Unable to update chat ID" }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: "Unable to update chat ID" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: "Telegram Chat ID updated",
  })
}
