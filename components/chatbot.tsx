"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Send, User, Loader2, ChevronDown, Minimize2, GraduationCap, Sparkles, MessageSquareHeart, ArrowLeft, ShieldCheck, Copy, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  streaming?: boolean
}

interface LiveMessage {
  id: string
  sender: "student" | "admin"
  message: string
  created_at: string
}

const QUICK_PROMPTS = [
  { label: "📚 PDFs", text: "Physics ke important PDFs suggest karo" },
  { label: "🧮 Math", text: "Quadratic equation solve karna sikhaao step by step" },
  { label: "⚛️ Physics", text: "Newton ke 3 laws of motion explain karo examples ke saath" },
  { label: "🎯 NDA", text: "NDA 2025 exam ki best preparation strategy kya hai?" },
  { label: "🧬 Bio", text: "Cell division (Mitosis vs Meiosis) ka difference samjhao" },
  { label: "📝 English", text: "Letter writing format — formal letter kaise likhein?" },
]

// ── Rich Markdown Renderer ──────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const lines = text.split("\n")
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      nodes.push(
        <div key={i} className="mt-2 mb-1 rounded-lg overflow-hidden border border-violet-200/40 dark:border-violet-700/30">
          {lang && (
            <div className="bg-violet-100/60 dark:bg-violet-900/40 px-2.5 py-0.5 text-[9px] font-mono font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              {lang}
            </div>
          )}
          <pre className="bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-[10px] font-mono leading-relaxed overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {codeLines.join("\n")}
          </pre>
        </div>
      )
      i++
      continue
    }

    // Inline code (single line)
    if (trimmed.match(/^`[^`]+`$/)) {
      nodes.push(
        <code key={i} className="block mt-1 px-2 py-1 bg-slate-100 dark:bg-slate-800/60 rounded text-[10px] font-mono text-violet-700 dark:text-violet-300">
          {trimmed.slice(1, -1)}
        </code>
      )
      i++
      continue
    }

    // Heading ##
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <p key={i} className="mt-2 mb-0.5 text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
          {trimmed.slice(3)}
        </p>
      )
      i++; continue
    }
    if (trimmed.startsWith("# ")) {
      nodes.push(
        <p key={i} className="mt-2 mb-0.5 text-[12px] font-bold text-foreground">
          {trimmed.slice(2)}
        </p>
      )
      i++; continue
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      nodes.push(<hr key={i} className="my-1.5 border-border/30" />)
      i++; continue
    }

    // Empty line
    if (!trimmed) {
      nodes.push(<div key={i} className="h-1" />)
      i++; continue
    }

    // Bullet list
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      nodes.push(
        <div key={i} className="flex gap-1.5 mt-0.5">
          <span className="text-violet-500 dark:text-violet-400 shrink-0 font-bold mt-px leading-tight">•</span>
          <span className="leading-relaxed text-[11px]" dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed.replace(/^[-•*]\s+/, "")) }} />
        </div>
      )
      i++; continue
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
    if (numMatch) {
      nodes.push(
        <div key={i} className="flex gap-1.5 mt-0.5">
          <span className="text-violet-600 dark:text-violet-400 shrink-0 font-bold text-[10px] min-w-[14px] mt-0.5 leading-tight">{numMatch[1]}.</span>
          <span className="leading-relaxed text-[11px]" dangerouslySetInnerHTML={{ __html: inlineFormat(numMatch[2]) }} />
        </div>
      )
      i++; continue
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className="mt-0.5 leading-relaxed text-[11px]" dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
    )
    i++
  }

  return nodes
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code class=\"px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono text-violet-700 dark:text-violet-300\">$1</code>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
}

// ── Copy Button ─────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
      title="Copy"
    >
      {copied
        ? <Check className="h-2.5 w-2.5 text-green-500" />
        : <Copy className="h-2.5 w-2.5 text-muted-foreground/60" />
      }
    </button>
  )
}

// ── Suggested Follow-up Questions ──────────────────
const FOLLOW_UPS: Record<string, string[]> = {
  physics: ["Formula chart chahiye?", "Practice problems do", "Real life example batao"],
  math: ["Aur examples do", "Short trick hai koi?", "Practice set chahiye"],
  chemistry: ["Reaction mechanism explain karo", "Important formulas list karo"],
  nda: ["Cut-off marks kya hai?", "Study schedule banao", "Important topics batao"],
  default: ["Aur detail mein batao", "Example do", "Practice questions do"],
}

function getSuggestedFollowUps(lastMsg: string): string[] {
  const lower = lastMsg.toLowerCase()
  if (lower.includes("physics") || lower.includes("newton") || lower.includes("force")) return FOLLOW_UPS.physics
  if (lower.includes("math") || lower.includes("equation") || lower.includes("algebra")) return FOLLOW_UPS.math
  if (lower.includes("chemistry") || lower.includes("reaction") || lower.includes("element")) return FOLLOW_UPS.chemistry
  if (lower.includes("nda") || lower.includes("exam") || lower.includes("preparation")) return FOLLOW_UPS.nda
  return FOLLOW_UPS.default
}

// ── AI CHAT MODE ──────────────────────────────────────
function AiChat({ onSwitchToAdmin }: { onSwitchToAdmin: () => void }) {
  const INITIAL_MSG: Message = {
    id: "welcome",
    role: "assistant",
    content: "**Namaste! 🎓 Main TechVyro AI Assistant hoon.**\n\nMain aapki madad kar sakta hoon:\n- **📚 Study Questions** — Maths, Physics, Chemistry, Biology, English, History...\n- **🔍 PDF Dhundhna** — Library mein available study materials\n- **🎯 Exam Prep** — NDA, JEE, NEET, SSC, UPSC strategies\n- **🧮 Problems Solve** — Numericals, equations, derivations\n\nNeeche se topic choose karo ya apna sawaal type karo! 👇",
    timestamp: new Date(),
  }

  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150)
  }, [])

  const lastAiMsg = messages.filter(m => m.role === "assistant" && m.id !== "welcome").slice(-1)[0]
  const suggestions = lastAiMsg ? getSuggestedFollowUps(lastAiMsg.content) : []

  function clearChat() {
    abortRef.current?.abort()
    setMessages([INITIAL_MSG])
    setStreaming(false)
    setShowSuggestions(false)
  }

  async function sendMessage(text?: string) {
    const content = (text || input).trim()
    if (!content || streaming) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", content, timestamp: new Date() }
    const aiMsgId = (Date.now() + 1).toString()
    const aiMsg: Message = { id: aiMsgId, role: "assistant", content: "", timestamp: new Date(), streaming: true }

    // Snapshot current messages to avoid stale closure & React Strict Mode double-run
    const currentMessages = messages
    setMessages([...currentMessages, userMsg, aiMsg])
    setInput("")
    setStreaming(true)
    setShowSuggestions(false)

    const history = currentMessages
      .filter(m => m.id !== "welcome" && !m.streaming)
      .concat([{ ...userMsg }])
      .map(m => ({ role: m.role, content: m.content }))

    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error("Stream failed")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.token) {
              fullText += parsed.token
              setMessages(prev => prev.map(m =>
                m.id === aiMsgId ? { ...m, content: fullText } : m
              ))
            }
          } catch { /* skip */ }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, streaming: false, content: fullText || "Kuch gadbad ho gaya, dobara try karo." } : m
      ))
      setShowSuggestions(true)
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, streaming: false, content: m.content || "Response cancelled." } : m
        ))
      } else {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, streaming: false, content: "⚠️ Network error. Please dobara try karo." } : m
        ))
      }
    } finally {
      setStreaming(false)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-gradient-to-b from-muted/10 to-background">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            {/* Avatar */}
            <div className={cn(
              "shrink-0 flex h-6 w-6 items-center justify-center rounded-full mt-0.5",
              msg.role === "user"
                ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                : "bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/50 dark:to-purple-900/50 text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-700/60"
            )}>
              {msg.role === "user" ? <User className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
            </div>

            {/* Bubble */}
            <div className={cn("group max-w-[82%] flex flex-col gap-0.5", msg.role === "user" ? "items-end" : "items-start")}>
              <div className={cn(
                "px-3 py-2 rounded-2xl text-xs leading-relaxed relative",
                msg.role === "user"
                  ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-tr-sm"
                  : "bg-card border border-border/40 text-foreground rounded-tl-sm shadow-sm"
              )}>
                {msg.role === "assistant"
                  ? msg.streaming && msg.content === ""
                    ? (
                      <div className="flex items-center gap-1 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )
                    : <div>{renderMarkdown(msg.content)}{msg.streaming && <span className="inline-block w-0.5 h-3 bg-violet-500 animate-pulse ml-0.5 align-middle" />}</div>
                  : <p className="text-xs leading-relaxed">{msg.content}</p>
                }
              </div>

              {/* Copy + timestamp for AI messages */}
              {msg.role === "assistant" && !msg.streaming && msg.id !== "welcome" && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={msg.content} />
                  <span className="text-[9px] text-muted-foreground/40">
                    {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              )}

              {/* Timestamp for user messages */}
              {msg.role === "user" && (
                <span className="text-[9px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                </span>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts (on welcome only) */}
      {messages.length === 1 && (
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => sendMessage(p.text)}
              className="shrink-0 px-2.5 py-1.5 rounded-full border border-violet-200/60 dark:border-violet-700/40 bg-violet-50/50 dark:bg-violet-950/30 hover:bg-violet-100/60 dark:hover:bg-violet-900/40 transition-colors text-[11px] text-violet-700 dark:text-violet-300 font-medium whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Follow-up suggestions */}
      {showSuggestions && suggestions.length > 0 && !streaming && (
        <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto no-scrollbar">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => { sendMessage(s); setShowSuggestions(false) }}
              className="shrink-0 px-2.5 py-1 rounded-full border border-violet-200/60 dark:border-violet-700/40 bg-violet-50/40 dark:bg-violet-950/20 hover:bg-violet-100/60 dark:hover:bg-violet-900/30 transition-colors text-[10px] text-violet-600 dark:text-violet-400 whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Admin connect banner */}
      <div className="shrink-0 mx-3 mb-2">
        <button
          onClick={onSwitchToAdmin}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-violet-200/50 dark:border-violet-800/40 bg-gradient-to-r from-violet-50/60 to-purple-50/60 dark:from-violet-950/20 dark:to-purple-950/20 hover:from-violet-100/70 hover:to-purple-100/70 dark:hover:from-violet-900/30 dark:hover:to-purple-900/30 transition-all"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
            <MessageSquareHeart className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300 leading-tight">Admin se Live Chat Karo</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Real-time chat → Admin Telegram pe reply karega</p>
          </div>
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        </button>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border/40 px-3 py-2.5 bg-muted/10">
        <div className="flex gap-2">
          {/* Stop / Clear buttons */}
          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
              title="Stop generation"
            >
              <span className="h-3 w-3 rounded-sm bg-red-500" />
            </button>
          ) : messages.length > 1 ? (
            <button
              onClick={clearChat}
              className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60 text-muted-foreground transition-colors"
              title="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}

          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Kuch bhi poochho..."
            className="h-9 text-xs rounded-xl border-border/50 bg-background focus:border-violet-400 transition-colors flex-1"
            disabled={streaming}
            maxLength={500}
          />
          <Button
            size="sm"
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="h-9 w-9 p-0 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-sm shadow-violet-500/30 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-violet-400" />
            GPT-4o powered • Streaming
          </p>
          {input.length > 400 && (
            <span className={cn("text-[9px]", input.length > 480 ? "text-red-400" : "text-muted-foreground/60")}>
              {input.length}/500
            </span>
          )}
        </div>
      </div>
    </>
  )
}

// ── ADMIN LIVE CHAT MODE ──────────────────────────────
function AdminLiveChat({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<"name" | "chat">("name")
  const [studentName, setStudentName] = useState("")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [ended, setEnded] = useState(false)

  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [lastSince, setLastSince] = useState<string | null>(null)
  const [adminTyping, setAdminTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionRef = useRef<string | null>(null)
  const studentNameRef = useRef<string>("")
  const endedRef = useRef(false)

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 150)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [liveMessages])

  // Keep refs in sync so beforeunload / unmount can access current values
  useEffect(() => { sessionRef.current = sessionId }, [sessionId])
  useEffect(() => { studentNameRef.current = studentName }, [studentName])
  useEffect(() => { endedRef.current = ended }, [ended])

  // Notify admin when user leaves (tab close / refresh)
  useEffect(() => {
    function handleBeforeUnload() {
      if (sessionRef.current) {
        navigator.sendBeacon("/api/admin-chat/end", JSON.stringify({
          sessionId: sessionRef.current,
          studentName: studentNameRef.current,
          reason: "tab_closed",
        }))
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  // Notify admin when component unmounts (back/close button)
  useEffect(() => {
    return () => {
      if (sessionRef.current && !endedRef.current) {
        fetch("/api/admin-chat/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionRef.current,
            studentName: studentNameRef.current,
            reason: "left",
          }),
          keepalive: true,
        }).catch(() => {})
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function endSessionManually() {
    if (!sessionId || ended) return
    setEnded(true)
    endedRef.current = true
    if (pollRef.current) clearInterval(pollRef.current)
    try {
      await fetch("/api/admin-chat/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, studentName, reason: "ended_by_user" }),
      })
    } catch {}
    onBack()
  }

  const pollMessages = useCallback(async (sid: string, since: string | null) => {
    try {
      const url = `/api/admin-chat/poll?sessionId=${sid}${since ? `&since=${encodeURIComponent(since)}` : ""}`
      const res = await fetch(url)
      const data = await res.json()
      const newMsgs: LiveMessage[] = data.messages || []

      if (newMsgs.length > 0) {
        setLiveMessages(prev => [...prev, ...newMsgs])
        setLastSince(newMsgs[newMsgs.length - 1].created_at)
        setAdminTyping(false)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (step !== "chat" || !sessionId) return

    // Start polling every 3 seconds
    pollRef.current = setInterval(() => {
      pollMessages(sessionId, lastSince)
    }, 3000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [step, sessionId, lastSince, pollMessages])

  async function startSession() {
    if (!studentName.trim() || starting) return
    setStarting(true)

    try {
      const res = await fetch("/api/admin-chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: studentName.trim() }),
      })
      const data = await res.json()

      if (data.sessionId) {
        setSessionId(data.sessionId)
        setStep("chat")
        setLiveMessages([{
          id: "system-1",
          sender: "admin",
          message: `✅ Chat shuru ho gaya! Admin ko Telegram notification bhej di gayi hai. Woh jald reply karenge. Session ID: #${data.sessionId}`,
          created_at: new Date().toISOString(),
        }])
        setTimeout(() => inputRef.current?.focus(), 200)
      } else {
        alert("Chat start nahi hua. Please dobara try karo.")
      }
    } catch {
      alert("Network error. Please try again.")
    } finally {
      setStarting(false)
    }
  }

  async function sendMsg() {
    if (!input.trim() || sending || !sessionId) return
    const text = input.trim()

    const tempMsg: LiveMessage = {
      id: Date.now().toString(),
      sender: "student",
      message: text,
      created_at: new Date().toISOString(),
    }

    setLiveMessages(prev => [...prev, tempMsg])
    setInput("")
    setSending(true)

    try {
      await fetch("/api/admin-chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text, studentName }),
      })
      setLastSince(new Date().toISOString())
    } catch {}

    setSending(false)
  }

  // ── Name Entry Step ──
  if (step === "name") {
    return (
      <div className="flex-1 flex flex-col px-4 py-4 gap-3 overflow-y-auto">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/40">
          <MessageSquareHeart className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-violet-700 dark:text-violet-300 leading-relaxed">
            Admin se real-time chat karo. Woh Telegram se reply karenge aur message yahan dikh jayega.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-muted-foreground">Aapka Naam *</label>
          <Input
            ref={nameRef}
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") startSession() }}
            placeholder="Jaise: Rahul Kumar"
            className="h-9 text-xs rounded-xl border-border/50 bg-background focus:border-violet-400"
            disabled={starting}
          />
        </div>

        <Button
          onClick={startSession}
          disabled={!studentName.trim() || starting}
          className="w-full h-9 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-semibold shadow-sm shadow-violet-500/30 disabled:opacity-50"
        >
          {starting ? (
            <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Starting…</span>
          ) : (
            <span className="flex items-center gap-2"><MessageSquareHeart className="h-3.5 w-3.5" />Chat Shuru Karo</span>
          )}
        </Button>
      </div>
    )
  }

  // ── Live Chat Step ──
  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm bg-gradient-to-b from-muted/20 to-background">
        {liveMessages.map((msg) => {
          const isStudent = msg.sender === "student"
          const isSystem = msg.id.startsWith("system-")

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/40 text-[10px] text-green-700 dark:text-green-400">
                  {msg.message}
                </span>
              </div>
            )
          }

          return (
            <div key={msg.id} className={cn("flex gap-2 items-end", isStudent ? "flex-row-reverse" : "flex-row")}>
              <div className={cn(
                "shrink-0 flex h-6 w-6 items-center justify-center rounded-full mb-0.5",
                isStudent
                  ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                  : "bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/50 dark:to-green-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-700/60"
              )}>
                {isStudent ? <User className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              </div>

              <div className={cn(
                "max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed",
                isStudent
                  ? "bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-br-sm"
                  : "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border border-emerald-200/50 dark:border-emerald-800/40 text-foreground rounded-bl-sm shadow-sm"
              )}>
                {!isStudent && (
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5 uppercase tracking-wide">Admin</p>
                )}
                <p className="leading-relaxed">{msg.message}</p>
              </div>
            </div>
          )
        })}

        {adminTyping && (
          <div className="flex gap-2 items-end">
            <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 border border-emerald-200/60">
              <ShieldCheck className="h-3 w-3" />
            </div>
            <div className="bg-card border border-border/40 px-3 py-2.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-border/40 px-3 py-2.5 bg-muted/10">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg() } }}
            placeholder="Admin ko message karo…"
            className="h-9 text-xs rounded-xl border-border/50 bg-background focus:border-emerald-400 transition-colors"
            disabled={sending}
          />
          <Button
            size="sm"
            onClick={sendMsg}
            disabled={!input.trim() || sending}
            className="h-9 w-9 p-0 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-sm shadow-emerald-500/30 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Live Chat — Admin Telegram pe hai
          </p>
          <button
            onClick={endSessionManually}
            className="text-[10px] text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            Chat Band Karo ✕
          </button>
        </div>
      </div>
    </>
  )
}

