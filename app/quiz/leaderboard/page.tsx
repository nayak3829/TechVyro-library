"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Trophy, Crown, Medal, Star, Clock, Target, 
  ArrowLeft, Users, Calendar
} from "lucide-react"

interface LeaderboardEntry {
  id: string
  name: string
  score: number
  percentage: number
  correct: number
  wrong: number
  skipped: number
  total_time: number
  quiz_id: string
  quiz_title: string
  created_at: string
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "today" | "week">("all")

  useEffect(() => {
    fetch("/api/quiz-results")
      .then(r => r.json())
      .then(data => setEntries(data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getFilteredEntries = () => {
    const now = new Date()
    return entries.filter(entry => {
      const entryDate = new Date(entry.created_at)
      if (filter === "today") return entryDate.toDateString() === now.toDateString()
      if (filter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        return entryDate >= weekAgo
      }
      return true
    }).sort((a, b) => Number(b.percentage) - Number(a.percentage))
  }

  const filteredEntries = getFilteredEntries()

  const getRankStyle = (rank: number) => {
    if (rank === 0) return {
      icon: <Crown className="h-6 w-6 text-yellow-500" />,
      bg: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/40",
      badge: "bg-yellow-500"
    }
    if (rank === 1) return {
      icon: <Medal className="h-6 w-6 text-gray-400" />,
      bg: "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/40",
      badge: "bg-gray-400"
    }
    if (rank === 2) return {
      icon: <Medal className="h-6 w-6 text-amber-700" />,
      bg: "bg-gradient-to-r from-amber-700/20 to-amber-800/20 border-amber-700/40",
      badge: "bg-amber-700"
    }
    return {
      icon: <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-muted-foreground">{rank + 1}</span>,
      bg: "bg-card border-border/50",
      badge: "bg-muted"
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            href="/quiz" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quizzes
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Trophy className="h-8 w-8 text-primary" />
                Leaderboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Top performers across all quizzes
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 text-sm ${filter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setFilter("week")}
                  className={`px-3 py-1.5 text-sm border-l border-border ${filter === "week" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setFilter("today")}
                  className={`px-3 py-1.5 text-sm border-l border-border ${filter === "today" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <Users className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{entries.length}</div>
              <div className="text-xs text-muted-foreground">Total Entries</div>
            </Card>
            <Card className="p-4 text-center">
              <Target className="h-6 w-6 mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold">
                {entries.length > 0 ? Math.round(entries.reduce((sum, e) => sum + Number(e.percentage), 0) / entries.length) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Avg Score</div>
            </Card>
            <Card className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto text-amber-500 mb-2" />
              <div className="text-2xl font-bold">
                {entries.length > 0 ? Math.max(...entries.map(e => Number(e.percentage))) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Highest Score</div>
            </Card>
            <Card className="p-4 text-center">
              <Calendar className="h-6 w-6 mx-auto text-blue-500 mb-2" />
              <div className="text-2xl font-bold">
                {entries.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).length}
              </div>
              <div className="text-xs text-muted-foreground">Today</div>
            </Card>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Scores Yet</h3>
            <p className="text-muted-foreground mb-6">
              {filter !== "all" 
                ? "No scores found for this time period. Try a different filter."
                : "Be the first to take a quiz and get on the leaderboard!"}
            </p>
            <Button asChild>
              <Link href="/quiz">Take a Quiz</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry, index) => {
              const style = getRankStyle(index)
              return (
                <Card 
                  key={entry.id}
                  className={`p-4 border-2 transition-all hover:scale-[1.01] ${style.bg}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-10 flex justify-center">
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{entry.name}</h3>
                        {index < 3 && (
                          <Badge className={`text-white text-[10px] ${style.badge}`}>
                            #{index + 1}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {entry.quiz_title}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-green-500 font-medium">{entry.correct}</div>
                        <div className="text-xs text-muted-foreground">Correct</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-500 font-medium">{entry.wrong}</div>
                        <div className="text-xs text-muted-foreground">Wrong</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(entry.total_time)}
                        </div>
                        <div className="text-xs text-muted-foreground">Time</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-bold ${
                        Number(entry.percentage) >= 70 ? "text-green-500" :
                        Number(entry.percentage) >= 40 ? "text-amber-500" : "text-red-500"
                      }`}>
                        {Math.round(Number(entry.percentage))}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(entry.created_at)}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
