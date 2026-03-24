"use client"

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthModal } from "@/components/auth-modal"
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger
} from "@/components/ui/drawer"
import {
  Clock, FileText, Play, BookOpen, ArrowRight, Search,
  Trophy, X, Zap, Target, Flame, ChevronRight,
  Brain, Sparkles, ListFilter, Lock, SlidersHorizontal,
  ChevronDown, Shield, Train, TrendingUp, Atom, Users,
  GraduationCap, Loader2, RefreshCw, Globe
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface TestSeries {
  id: string
  title: string
  slug: string
  description: string
  total_tests: number
  total_questions: number
  duration: number
  is_free: boolean
  category: string
  isSample?: boolean
  _sourceApi?: string
  _sourceWeb?: string
}

const CATEGORIES = [
  { id: "all", label: "All", icon: Globe, color: "#6366f1" },
  { id: "ssc", label: "SSC", icon: Target, color: "#3b82f6" },
  { id: "banking", label: "Banking", icon: TrendingUp, color: "#10b981" },
  { id: "defence", label: "Defence", icon: Shield, color: "#ef4444" },
  { id: "railways", label: "Railways", icon: Train, color: "#f97316" },
  { id: "upsc", label: "UPSC", icon: BookOpen, color: "#8b5cf6" },
  { id: "jee-neet", label: "JEE/NEET", icon: Atom, color: "#06b6d4" },
  { id: "teaching", label: "Teaching", icon: GraduationCap, color: "#ec4899" },
]

const sortOptions = [
  { value: "newest", label: "Newest First", icon: Sparkles },
  { value: "popular", label: "Most Popular", icon: Flame },
  { value: "most-tests", label: "Most Tests", icon: FileText },
]

const PAGE_SIZE = 20
const REFRESH_INTERVAL = 5 * 60 * 1000

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function TestSeriesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const initialCategory = searchParams.get("category") || "all"
  
  const [testSeries, setTestSeries] = useState<TestSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [searchRaw, setSearchRaw] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [sortBy, setSortBy] = useState("newest")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [fetchError, setFetchError] = useState("")
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const search = useDebounce(searchRaw, 280)

  const fetchTestSeries = useCallback(async (showLoading = false, category?: string) => {
    if (showLoading) setLoading(true)
    setFetchError("")
    
    try {
      const cat = category || selectedCategory
      
      // For "all" category, fetch from multiple categories in parallel
      if (!cat || cat === "all") {
        const categories = ["ssc", "banking", "defence", "railways"]
        const results = await Promise.allSettled(
          categories.map(c => 
            fetch(`/api/extract?bulk=true&category=${c}`)
              .then(r => r.json())
              .then(data => ({
                category: c,
                series: (data.testSeries || []).slice(0, 3).map((s: TestSeries) => ({
                  ...s,
                  category: c,
                  _sourceApi: data.apiBase || s._sourceApi,
                  _sourceWeb: data.webBase || s._sourceWeb,
                }))
              }))
          )
        )
        
        const allSeries: TestSeries[] = []
        for (const result of results) {
          if (result.status === "fulfilled" && result.value.series.length > 0) {
            allSeries.push(...result.value.series)
          }
        }
        
        if (allSeries.length > 0) {
          setTestSeries(allSeries.map((s, idx) => ({ ...s, id: s.id || `series-${idx}` })))
          setFetchError("")
        } else {
          setTestSeries([])
          setFetchError("Showing practice tests")
        }
        return
      }
      
      // Single category fetch
      const params = new URLSearchParams()
      params.set("bulk", "true")
      params.set("category", cat)
      
      const res = await fetch(`/api/extract?${params}`)
      const data = await res.json()
      
      if (data.success && data.testSeries && data.testSeries.length > 0) {
        const series = data.testSeries.map((s: TestSeries, idx: number) => ({
          ...s,
          id: s.id || `series-${idx}`,
          category: s.category || cat,
          _sourceApi: data.apiBase || s._sourceApi,
          _sourceWeb: data.webBase || s._sourceWeb,
        }))
        setTestSeries(series)
        setFetchError("")
      } else {
        setTestSeries([])
        setFetchError(data.notice || "Showing practice tests")
      }
    } catch (err) {
      console.error("[v0] Error fetching test series:", err)
      setFetchError("Could not load tests. Showing sample tests.")
      setTestSeries([])
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [selectedCategory])

  // Fetch on mount and category change
  useEffect(() => {
    fetchTestSeries(true)
    timerRef.current = setInterval(() => fetchTestSeries(false), REFRESH_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchTestSeries])

  // Reset visible count on filter changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search, selectedCategory, sortBy])

  // Category change handler
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    // Update URL without navigation
    const url = new URL(window.location.href)
    if (cat === "all") {
      url.searchParams.delete("category")
    } else {
      url.searchParams.set("category", cat)
    }
    window.history.replaceState({}, "", url.toString())
    fetchTestSeries(true, cat)
  }

  // Handle starting a test series (requires login for non-sample)
  const handleStartSeries = (series: TestSeries) => {
    if (!series.isSample && !user && !authLoading) {
      setShowAuthModal(true)
      return
    }
    
    const params = new URLSearchParams({
      slug: series.slug || series.id,
      apiBase: series._sourceApi || `sample:${series.category}`,
      webBase: series._sourceWeb || "",
      title: series.title,
    })
    router.push(`/test-series/series?${params}`)
  }

  // Filter and sort
  const filtered = useMemo(() => {
    let result = testSeries

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      )
    }

    // Sort
    return [...result].sort((a, b) => {
      if (sortBy === "most-tests") return (b.total_tests || 0) - (a.total_tests || 0)
      if (sortBy === "popular") return (b.total_questions || 0) - (a.total_questions || 0)
      return 0 // newest is default order
    })
  }, [testSeries, search, sortBy])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const activeSortLabel = sortOptions.find(s => s.value === sortBy)?.label || "Sort"
  const hasAnyFilter = selectedCategory !== "all" || search.trim() !== ""

  const clearAll = () => {
    setSearchRaw("")
    handleCategoryChange("all")
  }

  // Stats
  const totalTests = testSeries.reduce((sum, s) => sum + (s.total_tests || 1), 0)
  const totalQuestions = testSeries.reduce((sum, s) => sum + (s.total_questions || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-500/10 via-primary/5 to-background border-b border-border/50">
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "28px 28px"
        }} />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        <div className="relative container mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-xs font-semibold mb-4 shadow-sm">
              <Zap className="h-3.5 w-3.5" />
              Mock Test Series
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3 text-foreground text-balance">
              Practice{" "}
              <span className="bg-gradient-to-r from-violet-600 to-primary bg-clip-text text-transparent">
                Mock Tests
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
              Free unlimited mock tests for SSC, Banking, NDA, Railways & more competitive exams
            </p>

            {!loading && testSeries.length > 0 && (
              <div className="flex items-center gap-5 sm:gap-8 mt-6 flex-wrap justify-center">
                {[
                  { label: "Test Series", value: testSeries.length, icon: Brain, color: "text-violet-600" },
                  { label: "Total Tests", value: totalTests, icon: FileText, color: "text-primary" },
                  { label: "Questions", value: totalQuestions > 0 ? totalQuestions : "1000+", icon: Target, color: "text-green-500" },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-0.5">
                    <span className={`text-xl sm:text-2xl font-black ${s.color} tabular-nums`}>{s.value}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Login prompt */}
            {!authLoading && !user && (
              <div className="mt-6 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                  <button onClick={() => setShowAuthModal(true)} className="font-semibold underline">Login</button> to save your progress and access all features
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        {/* Sticky Filter Bar */}
        <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur-sm pb-3 pt-1 -mx-4 px-4 border-b border-border/40 mb-5">
          <div className="flex gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                placeholder="Search test series..."
                value={searchRaw}
                onChange={e => setSearchRaw(e.target.value)}
                className="w-full h-10 sm:h-11 pl-9 pr-9 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                autoComplete="off"
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

            {/* Sort dropdown - desktop */}
            <div className="hidden sm:block">
              <SortDropdown sortBy={sortBy} onSort={setSortBy} label={activeSortLabel} />
            </div>

            {/* Filters drawer */}
            <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
              <DrawerTrigger asChild>
                <button className="relative h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border/60 bg-background flex items-center gap-1.5 sm:gap-2 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors shrink-0">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {hasAnyFilter && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
                      !
                    </span>
                  )}
                </button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85dvh]">
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="text-base">Filters & Sort</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto space-y-5">
                  {/* Sort */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sort by</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {sortOptions.map(opt => {
                        const Icon = opt.icon
                        return (
                          <button
                            key={opt.value}
                            onClick={() => { setSortBy(opt.value); setFilterDrawerOpen(false) }}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                              sortBy === opt.value
                                ? "border-violet-500 bg-violet-500/10 text-violet-600"
                                : "border-border/60 text-muted-foreground hover:bg-muted/60"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="truncate">{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Exam Category</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map(cat => {
                        const Icon = cat.icon
                        const isActive = selectedCategory === cat.id
                        return (
                          <button
                            key={cat.id}
                            onClick={() => { handleCategoryChange(cat.id); setFilterDrawerOpen(false) }}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5"
                            style={isActive ? {
                              backgroundColor: cat.color,
                              color: "#fff",
                              borderColor: "transparent"
                            } : {
                              backgroundColor: `${cat.color}15`,
                              color: cat.color,
                              borderColor: `${cat.color}40`
                            }}
                          >
                            <Icon className="h-3 w-3" />
                            {cat.label}
                          </button>
                        )
                      })}
                    </div>
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

            {/* Sort shortcut on mobile */}
            <div className="sm:hidden">
              <SortDropdown sortBy={sortBy} onSort={setSortBy} label="" compact />
            </div>

            {/* Refresh button */}
            <button
              onClick={() => fetchTestSeries(true)}
              disabled={loading}
              className="h-10 sm:h-11 px-3 rounded-xl border border-border/60 bg-background flex items-center justify-center hover:bg-muted/60 transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const isActive = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 whitespace-nowrap flex items-center gap-1.5"
                  style={isActive ? {
                    backgroundColor: cat.color,
                    color: "#fff",
                    borderColor: "transparent",
                    boxShadow: `0 2px 8px ${cat.color}44`
                  } : {
                    backgroundColor: `${cat.color}10`,
                    color: cat.color,
                    borderColor: `${cat.color}30`
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-4" />
            <p className="text-sm text-muted-foreground">Loading test series...</p>
          </div>
        )}

        {/* Error/Notice State */}
        {!loading && fetchError && testSeries.length === 0 && (
          <div className="text-center py-8 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
              <Brain className="h-4 w-4" />
              {fetchError}
            </div>
          </div>
        )}

        {/* Active filters indicator */}
        {!loading && hasAnyFilter && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs text-muted-foreground">Showing {filtered.length} results</span>
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="gap-1 text-xs capitalize bg-violet-500/10 text-violet-600 border-violet-500/20">
                {selectedCategory}
                <button onClick={() => handleCategoryChange("all")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {search && (
              <Badge variant="secondary" className="gap-1 text-xs">
                "{search}"
                <button onClick={() => setSearchRaw("")} className="ml-1">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Test Series Grid */}
        {!loading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {visible.map((series, idx) => (
                <TestSeriesCard
                  key={series.id || idx}
                  series={series}
                  onStart={() => handleStartSeries(series)}
                  isLoggedIn={!!user}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                  className="gap-2"
                >
                  Load More
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && !fetchError && (
              <div className="text-center py-16 sm:py-24">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No test series found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {search ? "Try a different search term" : "No tests available for this category"}
                </p>
                <Button variant="outline" onClick={clearAll} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
      
      {/* Auth Modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}

// Test Series Card Component
function TestSeriesCard({ series, onStart, isLoggedIn }: { 
  series: TestSeries
  onStart: () => void
  isLoggedIn: boolean
}) {
  const catConfig = CATEGORIES.find(c => c.id === series.category) || CATEGORIES[0]
  const Icon = catConfig.icon

  return (
    <Card className="group overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-border/50 hover:border-violet-400/40 flex flex-col">
      <div className="p-3 sm:p-4 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
          <div 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${catConfig.color}15` }}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: catConfig.color }} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <Badge 
              className="text-[9px] sm:text-[10px] text-white py-0.5 px-1.5"
              style={{ backgroundColor: catConfig.color }}
            >
              {series.category?.toUpperCase() || "GENERAL"}
            </Badge>
            {series.isSample && (
              <Badge className="text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0.5 px-1.5">
                SAMPLE
              </Badge>
            )}
            {series.is_free && !series.isSample && (
              <Badge className="text-[9px] sm:text-[10px] bg-green-500/10 text-green-600 border-green-500/20 py-0.5 px-1.5">
                FREE
              </Badge>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm sm:text-base line-clamp-2 group-hover:text-violet-600 transition-colors mb-1.5 sm:mb-2">
          {series.title}
        </h3>

        {/* Description */}
        {series.description && (
          <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
            {series.description}
          </p>
        )}
        
        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 mt-auto">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{series.total_tests || 10} Tests</span>
          </div>
          {series.duration > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{series.duration} min</span>
            </div>
          )}
          {series.total_questions > 0 && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>{series.total_questions} Qs</span>
            </div>
          )}
        </div>
        
        {/* CTA */}
        <Button 
          onClick={onStart}
          size="sm" 
          className="w-full h-9 sm:h-10 text-xs sm:text-sm bg-violet-600 hover:bg-violet-700 gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          Start Practice
          {!isLoggedIn && !series.isSample && (
            <Lock className="h-3 w-3 ml-1 opacity-70" />
          )}
        </Button>
      </div>
    </Card>
  )
}

// Sort Dropdown Component
function SortDropdown({ sortBy, onSort, label, compact }: { 
  sortBy: string
  onSort: (v: string) => void
  label: string
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`h-10 sm:h-11 rounded-xl border border-border/60 bg-background flex items-center gap-1.5 text-sm font-medium hover:bg-muted/60 transition-colors ${
          compact ? "px-2.5" : "px-3"
        }`}
      >
        <ListFilter className="h-4 w-4" />
        {!compact && <span className="hidden sm:inline">{label}</span>}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border/60 rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-2">
            {sortOptions.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => { onSort(opt.value); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors ${
                    sortBy === opt.value ? "text-violet-600 bg-violet-500/5" : "text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {opt.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function TestSeriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    }>
      <TestSeriesContent />
    </Suspense>
  )
}
