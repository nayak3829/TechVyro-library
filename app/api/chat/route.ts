import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const SYSTEM_PROMPT = `You are TechVyro Study Assistant — a helpful, friendly AI tutor for Indian students. You help with:
1. Study questions across all subjects (Mathematics, Physics, Chemistry, Biology, English, History, Geography, Economics, Computer Science, Hindi, Sanskrit, NDA, SSC, JEE, NEET, CBSE, etc.)
2. Finding PDFs from TechVyro library based on the provided list
3. Explaining concepts clearly and concisely
4. Motivating students

Guidelines:
- Keep answers clear, structured, and student-friendly
- Use bullet points and numbered lists when helpful  
- For math/science, show steps clearly
- If a student asks for PDFs, suggest relevant ones from the PDF list provided
- Be encouraging and supportive
- Respond in the same language as the student (Hindi/English/Hinglish is fine)
- Keep responses concise — max 3-4 paragraphs unless a detailed explanation is truly needed
- Never make up PDFs that aren't in the list`

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 })
    }

    const { messages } = await request.json()
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 })
    }

    // Fetch recent PDFs to help with PDF search
    let pdfContext = ""
    try {
      const supabase = await createClient()
      if (supabase) {
        const { data: pdfs } = await supabase
          .from("pdfs")
          .select("id, title, description, category_id")
          .order("view_count", { ascending: false })
          .limit(80)

        if (pdfs && pdfs.length > 0) {
          const pdfList = pdfs
            .map(p => `- "${p.title}"${p.description ? `: ${p.description.slice(0, 60)}` : ""}`)
            .join("\n")
          pdfContext = `\n\nTechVyro PDF Library (most viewed first):\n${pdfList}\n\nFor PDF links, tell students to search on the website homepage.`
        }
      }
    } catch {
      // silently ignore
    }

    const systemMessage = {
      role: "system",
      content: SYSTEM_PROMPT + pdfContext,
    }

    // Keep last 20 messages to avoid token overflow
    const trimmedMessages = messages.slice(-20)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [systemMessage, ...trimmedMessages],
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json({ error: err.error?.message || "AI error" }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim() || ""

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("[chat] Error:", error)
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 })
  }
}
