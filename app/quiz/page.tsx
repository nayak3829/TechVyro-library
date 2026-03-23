"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PageAutoRefresh } from "@/components/page-auto-refresh"
import { QuizHistorySection } from "@/components/quiz-history-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Clock, FileText, Play, BookOpen, ArrowRight, Search, 
  Trophy, X, ArrowUpDown, Zap, Target, Flame, ChevronRight,
  Brain, Sparkles, ListFilter, Wifi
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  time_limit: number
  questions: { id: string }[]
  enabled: boolean
  created_at: string
}

const categoryConfig: Record<string, { color: string; bg: string; gradient: string }> = {
  Mathematics: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", gradient: "from-blue-500/20 to-blue-600/10" },
  Physics:     { color: "#a855f7", bg: "rgba(168,85,247,0.1)",  gradient: "from-purple-500/20 to-purple-600/10" },
  Chemistry:   { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   gradient: "from-green-500/20 to-green-600/10" },
  Biology:     { color: "#10b981", bg: "rgba(16,185,129,0.1)",  gradient: "from-emerald-500/20 to-emerald-600/10" },
  English:     { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  gradient: "from-amber-500/20 to-amber-600/10" },
  General:     { color: "#6b7280", bg: "rgba(107,114,128,0.1)", gradient: "from-gray-500/20 to-gray-600/10" },
  NDA:         { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   gradient: "from-red-500/20 to-red-600/10" },
  SSC:         { color: "#f97316", bg: "rgba(249,115,22,0.1)",  gradient: "from-orange-500/20 to-orange-600/10" },
}

const defaultConfig = { color: "#6366f1", bg: "rgba(99,102,241,0.1)", gradient: "from-indigo-500/20 to-indigo-600/10" }

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "most-questions", label: "Most Questions" },
  { value: "least-questions", label: "Fewest Questions" },
  { value: "longest", label: "Longest Time" },
  { value: "shortest", label: "Shortest Time" },
]