// ── MAIN CHATBOT ──────────────────────────────────────
export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [mode, setMode] = useState<"ai" | "admin">("ai")
  const [unread, setUnread] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const isAdminMode = mode === "admin"

  return (
    <div className={cn("fixed z-40", "bottom-[84px] right-4 md:bottom-6 md:right-6")}>

      {/* Chat window */}
      {open && (
        <div className={cn(
          "absolute bottom-[72px] right-0",
          "w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px]",
          "bg-background border border-border/50 rounded-2xl shadow-2xl shadow-violet-500/10",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out origin-bottom-right",
          minimized ? "h-[52px]" : "h-[420px] sm:h-[480px] max-h-[calc(100dvh-160px)]",
        )}>

          {/* Header */}
          <div className={cn(
            "shrink-0 flex items-center gap-3 px-4 py-2.5 relative overflow-hidden",
            isAdminMode
              ? "bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600"
              : "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600"
          )}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-chat-shimmer" />

            {isAdminMode ? (
              <button
                onClick={() => setMode("ai")}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20 shrink-0 hover:bg-white/25 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </button>
            ) : (
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20 shrink-0">
                <GraduationCap style={{ height: "18px", width: "18px" }} className="text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-green-400 border border-violet-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-700" />
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm text-white leading-tight">
                  {isAdminMode ? "Admin Live Chat" : "TechVyro AI"}
                </p>
                {!isAdminMode && (
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-semibold text-white/90 tracking-wide">BETA</span>
                )}
                {isAdminMode && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] font-semibold text-white/90">
                    <span className="h-1 w-1 rounded-full bg-green-300 animate-pulse" />LIVE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/70 leading-tight">
                {isAdminMode ? "Real-time chat via Telegram" : "Study Assistant + PDF Finder"}
              </p>
            </div>

            <div className="flex items-center gap-0.5">
              {!isAdminMode && (
                <button
                  onClick={() => setMinimized(m => !m)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                >
                  {minimized ? <ChevronDown className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setMode("ai") }}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            mode === "ai"
              ? <AiChat onSwitchToAdmin={() => setMode("admin")} />
              : <AdminLiveChat onBack={() => setMode("ai")} />
          )}
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className="relative">
        {!open && (
          <>
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 opacity-40 animate-ping scale-110" style={{ animationDuration: "2.5s" }} />
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 opacity-20 animate-ping scale-125" style={{ animationDuration: "2.5s", animationDelay: "0.6s" }} />
          </>
        )}

        <button
          onClick={() => { setOpen(o => !o); setUnread(0) }}
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5",
            "h-14 w-14 rounded-2xl",
            "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600",
            "shadow-lg shadow-violet-500/40",
            "transition-all duration-300 ease-out",
            "hover:shadow-xl hover:shadow-violet-500/50 hover:scale-110 hover:-translate-y-0.5",
            "active:scale-95 active:translate-y-0",
          )}
          title="TechVyro AI Assistant"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
          {open ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <>
              <GraduationCap className="h-5 w-5 text-white drop-shadow" />
              <span className="text-[8px] font-bold text-white/90 leading-none tracking-widest">AI</span>
            </>
          )}
          {!open && unread > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-background shadow">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
