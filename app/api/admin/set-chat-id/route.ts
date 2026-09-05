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
    const { error: updateError } = await supabase.rpc("patch_site_setting_json", {
      p_key: "general_settings",
      p_patch: { telegramChatId: chatId },
    })
    if (updateError) {
      console.error("[admin/set-chat-id] Atomic settings update failed:", updateError.message)
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
