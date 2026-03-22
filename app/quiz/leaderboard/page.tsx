"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PageAutoRefresh } from "@/components/page-auto-refresh"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Trophy, Crown, Medal, Star, Clock, Target, 
  ArrowLeft, Users, Calendar, Zap, ChevronRight,
  TrendingUp, Award, Flame
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

const FILTERS = [
  { key: "all",   label: "All Time" },
  { key: "week",  label: "This Week" },
  { key: "today", label: "Today" },
]

const REFRESH_INTERVAL = 60 * 1000

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "today" | "week">("all")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchEntries = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch("/api/quiz-results", { cache: "no-store" })
      const data = await res.json()
      setEntries(data.results || [])
    } catch {}
    if (showLoading) setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries(true)
    timerRef.current = setInterval(() => fetchEntries(false), REFRESH_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchEntries])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    })
  }

  const filteredEntries = (() => {
    const now = new Date()
    return entries.filter(entry => {
      const d = new Date(entry.created_at)
      if (filter === "today") return d.toDateString() === now.toDateString()
      if (filter === "week") return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return true
    }).sort((a, b) => Number(b.percentage) - Number(a.percentage))
  })()

  const avgScore = entries.length
    ? Math.round(entries.reduce((s, e) => s + Number(e.percentage), 0) / entries.length)
    : 0
  const topScore = entries.length ? Math.max(...entries.map(e => Number(e.percentage))) : 0
  const todayCount = entries.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).length

  const scoreColor = (pct: number) =>
    pct >= 70 ? "text-green-500" : pct >= 40 ? "text-amber-500" : "text-red-500"

  const scoreBg = (pct: number) =>
    pct >= 70 ? "from-green-500/20 to-emerald-500/10 border-green-500/30"
    : pct >= 40 ? "from-amber-500/20 to-orange-500/10 border-amber-500/30"
    : "from-red-500/20 to-red-600/10 border-red-500/30"

  const [gold, silver, bronze] = filteredEntries.slice(0, 3)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-primary/5 to-background border-b border-border/50">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
          backgroundSize: "32px 32px"
        }} />
        <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative container mx-auto px-4 py-8 sm:py-12">
          <Link href="/quiz" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-5 transition-colors group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            Back to Quizzes
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold mb-3">
                <Flame className="h-3.5 w-3.5" />
                Hall of Fame
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
                <Trophy className="h-8 w-8 text-amber-500" />
                Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Top performers across all quizzes</p>
            </div>

            {/* Filter pills */}
            <div className="flex rounded-xl border border-border/60 overflow-hidden bg-muted/30 p-0.5 gap-0.5 w-fit">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as "all" | "today" | "week")}
                  className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                    filter === f.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-8">

        {/* Stats row */}
        {entries.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {[
              { icon: <Users className="h-5 w-5 text-primary" />, value: entries.length, label: "Total Entries", color: "border-primary/20 bg-primary/5" },
              { icon: <Target className="h-5 w-5 text-green-500" />, value: `${avgScore}%`, label: "Avg Score", color: "border-green-500/20 bg-green-500/5" },
              { icon: <Star className="h-5 w-5 text-amber-500" />, value: `${topScore}%`, label: "Highest Score", color: "border-amber-500/20 bg-amber-500/5" },
              { icon: <Calendar className="h-5 w-5 text-blue-500" />, value: todayCount, label: "Today", color: "border-blue-500/20 bg-blue-500/5" },
            ].map((s, i) => (
              <div key={i} className={`rounded-2xl border p-4 text-center ${s.color}`}>
                <div className="flex justify-center mb-2">{s.icon}</div>
                <div className="text-xl sm:text-2xl font-extrabold text-foreground">{s.value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Podium (top 3) */}
        {!loading && filteredEntries.length >= 2 && (
          <div className="mb-8 rounded-2xl border border-border/50 overflow-hidden bg-gradient-to-br from-muted/30 to-background">
            <div className="px-5 py-3 border-b border-border/30 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">Top Performers</span>
            </div>
            <div className="flex items-end justify-center gap-4 px-4 pt-6 pb-4">
              {/* Silver — 2nd */}
              {silver && (
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-bold text-lg shadow-lg mb-2">
                    {silver.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-center truncate w-full text-center">{silver.name}</p>
                  <p className={`text-lg font-extrabold ${scoreColor(Number(silver.percentage))}`}>{Math.round(Number(silver.percentage))}%</p>
                  <div className="w-full bg-gradient-to-t from-gray-400/30 to-gray-300/20 border border-gray-300/40 rounded-t-xl mt-2 flex items-center justify-center" style={{ height: 64 }}>
                    <Medal className="h-7 w-7 text-gray-400" />
                  </div>
                </div>
              )}

              {/* Gold — 1st */}
              {gold && (
                <div className="flex flex-col items-center flex-1 max-w-[160px] -mt-4">
                  <Crown className="h-6 w-6 text-amber-500 mb-1" />
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-white font-bold text-xl shadow-xl mb-2 ring-4 ring-amber-400/30">
                    {gold.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-bold text-center truncate w-full text-center">{gold.name}</p>
                  <p className={`text-xl font-extrabold ${scoreColor(Number(gold.percentage))}`}>{Math.round(Number(gold.percentage))}%</p>
                  <div className="w-full bg-gradient-to-t from-amber-500/30 to-amber-400/20 border border-amber-400/40 rounded-t-xl mt-2 flex items-center justify-center" style={{ height: 88 }}>
                    <Trophy className="h-8 w-8 text-amber-500" />
                  </div>
                </div>
              )}

              {/* Bronze — 3rd */}
              {bronze && (
                <div className="flex flex-col items-center flex-1 max-w-[140px]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 flex items-center justify-center text-white font-bold text-lg shadow-lg mb-2">
                    {bronze.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-center truncate w-full text-center">{bronze.name}</p>
                  <p className={`text-lg font-extrabold ${scoreColor(Number(bronze.percentage))}`}>{Math.round(Number(bronze.percentage))}%</p>
                  <div className="w-full bg-gradient-to-t from-amber-700/30 to-amber-600/20 border border-amber-600/40 rounded-t-xl mt-2 flex items-center justify-center" style={{ height: 48 }}>
                    <Medal className="h-7 w-7 text-amber-700" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Rankings List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
              <Trophy className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Scores Yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              {filter !== "all"
                ? "No scores found for this time period. Try a different filter."
                : "Be the first to take a quiz and claim the top spot!"}
            </p>
            <Button asChild className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <Link href="/quiz">
                Take a Quiz
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Full Rankings</h2>
              <span className="text-xs text-muted-foreground ml-auto">{filteredEntries.length} entries</span>
            </div>
            {filteredEntries.map((entry, index) => {
              const pct = Math.round(Number(entry.percentage))
              const isTop = index < 3
              const rankColors = ["bg-amber-500", "bg-gray-400", "bg-amber-700"]
              const rankBg = [
                "from-amber-500/10 to-amber-400/5 border-amber-500/25 hover:border-amber-500/50",
                "from-gray-400/10 to-gray-300/5 border-gray-400/25 hover:border-gray-400/50",
                "from-amber-700/10 to-amber-600/5 border-amber-700/25 hover:border-amber-700/50",
              ]
              const icons = [
                <Crown key={0} className="h-5 w-5 text-amber-500" />,
                <Medal key={1} className="h-5 w-5 text-gray-400" />,
                <Medal key={2} className="h-5 w-5 text-amber-700" />,
              ]

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all duration-200 hover:shadow-md ${
                    isTop
                      ? `bg-gradient-to-r ${rankBg[index]}`
                      : "border-border/40 bg-card hover:border-border hover:shadow-sm"
                  }`}
                >
                  {/* Rank */}
                  <div className="shrink-0 w-9 flex items-center justify-center">
                    {isTop ? (
                      icons[index]
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${
                      isTop ? rankColors[index] : "bg-primary/80"
                    }`}
                  >
                    {entry.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{entry.name}</h3>
                      {isTop && (
                        <span className={`shrink-0 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full ${rankColors[index]}`}>
                          #{index + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{entry.quiz_title}</p>
                  </div>

                  {/* Stats — hidden on mobile */}
                  <div className="hidden sm:flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-green-500">{entry.correct}</div>
                      <div className="text-[10px] text-muted-foreground">Correct</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-500">{entry.wrong}</div>
                      <div className="text-[10px] text-muted-foreground">Wrong</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-0.5 text-muted-foreground font-medium">
                        <Clock className="h-3 w-3" />
                        {formatTime(entry.total_time)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Time</div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className={`text-xl sm:text-2xl font-extrabold ${scoreColor(pct)}`}>
                      {pct}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(entry.created_at)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Footer />
      <PageAutoRefresh
        interval={REFRESH_INTERVAL}
        label="Live Rankings"
        showToast={true}
        onRefresh={async () => { await fetchEntries(false) }}
      />
    </div>
  )
}
