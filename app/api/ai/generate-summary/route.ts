import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"


export async function POST(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "") || null
  if (!verifyAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 })
  }

  try {
    const { title, description, category } = await request.json()
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const systemPrompt = `You are an educational content assistant for TechVyro, a PDF library for students. Generate concise, helpful PDF descriptions for study materials. Write in clear, simple English suitable for students. Keep it 2-3 sentences (60-100 words). Focus on what students will learn from this material.`

    const userPrompt = `Generate a helpful description for this PDF study material:
Title: ${title.trim()}
${category ? `Subject/Category: ${category}` : ""}
${description?.trim() ? `Existing description: ${description.trim()}` : ""}

Write a new, engaging description that explains what students will learn from this PDF.`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json({ error: err.error?.message || "OpenAI API error" }, { status: 500 })
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content?.trim() || ""

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("[ai/generate-summary] Error:", error)
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}
