import { NextResponse } from "next/server"
import { sendTelegramMessage } from "@/lib/telegram"
import {
  checkRateLimit,
  clientAddress,
  readBoundedJson,
  RequestBodyError,
} from "@/lib/ai-request-security"

const MAX_NAME_LENGTH = 80
const MAX_MESSAGE_LENGTH = 2_000

function escapeTelegramHtml(value: string) {
  return value.replace(/[&<>]/g, (character) => {
    if (character === "&") return "&amp;"
    if (character === "<") return "&lt;"
    return "&gt;"
  })
}

export async function POST(req: Request) {
  try {
    const rate = checkRateLimit(`contact-admin:${clientAddress(req)}`, 5, 10 * 60_000)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfter) },
        }
      )
    }

    const body = await readBoundedJson(req, 4 * 1024)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { name, message } = body as Record<string, unknown>
    const normalizedName = typeof name === "string" ? name.trim() : ""
    const normalizedMessage = typeof message === "string" ? message.trim() : ""

    if (!normalizedName || !normalizedMessage) {
      return NextResponse.json({ error: "Name and message required" }, { status: 400 })
    }
    if (normalizedName.length > MAX_NAME_LENGTH || normalizedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Name or message is too long" }, { status: 400 })
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

👤 <b>Name:</b> ${escapeTelegramHtml(normalizedName)}
🕐 <b>Time:</b> ${now}

💬 <b>Message:</b>
${escapeTelegramHtml(normalizedMessage)}

<i>— Sent via TechVyro AI Chatbot</i>`

    const telegramMessageId = await sendTelegramMessage(text)
    if (telegramMessageId === null) {
      return NextResponse.json({ error: "Admin messaging is temporarily unavailable" }, { status: 502 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof RequestBodyError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("contact-admin error:", err)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
