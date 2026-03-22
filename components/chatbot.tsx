"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { MessageCircle, X, Send, Sparkles, Bot, User, Loader2, BookOpen, Search, ChevronDown, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const QUICK_PROMPTS = [
  { label: "Find PDFs", icon: Search, text: "Physics ke PDFs dhundh do" },
  { label: "Study Help", icon: BookOpen, text: "Newton ke laws explain karo" },
  { label: "Exam Tips", icon: Sparkles, text: "NDA exam ki preparation kaise karein?" },
]

function formatText(text: string) {
  // Convert markdown-like formatting to JSX-friendly spans
  const lines = text.split("\n")
  return lines.map((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return <br key={i} />

    // Bold: **text**
    const formatted = trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      return (
        <div key={i} className="flex gap-1.5 mt-0.5">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s+/, "") }} />
        </div>
      )
    }
    if (/^\d+\.\s/.test(trimmed)) {
      return (
        <div key={i} className="flex gap-1.5 mt-0.5">
          <span className="text-primary shrink-0 font-semibold">{trimmed.match(/^\d+/)?.[0]}.</span>
          <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s+/, "") }} />
        </div>
      )
    }
    return (
      <p key={i} className="mt-0.5 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
    )
  })
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Namaste! 👋 Main TechVyro Study Assistant hoon.\n\nMain aapki help kar sakta hoon:\n- **Study questions** — koi bhi subject\n- **PDFs dhundhna** — library mein search\n- **Concepts explain** karna\n\nKya poochna chahte ho?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (open) {
      scrollToBottom()
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, scrollToBottom])

  useEffect(() => {
    if (open) scrollToBottom()
  }, [messages, open, scrollToBottom])

  async function sendMessage(text?: string) {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })

      const data = await res.json()
      const reply = data.reply || data.error || "Kuch gadbad ho gaya, dobara try karo."

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMsg])

      if (!open) setUnread(prev => prev + 1)
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Network error aa gaya. Please dobara try karo.",
        timestamp: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating bubble */}
      <div className={cn(
        "fixed z-50 transition-all duration-300",
        "bottom-[76px] right-4 md:bottom-6 md:right-6"
      )}>
        {/* Chat window */}
        {open && (
          <div className={cn(
            "absolute bottom-16 right-0 w-[340px] sm:w-[380px]",
            "bg-background border border-border/60 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/50",
            "flex flex-col overflow-hidden",
            "transition-all duration-300 origin-bottom-right",
            minimized ? "h-14" : "h-[520px] sm:h-[560px]",
          )}>
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-tight">TechVyro Assistant</p>
                <p className="text-[10px] text-white/70 leading-tight">AI Study Helper + PDF Finder</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimized(m => !m)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title={minimized ? "Expand" : "Minimize"}
                >
                  {minimized ? <ChevronDown className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-2",
                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "shrink-0 flex h-7 w-7 items-center justify-center rounded-full",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400"
                      )}>
                        {msg.role === "user"
                          ? <User className="h-3.5 w-3.5" />
                          : <Bot className="h-3.5 w-3.5" />
                        }
                      </div>
                      <div className={cn(
                        "max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted/60 dark:bg-muted/40 text-foreground rounded-tl-sm"
                      )}>
                        {formatText(msg.content)}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-2">
                      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                      <div className="bg-muted/60 dark:bg-muted/40 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Soch raha hoon...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick prompts (show only when 1 message = welcome) */}
                {messages.length === 1 && (
                  <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                    {QUICK_PROMPTS.map((p) => {
                      const Icon = p.icon
                      return (
                        <button
                          key={p.label}
                          onClick={() => sendMessage(p.text)}
                          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Icon className="h-3 w-3" />
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Input */}
                <div className="shrink-0 border-t border-border/40 p-3">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Kuch poochho..."
                      className="h-9 text-xs rounded-xl border-border/60"
                      disabled={loading}
                    />
                    <Button
                      size="sm"
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading}
                      className="h-9 w-9 p-0 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700"
                    >
                      {loading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Send className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                    Powered by TechVyro AI
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => { setOpen(o => !o); setUnread(0) }}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-violet-500/30",
            "bg-gradient-to-br from-violet-600 to-purple-600 text-white",
            "transition-all duration-300 hover:scale-110 active:scale-95",
            open && "rotate-0 scale-100"
          )}
          title="Study Assistant"
        >
          {open
            ? <X className="h-6 w-6" />
            : <MessageCircle className="h-6 w-6" />
          }
          {!open && unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          {!open && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-background animate-pulse" />
          )}
        </button>
      </div>
    </>
  )
}
