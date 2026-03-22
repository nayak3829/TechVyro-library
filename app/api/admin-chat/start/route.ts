import { NextResponse } from "next/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { sendTelegramMessage } from "@/lib/telegram"

export async function POST(req: Request) {
  try {
    const { studentName } = await req.json()
    if (!studentName?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 })
    }

    const sessionId = crypto.randomUUID().slice(0, 8).toUpperCase()
    const supabase = createAdminClient()

    await supabase.from("admin_chat_sessions").insert({
      id: sessionId,
      student_name: studentName.trim(),
    })

    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    })

    await sendTelegramMessage(
      `🟢 <b>New Live Chat Started!</b>\n\n👤 <b>Student:</b> ${studentName.trim()}\n🔑 <b>Session:</b> #${sessionId}\n🕐 <b>Time:</b> ${now}\n\n<i>Reply to any message from this student to respond. Use Telegram's Reply feature for best results.</i>`
    )

    return NextResponse.json({ sessionId })
  } catch (err) {
    console.error("admin-chat/start:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
