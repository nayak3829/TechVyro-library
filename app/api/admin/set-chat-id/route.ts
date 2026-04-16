import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chatId = searchParams.get("id")
  const password = searchParams.get("pwd")

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized — add ?pwd=YOUR_ADMIN_PASSWORD to the URL" }, { status: 401 })
  }

  if (!chatId) {
    return NextResponse.json({ error: "Add ?id=YOUR_CHAT_ID to the URL (get it from @userinfobot on Telegram)" })
  }

  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  const supabase = createAdminClient()

  // Try to create table first (in case it doesn't exist)
  try {
    await supabase.rpc("exec_sql", {
      sql: `CREATE TABLE IF NOT EXISTS site_settings (key TEXT PRIMARY KEY, value JSONB NOT NULL DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW()); ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;`
    })
  } catch {
    // Ignore errors - table may already exist or exec_sql may not be available
  }

  const { error } = await supabase
    .from("site_settings")
    .upsert({
      key: "general_settings",
      value: { telegramChatId: chatId },
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" })

  if (error) {
    // Try merge approach if upsert fails
    const { data: existing } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "general_settings")
      .single()

    const merged = { ...(existing?.value as object || {}), telegramChatId: chatId }

    const { error: updateError } = await supabase
      .from("site_settings")
      .upsert({ key: "general_settings", value: merged, updated_at: new Date().toISOString() }, { onConflict: "key" })

    if (updateError) {
      return NextResponse.json({ error: updateError.message, code: updateError.code }, { status: 500 })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Telegram Chat ID set to: ${chatId}`,
    next_step: "Now test: /api/admin/test-telegram"
  })
}
