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
  Clock, FileText, Play, BookOpen, Search,
  X, Zap, Target, Flame, 
  Brain, Sparkles, Lock, SlidersHorizontal,
  ChevronDown, Shield, Train, TrendingUp, Atom,
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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function getCategoryColor(catId: string): string {
  return CATEGORIES.find(c => c.id === catId)?.color || "#6366f1"
}

function getCategoryIcon(catId: string) {
  return CATEGORIES.find(c => c.id === catId)?.icon || Globe
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
  const searchRef = useRef<HTMLInputElement>(null)

  const search = useDebounce(searchRaw, 280)

  const fetchTestSeries = useCallback(async (showLoading = false, category?: string) => {
    if (showLoading) setLoading(true)
    setFetchError("")
    
    try {
      const cat = category || selectedCategory
      const res = await fetch(`/api/extract?bulk=true&category=${cat === "all" ? "ssc" : cat}`)
      const data = await res.json()
      
      if (data.success && data.testSeries && data.testSeries.length > 0) {
        setTestSeries(data.testSeries.map((s: TestSeries, idx: number) => ({
          ...s,
          id: s.id || `series-${idx}`,
          category: s.category || cat,
        })))
        setFetchError(data.notice || "")
      } else {
        setTestSeries([])
        setFetchError(data.notice || "No test series found")
      }
    } catch (err) {
      console.error("Error fetching test series:", err)
      setFetchError("Could not load tests")
      setTestSeries([])
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    fetchTestSeries(true)
  }, [fetchTestSeries])

  useEffect(() => { 
    setVisibleCount(PAGE_SIZE) 
  }, [search, selectedCategory, sortBy])

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    const url = new URL(window.location.href)
    if (cat === "all") {
      url.searchParams.delete("category")
    } else {
      url.searchParams.set("category", cat)
    }
    window.history.replaceState({}, "", url.toString())
    fetchTestSeries(true, cat)
  }

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

  const filtered = useMemo(() => {
    let result = testSeries

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      )
    }

    return [...result].sort((a, b) => {
      if (sortBy === "most-tests") return (b.total_tests || 0) - (a.total_tests || 0)
      if (sortBy === "popular") return (b.total_questions || 0) - (a.total_questions || 0)
      return 0
    })
  }, [testSeries, search, sortBy])

  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const hasAnyFilter = selectedCategory !== "all" || search.trim() !== ""

  const clearAll = () => {
    setSearchRaw("")
    handleCategoryChange("all")
  }

  const totalTests = testSeries.reduce((sum, s) => sum + (s.total_tests || 1), 0)
  const totalQuestions = testSeries.reduce((sum, s) => sum + (s.total_questions || 0), 0)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-violet-500/10 via-primary/5 to-background border-b border-border/50">
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
          backgroundSize: "28px 28px"
        }} />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />

        <div className="relative container mx-auto px-4 py-8 sm:py-12">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-xs font-semibold mb-4 shadow-sm">
              <Zap className="h-3.5 w-3.5" />
              Mock Test Series
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3 text-foreground text-balance">
              Practice <span className="bg-gradient-to-r from-violet-600 to-primary bg-clip-text text-transparent">Mock Tests</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
              Free unlimited mock tests for SSC, Banking, NDA, Railways & more competitive exams
            </p>

            {!loading && testSeries.length > 0 && (
              <div className="flex items-center gap-5 sm:gap-8 mt-6 flex-wrap justify-center">
                {[
                  { label: "Test Series", value: testSeries.length, color: "text-violet-600" },
                  { label: "Total Tests", value: totalTests, color: "text-primary" },
                  { label: "Questions", value: totalQuestions > 0 ? totalQuestions : "1000+", color: "text-green-500" },
                ].map(s => (
                  <div key={s.label} className="flex flex-col items-center gap-0.5">
                    <span className={`text-xl sm:text-2xl font-black ${s.color} tabular-nums`}>{s.value}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {!authLoading && !user && (
              <div className="mt-6 flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2">
                <Lock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <span className="text-xs sm:text-sm text-amber-700 dark:text-amber-400">
                  <button onClick={() => setShowAuthModal(true)} className="font-semibold underline">Login</button> to save your progress
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur-sm pb-3 pt-1 -mx-4 px-4 border-b border-border/40 mb-5">
          <div className="flex gap-2 items-center">
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
                <button onClick={() => setSearchRaw("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
              <DrawerTrigger asChild>
                <button className="relative h-10 sm:h-11 px-3 sm:px-4 rounded-xl border border-border/60 bg-background flex items-center gap-1.5 sm:gap-2 text-sm font-medium hover:bg-muted/60 transition-colors shrink-0">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {hasAnyFilter && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">!</span>
                  )}
                </button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85dvh]">
                <DrawerHeader className="pb-2">
                  <DrawerTitle className="text-base">Filters & Sort</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto space-y-5">
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

            <button
              onClick={() => fetchTestSeries(true)}
              disabled={loading}
              className="h-10 sm:h-11 px-3 rounded-xl border border-border/60 bg-background flex items-center justify-center hover:bg-muted/60 transition-colors shrink-0"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

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

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-4" />
            <p className="text-sm text-muted-foreground">Loading test series...</p>
          </div>
        )}

        {!loading && fetchError && testSeries.length === 0 && (
          <div className="text-center py-8 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
              <Brain className="h-4 w-4" />
              {fetchError}
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {hasAnyFilter && (
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
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visible.map((series, idx) => {
                const catColor = getCategoryColor(series.category)
                const CatIcon = getCategoryIcon(series.category)
                
                return (
                  <Card 
                    key={series.id || idx}
                    className="group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/50 hover:border-violet-400/40 flex flex-col"
                  >
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${catColor}15` }}
                        >
                          <CatIcon className="h-5 w-5" style={{ color: catColor }} />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <Badge 
                            className="text-[10px] text-white py-0.5 px-1.5"
                            style={{ backgroundColor: catColor }}
                          >
                            {series.category?.toUpperCase() || "GENERAL"}
                          </Badge>
                          {series.isSample && (
                            <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0.5 px-1.5">
                              SAMPLE
                            </Badge>
                          )}
                        </div>
                      </div>

                      <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-violet-600 transition-colors mb-2">
                        {series.title}
                      </h3>

                      {series.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {series.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4 mt-auto">
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
                      </div>
                      
                      <Button 
                        onClick={() => handleStartSeries(series)}
                        size="sm" 
                        className="w-full h-9 text-xs bg-violet-600 hover:bg-violet-700 gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Start Now
                        {!authLoading && !user && !series.isSample && (
                          <Lock className="h-2.5 w-2.5 ml-0.5 opacity-70" />
                        )}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="gap-2"
                >
                  Load More
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {!loading && filtered.length === 0 && testSeries.length > 0 && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={clearAll}>
              Clear Filters
            </Button>
          </div>
        )}
      </main>

      <Footer />
      
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}

function TestSeriesPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<TestSeriesPageLoading />}>
      <TestSeriesContent />
    </Suspense>
  )
}