const REFRESH_INTERVAL = 2 * 60 * 1000

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [sortBy, setSortBy] = useState("newest")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQuizzes = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch("/api/quizzes", { cache: "no-store" })
      const data = await res.json()
      const all: Quiz[] = data.quizzes || []
      setQuizzes(all.filter(q => q.enabled && q.questions.length > 0))
      setLastUpdated(new Date())
    } catch {}
    if (showLoading) setLoading(false)
  }, [])

  useEffect(() => {
    fetchQuizzes(true)
    timerRef.current = setInterval(() => fetchQuizzes(false), REFRESH_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchQuizzes])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(quizzes.map(q => q.category).filter(Boolean)))
    return ["All", ...cats]
  }, [quizzes])

  const filtered = useMemo(() => {
    let result = quizzes
    if (selectedCategory !== "All") result = result.filter(q => q.category === selectedCategory)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        quiz => quiz.title.toLowerCase().includes(q) || quiz.description?.toLowerCase().includes(q) || quiz.category.toLowerCase().includes(q)
      )
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === "most-questions") return b.questions.length - a.questions.length
      if (sortBy === "least-questions") return a.questions.length - b.questions.length
      if (sortBy === "longest") return b.time_limit - a.time_limit
      if (sortBy === "shortest") return a.time_limit - b.time_limit
      return 0
    })
    return result
  }, [quizzes, selectedCategory, search, sortBy])

  const totalQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0)
  const activeSortLabel = sortOptions.find(s => s.value === sortBy)?.label || "Sort"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background border-b border-border/50">
        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
          backgroundSize: "32px 32px"
        }} />
        {/* Gradient orbs */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative container mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-5 shadow-sm">
              <Brain className="h-3.5 w-3.5" />
              Practice Tests &amp; Quizzes
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
              Test Your <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Knowledge</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              Challenge yourself with curated quizzes designed for NDA, SSC, and other competitive exams. Compete with students across India.
            </p>

            {/* Quick stats strip */}
            {!loading && quizzes.length > 0 && (
              <div className="flex items-center gap-4 sm:gap-6 mt-6 flex-wrap justify-center">
                {[
                  { label: "Quizzes", value: quizzes.length, color: "text-primary" },
                  { label: "Questions", value: totalQuestions, color: "text-accent" },
                  { label: "Subjects", value: categories.length - 1, color: "text-green-500" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</span>
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                ))}
                <Link href="/quiz/leaderboard">
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                    <Trophy className="h-3.5 w-3.5" />
                    Leaderboard
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-8">

        {/* Search + Sort */}
        {!loading && quizzes.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quizzes by title, subject..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-9 h-11 text-sm bg-background border-border/60 focus-visible:ring-primary/30"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-11 gap-2 text-xs sm:text-sm whitespace-nowrap px-3">
                    <ListFilter className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{activeSortLabel}</span>
                    <span className="sm:hidden">Sort</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {sortOptions.map(opt => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setSortBy(opt.value)}
                      className={sortBy === opt.value ? "bg-primary/10 text-primary font-medium" : ""}
                    >
                      {opt.value === sortBy && <Zap className="h-3.5 w-3.5 mr-2 text-primary" />}
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Category filter chips */}
        {!loading && categories.length > 2 && (
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => {
              const isActive = selectedCategory === cat
              const cfg = categoryConfig[cat] || defaultConfig
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-all duration-200"
                  style={isActive ? {
                    backgroundColor: cat === "All" ? "hsl(var(--primary))" : cfg.color,
                    color: "#fff",
                    borderColor: "transparent"
                  } : {
                    backgroundColor: cat === "All" ? "transparent" : cfg.bg,
                    color: cat === "All" ? "hsl(var(--muted-foreground))" : cfg.color,
                    borderColor: cat === "All" ? "hsl(var(--border))" : `${cfg.color}40`
                  }}
                >
                  {cat}
                  {cat !== "All" && (
                    <span className="ml-1.5 opacity-75 text-[10px]">
                      ({quizzes.filter(q => q.category === cat).length})
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/50 bg-muted/30 p-6 animate-pulse space-y-4">
                <div className="h-5 bg-muted rounded-full w-3/4" />
                <div className="h-3 bg-muted rounded-full w-1/2" />
                <div className="h-3 bg-muted rounded-full w-2/3" />
                <div className="h-10 bg-muted rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
              <BookOpen className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Quizzes Yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Quizzes will appear here once they are published by the admin.
            </p>
            <Button asChild variant="outline">
              <Link href="/">
                Browse PDFs Instead
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Target className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-bold mb-1">No quizzes match</h3>
            <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filter</p>
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setSelectedCategory("All") }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {quizzes.length} quizzes
              {selectedCategory !== "All" && <> in <span className="font-semibold text-foreground">{selectedCategory}</span></>}
              {search && <> matching &quot;<span className="font-semibold text-foreground">{search}</span>&quot;</>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((quiz, idx) => {
                const cfg = categoryConfig[quiz.category] || defaultConfig
                const isNew = (Date.now() - new Date(quiz.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                return (
                  <div
                    key={quiz.id}
                    className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-transparent flex flex-col"
                    style={{ "--hover-border": cfg.color } as React.CSSProperties}
                  >
                    {/* Top color bar */}
                    <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)` }} />

                    {/* Subtle gradient bg */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                    <div className="relative p-5 flex-1 flex flex-col">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          {isNew && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 mb-1.5">
                              <Sparkles className="h-2.5 w-2.5" />
                              NEW
                            </div>
                          )}
                          <h3 className="font-bold text-sm sm:text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                            {quiz.title}
                          </h3>
                        </div>
                        <span
                          className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-sm"
                          style={{ backgroundColor: cfg.color }}
                        >
                          {quiz.category}
                        </span>
                      </div>

                      {quiz.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                          {quiz.description}
                        </p>
                      )}

                      {/* Stats chips */}
                      <div className="flex items-center gap-2 mb-4 mt-auto">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-[11px] font-medium text-foreground">
                          <FileText className="h-3 w-3 text-primary" />
                          {quiz.questions.length} Q
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-[11px] font-medium text-foreground">
                          <Clock className="h-3 w-3 text-accent" />
                          {Math.floor(quiz.time_limit / 60)} min
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-[11px] font-medium text-foreground">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {quiz.questions.length > 30 ? "Hard" : quiz.questions.length > 15 ? "Medium" : "Easy"}
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Link
                        href={`/quiz/${quiz.id}`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 shadow-md group-hover:shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        Start Quiz
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>

      {/* Quiz History */}
      <div className="container mx-auto px-4 pb-10">
        <QuizHistorySection />
      </div>

      <Footer />
      <PageAutoRefresh
        interval={REFRESH_INTERVAL}
        label="Live"
        showToast={true}
        onRefresh={async () => { await fetchQuizzes(false) }}
      />
    </div>
  )
}
