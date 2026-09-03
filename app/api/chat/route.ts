import { createClient } from "@/lib/supabase/server"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"
import {
  chatRequestSchema,
  checkRateLimit,
  clientAddress,
  readBoundedJson,
  RequestBodyError,
} from "@/lib/ai-request-security"

const SYSTEM_PROMPT = `You are TechVyro Study Assistant — a smart, friendly AI tutor for Indian students preparing for competitive exams and school/college studies.

You specialize in:
- 📚 All school/college subjects: Mathematics, Physics, Chemistry, Biology, English, Hindi, History, Geography, Economics, Computer Science, Sanskrit, Political Science
- 🎯 Competitive exams: NDA, SSC CGL/CHSL, JEE Main/Advanced, NEET, UPSC, IBPS, RRB, GATE, CAT, CUET
- 📖 Concept explanations — step-by-step, with examples
- 🔍 PDF/study material recommendations from TechVyro library
- 💡 Study strategies, time management, exam tips
- 🧮 Solving problems (math, physics, chemistry numericals)
- 📝 Essay writing, grammar, comprehension help

Response Style:
- Be concise but complete. Avoid unnecessary filler sentences.
- Use **bold** for key terms, formulas, and important points
- Use numbered lists for steps/processes
- Use bullet points (•) for features/comparisons  
- Use headings (##) when explaining multi-part topics
- For math/physics: show formula first, then step-by-step solution
- For code: use code blocks
- Always respond in the same language as the student (Hindi/English/Hinglish)
- End with a helpful follow-up suggestion when appropriate

Important: Never make up PDFs. Only suggest titles that exist in the provided library list.`

export async function POST(request: Request) {
  try {
    const globalRateLimit = checkRateLimit("chat:global", 60)
    const identityRateLimit = checkRateLimit(`chat:${clientAddress(request)}`)
    if (!globalRateLimit.allowed || !identityRateLimit.allowed) {
      const rateLimit = !globalRateLimit.allowed ? globalRateLimit : identityRateLimit
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfter) },
      })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 503 })
    }

    const parsedRequest = chatRequestSchema.safeParse(await readBoundedJson(request))
    if (!parsedRequest.success) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), { status: 400 })
    }
    const { messages } = parsedRequest.data

    // Fetch PDFs for context
    let pdfContext = ""
    try {
      const supabase = await createClient()
      if (supabase) {
        const { data: pdfs } = await applyPublicPdfVisibility(supabase
          .from("pdfs")
          .select("title, description")
          )
          .order("view_count", { ascending: false })
          .limit(100)

        if (pdfs && pdfs.length > 0) {
          const pdfList = pdfs
            .map((p: { title: string; description: string | null }) => `• ${p.title}${p.description ? ` — ${p.description.slice(0, 50)}` : ""}`)
            .join("\n")
          pdfContext = `\n\n---\nTechVyro PDF Library (${pdfs.length} books available):\n${pdfList}\n\nFor PDFs, tell students to search on the website or browse by category.`
        }
      }
    } catch { /* silently ignore */ }

    const systemMessage = { role: "system", content: SYSTEM_PROMPT + pdfContext }
    const trimmedMessages = messages.slice(-16) // Keep last 16 messages

    // Call OpenAI with streaming enabled
    // Keep this deadline active until the upstream body has finished, not only
    // until its headers arrive. This prevents indefinitely-held stream slots.
    const upstreamController = new AbortController()
    const abortUpstream = () => upstreamController.abort()
    const upstreamTimeout = setTimeout(abortUpstream, 25_000)
    request.signal.addEventListener("abort", abortUpstream, { once: true })
    let openAIRes: Response
    try {
      openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [systemMessage, ...trimmedMessages],
        max_tokens: 1000,
        temperature: 0.65,
        stream: true,
      }),
        signal: upstreamController.signal,
      })
    } catch (error) {
      clearTimeout(upstreamTimeout)
      request.signal.removeEventListener("abort", abortUpstream)
      throw error
    }

    if (!openAIRes.ok) {
      clearTimeout(upstreamTimeout)
      request.signal.removeEventListener("abort", abortUpstream)
      const err = await openAIRes.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: err.error?.message || "AI error" }), { status: 500 })
    }

    // Stream the response directly to the client
    const encoder = new TextEncoder()
    let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | undefined
    const readable = new ReadableStream({
      async start(controller) {
        const reader = openAIRes.body!.getReader()
        upstreamReader = reader
        const decoder = new TextDecoder()
        let pending = ""
        let sentDone = false

        const processLine = (rawLine: string) => {
          const line = rawLine.replace(/\r$/, "")
          if (!line.startsWith("data:")) return
          const jsonStr = line.slice(5).trim()
          if (jsonStr === "[DONE]") {
            if (!sentDone) {
              sentDone = true
              controller.enqueue(encoder.encode("data: [DONE]\n\n"))
            }
            return
          }
          try {
            const parsed = JSON.parse(jsonStr)
            const token = parsed.choices?.[0]?.delta?.content || ""
            if (token) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
          } catch { /* Ignore malformed individual events. */ }
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              pending += decoder.decode()
              if (pending) processLine(pending)
              if (!sentDone) controller.enqueue(encoder.encode("data: [DONE]\n\n"))
              controller.close()
              break
            }

            pending += decoder.decode(value, { stream: true })
            const lines = pending.split("\n")
            pending = lines.pop() || ""
            lines.forEach(processLine)
          }
        } catch (err) {
          if (upstreamController.signal.aborted) controller.close()
          else controller.error(err)
        } finally {
          clearTimeout(upstreamTimeout)
          request.signal.removeEventListener("abort", abortUpstream)
          reader.releaseLock()
        }
      },
      async cancel(reason) {
        clearTimeout(upstreamTimeout)
        request.signal.removeEventListener("abort", abortUpstream)
        upstreamController.abort()
        await upstreamReader?.cancel(reason).catch(() => {})
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return new Response(JSON.stringify({ error: error.message }), { status: error.status })
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      return new Response(JSON.stringify({ error: "AI request timed out" }), { status: 504 })
    }
    console.error("[chat] Error:", error)
    return new Response(JSON.stringify({ error: "Failed to get response" }), { status: 500 })
  }
}
