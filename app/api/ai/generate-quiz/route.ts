import { NextResponse } from "next/server"

function verifyAdminToken(token: string | null): boolean {
  if (!token) return false
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const [storedPassword, timestamp] = decoded.split(":")
    const tokenAge = Date.now() - parseInt(timestamp, 10)
    return storedPassword === adminPassword && tokenAge < 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

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
    const { topic, category, count = 5, difficulty = "medium" } = await request.json()
    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 })
    }

    const difficultyInstructions: Record<string, string> = {
      easy: "simple, straightforward questions suitable for beginners",
      medium: "moderate difficulty questions requiring good understanding",
      hard: "challenging questions requiring deep knowledge and analytical thinking",
    }

    const systemPrompt = `You are an expert quiz creator for TechVyro, an educational platform for Indian students preparing for competitive exams (NDA, SSC, CBSE, JEE, NEET etc.). Create high-quality multiple choice questions. Always respond with valid JSON only, no extra text.`

    const userPrompt = `Create ${count} ${difficulty} MCQ quiz questions about: "${topic.trim()}"
${category ? `Subject: ${category}` : ""}
Difficulty: ${difficultyInstructions[difficulty] || difficultyInstructions.medium}

Return ONLY valid JSON in this exact format:
{
  "title": "Quiz title here",
  "description": "Brief description of what this quiz covers",
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 1,
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}

Rules:
- "correct" is 1-based index (1=A, 2=B, 3=C, 4=D)
- All options must be plausible
- Write clear, unambiguous questions
- Explanations should be educational
- Do not number the options in the text`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 3000,
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return NextResponse.json({ error: err.error?.message || "OpenAI API error" }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || "{}"

    let parsed: {
      title?: string
      description?: string
      questions?: Array<{
        question: string
        options: string[]
        correct: number
        explanation: string
      }>
    }
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    if (!parsed.questions?.length) {
      return NextResponse.json({ error: "No questions generated" }, { status: 500 })
    }

    const quiz = {
      id: generateId(),
      title: parsed.title || `${topic} Quiz`,
      description: parsed.description || `AI-generated quiz about ${topic}`,
      category: category || "General",
      timeLimit: count * 60,
      difficulty,
      enabled: false,
      createdAt: new Date().toISOString(),
      questions: parsed.questions.map((q) => ({
        id: generateId(),
        type: "mcq" as const,
        question: q.question,
        options: q.options || [],
        correct: q.correct || 1,
        correctOptions: [],
        marks: 1,
        negativeMarks: 0,
        explanation: q.explanation || "",
        timeLimit: 0,
      })),
    }

    return NextResponse.json({ quiz })
  } catch (error) {
    console.error("[ai/generate-quiz] Error:", error)
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 })
  }
}
