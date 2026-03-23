"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Trophy, Clock, CheckCircle, XCircle, Minus, Trash2, History } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface QuizHistoryEntry {
  id: string
  quizId: string
  quizTitle: string
  score: number
  percentage: number
  correct: number
  wrong: number
  skipped: number
  totalTime: number
  timestamp: string
}

export const QUIZ_HISTORY_KEY = "techvyro_quiz_history"
const MAX_HISTORY = 20

export function saveQuizHistory(entry: Omit<QuizHistoryEntry, "id">) {
  try {
    const existing: QuizHistoryEntry[] = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || "[]")
    const newEntry: QuizHistoryEntry = { ...entry, id: Date.now().toString() }
    const updated = [newEntry, ...existing].slice(0, MAX_HISTORY)
    localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(updated))
  } catch {}
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "Abhi"
  if (mins < 60) return `${mins} min pehle`
  if (hours < 24) return `${hours}h pehle`
  return `${days}d pehle`
}

function getMedalColor(pct: number) {
  if (pct >= 90) return { text: "text-yellow-500", bg: "bg-yellow-500/10", label: "Excellent" }
  if (pct >= 75) return { text: "text-slate-400", bg: "bg-slate-400/10", label: "Good" }
  if (pct >= 50) return { text: "text-amber-600", bg: "bg-amber-600/10", label: "Average" }
  return { text: "text-red-500", bg: "bg-red-500/10", label: "Needs Work" }
}

export function QuizHistorySection() {
  const [history, setHistory] = useState<QuizHistoryEntry[]>([])
  const [mounted, setMounted] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || "[]")
      setHistory(stored)
    } catch {}
  }, [])

  function clearHistory() {
    setHistory([])
    try { localStorage.removeItem(QUIZ_HISTORY_KEY) } catch {}
  }

  function removeEntry(id: string) {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    try { localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(updated)) } catch {}
  }

  if (!mounted || history.length === 0) return null

  const displayedHistory = expanded ? history : history.slice(0, 5)

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Pichle Results</h3>
            <p className="text-[10px] text-muted-foreground">{history.length} attempts</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="text-xs text-muted-foreground hover:text-destructive h-7 px-2 gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </Button>
      </div>

      <div className="space-y-2">
        {displayedHistory.map((entry) => {
          const medal = getMedalColor(entry.percentage)
          return (
            <div
              key={entry.id}
              className="group flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${medal.bg}`}>
                <Trophy className={`h-5 w-5 ${medal.text}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-foreground truncate">{entry.quizTitle}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${medal.bg} ${medal.text}`}>
                    {medal.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1 text-green-500">
                    <CheckCircle className="h-3 w-3" />{entry.correct}
                  </span>
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-3 w-3" />{entry.wrong}
                  </span>
                  <span className="flex items-center gap-1">
                    <Minus className="h-3 w-3" />{entry.skipped}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{formatTime(entry.totalTime)}
                  </span>
                  <span className="ml-auto">{timeAgo(entry.timestamp)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-right">
                  <p className={`text-lg font-extrabold ${medal.text}`}>{entry.percentage}%</p>
                  <p className="text-[10px] text-muted-foreground">{entry.score} pts</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Link href={`/quiz/${entry.quizId}`}>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">Retry</Button>
                  </Link>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {history.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 text-xs text-muted-foreground hover:text-primary h-8"
        >
          {expanded ? "Kam Dikhao" : `Aur ${history.length - 5} results dekhо`}
        </Button>
      )}
    </div>
  )
}
