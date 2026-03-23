"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PageAutoRefresh } from "@/components/page-auto-refresh"
import { QuizHistorySection } from "@/components/quiz-history-section"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContentStructureNav, type ContentStructureFilter } from "@/components/content-structure-nav"
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose
} from "@/components/ui/drawer"
import {
  Clock, FileText, Play, BookOpen, ArrowRight, Search,
  Trophy, X, Zap, Target, Flame, ChevronRight,
  Brain, Sparkles, ListFilter, Lock, SlidersHorizontal,
  ChevronDown, CheckCheck, Layers
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  section: string
  difficulty: string
  time_limit: number
  questions: { id: string }[]
  enabled: boolean
  created_at: string
  structure_location: { folderId: string; categoryId: string; sectionId: string } | null
}

const categoryConfig: Record<string, { color: string; bg: string }> = {
  Mathematics: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  Physics:     { color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
  Chemistry:   { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  Biology:     { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  English:     { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  General:     { color: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  NDA:         { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  SSC:         { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
}
const defaultCfg = { color: "#6366f1", bg: "rgba(99,102,241,0.12)" }

const difficultyConfig: Record<string, { color: string; bg: string; label: string }> = {
  easy:   { color: "#16a34a", bg: "rgba(22,163,74,0.1)",   label: "Easy" },
  medium: { color: "#d97706", bg: "rgba(217,119,6,0.1)",   label: "Medium" },
  hard:   { color: "#dc2626", bg: "rgba(220,38,38,0.1)",   label: "Hard" },
}
const defaultDiff = { color: "#6b7280", bg: "rgba(107,114,128,0.1)", label: "Mixed" }

const sortOptions = [
  { value: "newest",         label: "Newest First",    icon: "🆕" },
  { value: "oldest",         label: "Oldest First",    icon: "📅" },
  { value: "most-questions", label: "Most Questions",  icon: "📝" },
  { value: "least-questions",label: "Fewest Questions",icon: "✂️" },
  { value: "longest",        label: "Longest Time",    icon: "⏳" },
  { value: "shortest",       label: "Shortest Time",   icon: "⚡" },
]

const PAGE_SIZE = 24
const LOAD_MORE = 12
const REFRESH_INTERVAL = 2 * 60 * 1000

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function QuizzesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [searchRaw, setSearchRaw] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [sortBy, setSortBy] = useState("newest")
  const [structureFilter, setStructureFilter] = useState<ContentStructureFilter>({
    folderId: null, categoryId: null, sectionId: null
  })
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const search = useDebounce(searchRaw, 280)

  function handleStartQuiz(e: React.MouseEvent, quizId: string) {
    if (!user) {
      e.preventDefault()
      router.push(`/login?redirect=/quiz/${quizId}`)
    }
  }

  const fetchQuizzes = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch("/api/quizzes")
      const data = await res.json()
      const all: Quiz[] = data.quizzes || []
      setQuizzes(all.filter(q => q.enabled && q.questions.length > 0))
    } catch {}
    if (showLoading) setLoading(false)
  }, [])

  useEffect(() => {
    fetchQuizzes(true)
    timerRef.current = setInterval(() => fetchQuizzes(false), REFRESH_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchQuizzes])

  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, selectedCategory, sortBy, structureFilter])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(quizzes.map(q => q.category).filter(Boolean)))
    return ["All", ...cats]
  }, [quizzes])

  const filtered = useMemo(() => {
    let result = quizzes

    if (structureFilter.folderId === "uncategorized") {
      result = result.filter(q => !q.structure_location?.folderId)
    } else if (structureFilter.sectionId) {
      result = result.filter(q => q.structure_location?.sectionId === structureFilter.sectionId)
    } else if (structureFilter.categoryId) {
      result = result.filter(q => q.structure_location?.categoryId === structureFilter.categoryId)
    } else if (structureFilter.folderId) {
      result = result.filter(q => q.structure_location?.folderId === structureFilter.folderId)
    }

    if (!structureFilter.folderId && selectedCategory !== "All") {
      result = result.filter(q => q.category === selectedCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        quiz => quiz.title.toLowerCase().includes(q) ||
                quiz.description?.toLowerCase().includes(q) ||
                quiz.category.toLowerCase().includes(q)
      )
    }

    return [...result].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === "most-questions") return b.questions.length - a.questions.length
      if (sortBy === "least-questions") return a.questions.length - b.questions.length
      if (sortBy === "longest") return b.time_limit - a.time_limit
      if (sortBy === "shortest") return a.time_limit - b.time_limit
      return 0
    })
  }, [quizzes, selectedCategory, search, sortBy, structureFilter])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const totalQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0)
  const hasStructureFilter = !!structureFilter.folderId
  const hasAnyFilter = hasStructureFilter || selectedCategory !== "All" || search.trim() !== ""
  const activeSortLabel = sortOptions.find(s => s.value === sortBy)?.label || "Sort"

  function clearAll() {
    setSearchRaw("")
    setSelectedCategory("All")
    setStructureFilter({ folderId: null, categoryId: null, sectionId: null })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* ── Hero Banner ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background border-b border-border/50">
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "28px 28px"
        }} />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-accent/15 blur-3xl pointer-events-none" />

        <div className="relative container mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4 shadow-sm">
              <Brain className="h-3.5 w-3.5" />
              Practice Tests &amp; Quizzes
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 text-foreground">
              Test Your{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Knowledge
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
              Challenge yourself with curated quizzes for NDA, SSC &amp; other competitive exams.
            </p>

            {!loading && quizzes.length > 0 && (
              <div className="flex items-center gap-5 sm:gap-8 mt-6 flex-wrap justify-center">
                {[
                  { label: "Quizzes", value: quizzes.length,      icon: "🧠", color: "text-primary" },
                  { label: "Questions", value: totalQuestions,    icon: "📝", color: "text-accent" },
                  { label: "Subjects", value: categories.length - 1, icon: "📚", color: "text-green-500" },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-0.5">
                    <span className={`text-2xl sm:text-3xl font-black ${s.color} tabular-nums`}>{s.value}</span>
                    <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
                  </div>
                ))}
                <Link href="/quiz/leaderboard">
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
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

      {/* ── Main Content ── */}
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <div className="w-full">

          {/* ── Sticky Filter Bar (all screen sizes) ── */}
          <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur-sm pb-3 pt-1 -mx-4 px-4 border-b border-border/40 mb-5">

            <div className="flex gap-2 items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Search quizzes…"
                  value={searchRaw}
                  onChange={e => setSearchRaw(e.target.value)}
                  className="w-full h-11 pl-9 pr-9 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                  autoComplete="off"
                  suppressHydrationWarning
                />
                {searchRaw && (
                  <button
                    onClick={() => setSearchRaw("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Sort dropdown */}
              <div className="hidden sm:block">
                <SortDropdown sortBy={sortBy} onSort={setSortBy} label={activeSortLabel} />
              </div>

              {/* Filters drawer (all screen sizes) */}
              <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
                <DrawerTrigger asChild>
                  <button className="relative h-11 px-3 sm:px-4 rounded-xl border border-border/60 bg-background flex items-center gap-1.5 sm:gap-2 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors shrink-0">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {hasAnyFilter && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                        !
                      </span>
                    )}
                  </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85dvh]">
                  <DrawerHeader className="pb-2">
                    <DrawerTitle className="text-base">Filters &amp; Sort</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-6 overflow-y-auto space-y-5">
                    {/* Sort */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort by</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {sortOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => { setSortBy(opt.value); setFilterDrawerOpen(false) }}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                              sortBy === opt.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/60 text-muted-foreground hover:bg-muted/60"
                            }`}
                          >
                            <span>{opt.icon}</span>
                            <span className="truncate">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category */}
                    {categories.length > 2 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subject</p>
                        <div className="flex flex-wrap gap-2">
                          {categories.map(cat => {
                            const cfg = categoryConfig[cat] || defaultCfg
                            const isActive = selectedCategory === cat
                            return (
                              <button
                                key={cat}
                                onClick={() => { setSelectedCategory(cat); setStructureFilter({ folderId: null, categoryId: null, sectionId: null }); setFilterDrawerOpen(false) }}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
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
                                  <span className="ml-1 opacity-75">
                                    ({quizzes.filter(q => q.category === cat).length})
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Content Structure */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Content Structure</p>
                      <ContentStructureNav
                        filter={structureFilter}
                        onFilterChange={(f) => {
                          setStructureFilter(f)
                          setSelectedCategory("All")
                          setSearchRaw("")
                          setFilterDrawerOpen(false)
                        }}
                        showType="quizzes"
                        autoRefreshMs={120_000}
                      />
                    </div>

                    {hasAnyFilter && (
                      <button
                        onClick={() => { clearAll(); setFilterDrawerOpen(false) }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-500/30 text-rose-500 text-sm font-semibold hover:bg-rose-500/5 transition-colors"
                      >
                        <X className="h-4 w-4" /> Clear All Filters
                      </button>
                    )}
                  </div>
                </DrawerContent>
              </Drawer>

              {/* Sort shortcut on small screens */}
              <div className="sm:hidden">
                <SortDropdown sortBy={sortBy} onSort={setSortBy} label="" compact />
              </div>
            </div>

            {/* Category chips (all sizes when no structure filter) */}
            {!loading && categories.length > 2 && !hasStructureFilter && (
              <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                {categories.map(cat => {
                  const cfg = categoryConfig[cat] || defaultCfg
                  const isActive = selectedCategory === cat
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 whitespace-nowrap"
                      style={isActive ? {
                        backgroundColor: cat === "All" ? "hsl(var(--primary))" : cfg.color,
                        color: "#fff",
                        borderColor: "transparent",
                        boxShadow: `0 2px 8px ${cat === "All" ? "hsl(var(--primary))" : cfg.color}44`
                      } : {
                        backgroundColor: cat === "All" ? "transparent" : cfg.bg,
                        color: cat === "All" ? "hsl(var(--muted-foreground))" : cfg.color,
                        borderColor: cat === "All" ? "hsl(var(--border))" : `${cfg.color}40`
                      }}
                    >
                      {cat}
                      {cat !== "All" && (
                        <span className="ml-1 opacity-70">
                          ({quizzes.filter(q => q.category === cat).length})
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Single column content area ── */}
          <div className="w-full">

            {/* ── Active filter indicator ── */}
            {!loading && hasAnyFilter && (
              <div className="flex items-center gap-2 mb-3 mt-4 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{filtered.length}</span> quiz{filtered.length !== 1 ? "zes" : ""} found
                </span>
                {hasAnyFilter && (
                  <button
                    onClick={clearAll}
                    className="ml-auto flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 font-medium transition-colors"
                  >
                    <X className="h-3 w-3" /> Clear filters
                  </button>
                )}
              </div>
            )}

            {!loading && !hasAnyFilter && quizzes.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3 mt-4">
                Showing <span className="font-semibold text-foreground">{Math.min(visibleCount, filtered.length)}</span> of{" "}
                <span className="font-semibold text-foreground">{quizzes.length}</span> quizzes
              </p>
            )}

            {/* ── Loading Skeleton ── */}
            {loading && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border/50 bg-card p-5 animate-pulse space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded-full w-4/5" />
                        <div className="h-3 bg-muted rounded-full w-3/5" />
                      </div>
                      <div className="h-6 w-16 bg-muted rounded-full" />
                    </div>
                    <div className="h-3 bg-muted rounded-full w-full" />
                    <div className="h-3 bg-muted rounded-full w-2/3" />
                    <div className="flex gap-2 pt-1">
                      <div className="h-6 w-16 bg-muted rounded-lg" />
                      <div className="h-6 w-16 bg-muted rounded-lg" />
                      <div className="h-6 w-16 bg-muted rounded-lg" />
                    </div>
                    <div className="h-10 bg-muted rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* ── Empty: no quizzes at all ── */}
            {!loading && quizzes.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center mt-5">
                <div className="h-20 w-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-5">
                  <Brain className="h-10 w-10 text-primary/40" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Quizzes Yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">
                  Quizzes will appear here once published by the admin.
                </p>
                <Button asChild variant="outline">
                  <Link href="/">Browse PDFs <ArrowRight className="h-4 w-4 ml-2" /></Link>
                </Button>
              </div>
            )}

            {/* ── Empty: no match ── */}
            {!loading && quizzes.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center mt-5">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-bold mb-1">No quizzes match</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Try adjusting your search or filters
                </p>
                <Button variant="outline" size="sm" onClick={clearAll} className="gap-2">
                  <X className="h-3.5 w-3.5" /> Clear all filters
                </Button>
              </div>
            )}

            {/* ── Quiz Grid ── */}
            {!loading && visible.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visible.map((quiz, i) => {
                  const cfg = categoryConfig[quiz.category] || defaultCfg
                  const diff = difficultyConfig[quiz.difficulty?.toLowerCase()] || defaultDiff
                  const isNew = (Date.now() - new Date(quiz.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                  return (
                    <QuizCard
                      key={quiz.id}
                      quiz={quiz}
                      cfg={cfg}
                      diff={diff}
                      isNew={isNew}
                      isLoggedIn={!!user}
                      animIndex={i % PAGE_SIZE}
                      onStart={handleStartQuiz}
                    />
                  )
                })}
              </div>
            )}

            {/* ── Load More ── */}
            {!loading && hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => setVisibleCount(v => v + LOAD_MORE)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border/60 bg-card hover:bg-muted/60 text-sm font-semibold text-foreground transition-all hover:shadow-md group"
                >
                  <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
                  Load more
                  <span className="text-muted-foreground font-normal">
                    ({filtered.length - visibleCount} remaining)
                  </span>
                </button>
              </div>
            )}

            {/* ── All loaded ── */}
            {!loading && filtered.length > PAGE_SIZE && !hasMore && (
              <div className="flex items-center justify-center gap-2 mt-8 text-xs text-muted-foreground">
                <CheckCheck className="h-4 w-4 text-green-500" />
                All {filtered.length} quizzes loaded
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Quiz History ── */}
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

/* ─── Quiz Card ───────────────────────────────────────────── */
interface QuizCardProps {
  quiz: Quiz
  cfg: { color: string; bg: string }
  diff: { color: string; bg: string; label: string }
  isNew: boolean
  isLoggedIn: boolean
  animIndex: number
  onStart: (e: React.MouseEvent, id: string) => void
}

function QuizCard({ quiz, cfg, diff, isNew, isLoggedIn, animIndex, onStart }: QuizCardProps) {
  return (
    <div
      className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 hover:border-transparent flex flex-col"
      style={{
        animationDelay: `${animIndex * 35}ms`,
        animation: "fadeSlideUp 0.4s ease both"
      }}
    >
      {/* color top bar */}
      <div className="h-1.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}66)` }} />

      {/* hover bg tint */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${cfg.color}0d, transparent)` }}
      />

      <div className="relative p-4 sm:p-5 flex-1 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isNew && (
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 mb-1.5">
                <Sparkles className="h-2.5 w-2.5" />
                NEW
              </div>
            )}
            <h3 className="font-bold text-sm sm:text-[15px] leading-snug group-hover:text-primary transition-colors line-clamp-2">
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

        {/* Description */}
        {quiz.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed -mt-1">
            {quiz.description}
          </p>
        )}

        {/* Meta chips */}
        <div className="flex items-center gap-2 flex-wrap mt-auto">
          <MetaChip icon={<FileText className="h-3 w-3 text-primary" />} label={`${quiz.questions.length} Q`} />
          <MetaChip icon={<Clock className="h-3 w-3 text-accent" />} label={`${Math.floor(quiz.time_limit / 60)} min`} />
          <span
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
            style={{ backgroundColor: diff.bg, color: diff.color }}
          >
            <Flame className="h-3 w-3" />
            {diff.label}
          </span>
        </div>

        {/* CTA */}
        <Link
          href={`/quiz/${quiz.id}`}
          onClick={(e) => onStart(e, quiz.id)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 shadow-md group-hover:shadow-lg active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}
        >
          {isLoggedIn ? (
            <><Play className="h-3.5 w-3.5 fill-white" /> Start Quiz</>
          ) : (
            <><Lock className="h-3.5 w-3.5" /> Login to Start</>
          )}
        </Link>
      </div>
    </div>
  )
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-[11px] font-medium text-foreground">
      {icon}{label}
    </span>
  )
}

/* ─── Sort Dropdown ───────────────────────────────────────── */
function SortDropdown({ sortBy, onSort, label, compact = false }: {
  sortBy: string; onSort: (v: string) => void; label: string; compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="h-11 px-3 rounded-xl border border-border/60 bg-background flex items-center gap-1.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors whitespace-nowrap"
      >
        <ListFilter className="h-4 w-4 text-muted-foreground" />
        {!compact && <span className="hidden sm:inline max-w-[120px] truncate">{label}</span>}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden">
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onSort(opt.value); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                  sortBy === opt.value
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                <span>{opt.icon}</span>
                <span className="flex-1 text-left">{opt.label}</span>
                {sortBy === opt.value && <Zap className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
