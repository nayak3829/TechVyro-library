import { NextResponse } from "next/server"
import { sendTelegramMessage } from "@/lib/telegram"

export async function POST(req: Request) {
  try {
    const { name, message } = await req.json()

    if (!name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Name and message required" }, { status: 400 })
    }

    const now = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    const text = `📨 <b>New Student Message</b>

👤 <b>Name:</b> ${name.trim()}
🕐 <b>Time:</b> ${now}

💬 <b>Message:</b>
${message.trim()}

<i>— Sent via TechVyro AI Chatbot</i>`

    await sendTelegramMessage(text)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("contact-admin error:", err)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
