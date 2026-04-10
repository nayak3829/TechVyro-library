"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { AuthModal } from "@/components/auth-modal"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  Search, X, FileText, Clock, Play, Loader2,
  Target, TrendingUp, Shield, Train, BookOpen, Atom,
  GraduationCap, Globe, Zap, RefreshCw, Building2,
  ExternalLink, Database, ChevronDown, Trophy, Users,
  Layers, CheckCircle, Shuffle, List, LayoutGrid,
  SortAsc, History, ChevronRight, Flame, 
  Star, AlertCircle, Sparkles, ArrowRight
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MockTest {
  id: string
  title: string
  slug: string
  description?: string
  total_tests?: number
  total_questions?: number
  duration?: number
  is_free?: boolean
  category?: string
  isSample?: boolean
  _sourceApi?: string
  _sourceWeb?: string
  _platformName?: string
}

interface Platform {
  name: string
  api: string
  web: string
}

interface RecentPlatform extends Platform {
  visitedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all",        label: "All",        icon: Globe,         color: "#8b5cf6" },
  { id: "ssc",        label: "SSC",        icon: Target,        color: "#3b82f6" },
  { id: "banking",    label: "Banking",    icon: TrendingUp,    color: "#10b981" },
  { id: "defence",    label: "Defence",    icon: Shield,        color: "#ef4444" },
  { id: "railways",   label: "Railways",   icon: Train,         color: "#f97316" },
  { id: "upsc",       label: "UPSC/PCS",   icon: BookOpen,      color: "#8b5cf6" },
  { id: "jee-neet",   label: "JEE/NEET",   icon: Atom,          color: "#06b6d4" },
  { id: "teaching",   label: "CTET/TET",   icon: GraduationCap, color: "#ec4899" },
  { id: "agriculture",label: "Agriculture",icon: Building2,     color: "#84cc16" },
  { id: "general",    label: "Others",     icon: Globe,         color: "#64748b" },
]

const POPULAR_PLATFORMS: (Platform & { category: string })[] = [
  { name: "Parmar Academy",   api: "https://parmaracademyapi.classx.co.in",                    web: "https://parmaracademy.classx.co.in",                    category: "defence"  },
  { name: "SSC Pinnacle",     api: "https://ssccglpinnacleapi.classx.co.in",                   web: "https://ssccglpinnacle.classx.co.in",                   category: "ssc"      },
  { name: "Oliveboard",       api: "https://oliveboardapi.classx.co.in",                       web: "https://oliveboard.classx.co.in",                       category: "banking"  },
  { name: "Adda247",          api: "https://achieversadda247api.classx.co.in",                 web: "https://achieversadda247.classx.co.in",                 category: "ssc"      },
  { name: "Wifistudy SSC",    api: "https://cccwifistudyapi.classx.co.in",                    web: "https://cccwifistudy.classx.co.in",                    category: "ssc"      },
  { name: "Testbook",         api: "https://etestseriescompetitiveexamstestbookapi.classx.co.in", web: "https://etestseriestestbook.classx.co.in",          category: "ssc"      },
  { name: "Drishti IAS",      api: "https://drishtipediaapi.classx.co.in",                    web: "https://drishtipedia.classx.co.in",                    category: "upsc"     },
  { name: "Divya Drishti",    api: "https://divyadrishticlassesapi.classx.co.in",              web: "https://divyadrishticlasses.classx.co.in",              category: "defence"  },
]

const RECENT_KEY = "techvyro_recent_platforms"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryColor(cat?: string) {
  return CATEGORIES.find(c => c.id === cat)?.color ?? "#8b5cf6"
}

function getCategoryIcon(cat?: string) {
  return CATEGORIES.find(c => c.id === cat)?.icon ?? GraduationCap
}

function saveRecentPlatform(p: Platform) {
  try {
    const existing: RecentPlatform[] = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")
    const filtered = existing.filter(r => r.api !== p.api)
    const updated = [{ ...p, visitedAt: new Date().toISOString() }, ...filtered].slice(0, 5)
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
  } catch {}
}

function getRecentPlatforms(): RecentPlatform[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") } catch { return [] }
}

// ─── Skeleton cards ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card className="overflow-hidden border-border/50">
      <div className="h-1 w-full bg-muted" />
      <div className="p-4 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-14 rounded" />
          <Skeleton className="h-4 w-10 rounded" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TestSeriesPage() {
  const router = useRouter()
  const { user } = useAuth()

  // Core state
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [mockTests, setMockTests]               = useState<MockTest[]>([])
  const [loading, setLoading]                   = useState(true)
  const [search, setSearch]                     = useState("")
  const [fetchError, setFetchError]             = useState("")
  const [liveCount, setLiveCount]               = useState(0)
  const [viewMode, setViewMode]                 = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy]                     = useState<"default" | "duration" | "questions">("default")
  const [showAuthModal, setShowAuthModal]       = useState(false)

  // Platform search state
  const [platformQuery, setPlatformQuery]             = useState("")
  const [platformResults, setPlatformResults]         = useState<Platform[]>([])
  const [platformSearchLoading, setPlatformSearchLoading] = useState(false)
  const [selectedPlatform, setSelectedPlatform]       = useState<Platform | null>(null)
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false)
  const [platformTests, setPlatformTests]             = useState<MockTest[]>([])
  const [platformTestsLoading, setPlatformTestsLoading] = useState(false)
  const [platformTestsError, setPlatformTestsError]   = useState("")
  const [recentPlatforms, setRecentPlatforms]         = useState<RecentPlatform[]>([])

  const platformDropdownRef = useRef<HTMLDivElement>(null)
  const platformDebounceRef = useRef<ReturnType<typeof setTimeout>>()

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cat = params.get("category")
    if (cat && CATEGORIES.some(c => c.id === cat)) setSelectedCategory(cat)
    setRecentPlatforms(getRecentPlatforms())
  }, [])

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target as Node))
        setShowPlatformDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Fetch bulk mock tests ─────────────────────────────────────────────────

  const fetchMockTests = useCallback(async (category: string) => {
    setLoading(true)
    setFetchError("")
    setMockTests([])
    try {
      const res = await fetch(`/api/extract?bulk=true&category=${category}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.testSeries) && data.testSeries.length > 0) {
        setMockTests(data.testSeries as MockTest[])
        setLiveCount(data.liveCount || 0)
      } else {
        setFetchError(data.notice || "No tests found for this category.")
      }
    } catch {
      setFetchError("Could not load tests. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMockTests(selectedCategory) }, [selectedCategory, fetchMockTests])

  // ── Platform search ───────────────────────────────────────────────────────

  useEffect(() => {
    clearTimeout(platformDebounceRef.current)
    if (!platformQuery.trim()) { setPlatformResults([]); setShowPlatformDropdown(false); return }
    platformDebounceRef.current = setTimeout(async () => {
      setPlatformSearchLoading(true)
      try {
        const res = await fetch(`/api/platforms/search?q=${encodeURIComponent(platformQuery)}&limit=15`)
        const data = await res.json()
        setPlatformResults(data.platforms || [])
        setShowPlatformDropdown(true)
      } catch { setPlatformResults([]) }
      finally { setPlatformSearchLoading(false) }
    }, 300)
  }, [platformQuery])

  const fetchPlatformTests = useCallback(async (platform: Platform) => {
    setPlatformTestsLoading(true)
    setPlatformTests([])
    setPlatformTestsError("")
    try {
      const res = await fetch(
        `/api/extract?apiUrl=${encodeURIComponent(platform.api)}&url=${encodeURIComponent(platform.web)}`
      )
      if (!res.ok) throw new Error("API error")
      const data = await res.json()
      if (data.success && Array.isArray(data.testSeries) && data.testSeries.length > 0) {
        setPlatformTests(data.testSeries as MockTest[])
      } else {
        setPlatformTestsError(
          data.notice || "No tests found for this platform. It may not expose public test data."
        )
      }
    } catch {
      setPlatformTestsError("Failed to fetch tests from this platform.")
    } finally {
      setPlatformTestsLoading(false)
    }
  }, [])

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform)
    setPlatformQuery(platform.name)
    setShowPlatformDropdown(false)
    saveRecentPlatform(platform)
    setRecentPlatforms(getRecentPlatforms())
    fetchPlatformTests(platform)
  }

  const clearPlatform = () => {
    setSelectedPlatform(null)
    setPlatformQuery("")
    setPlatformTests([])
    setPlatformTestsError("")
  }

  // ── Category change ───────────────────────────────────────────────────────

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId)
    setSearch("")
    router.push(`/test-series?category=${catId}`, { scroll: false })
  }

  // ── Open quiz ─────────────────────────────────────────────────────────────

  const openQuiz = useCallback((test: MockTest) => {
    if (!user && !test.isSample) { setShowAuthModal(true); return }
    const params = new URLSearchParams({
      testId:      test.slug || test.id,
      apiBase:     test._sourceApi || `sample:${test.category || "ssc"}`,
      title:       test.title,
      seriesTitle: test._platformName || "TechVyro Mock Test",
      platform:    test._platformName || "TechVyro",
      duration:    String(test.duration || 60),
    })
    router.push(`/test-series/play?${params}`)
  }, [user, router])

  const browseSeries = useCallback((test: MockTest) => {
    const params = new URLSearchParams({
      slug:    test.slug || test.id,
      apiBase: test._sourceApi || `sample:${test.category}`,
      webBase: test._sourceWeb || "",
      title:   test.title,
    })
    router.push(`/test-series/series?${params}`)
  }, [router])

  // ── Quick practice (random sample) ────────────────────────────────────────

  const quickPractice = () => {
    const samples = mockTests.filter(t => t.isSample)
    const pool    = samples.length > 0 ? samples : mockTests
    if (!pool.length) return
    openQuiz(pool[Math.floor(Math.random() * pool.length)])
  }

  // ── Filtered / sorted tests ───────────────────────────────────────────────

  const filteredTests = useMemo(() => {
    let list = [...mockTests]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t._platformName?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      )
    }
    if (sortBy === "duration")  list.sort((a, b) => (a.duration  || 999) - (b.duration  || 999))
    if (sortBy === "questions") list.sort((a, b) => (b.total_questions || 0) - (a.total_questions || 0))
    return list
  }, [mockTests, search, sortBy])

  const displayTests = selectedPlatform ? platformTests : filteredTests

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const renderGridCard = (test: MockTest, idx: number) => {
    const color = getCategoryColor(test.category)
    const Icon  = getCategoryIcon(test.category)
    const isLive = !test.isSample

    return (
      <Card
        key={`g-${idx}-${test.slug || test.id}`}
        className="group flex flex-col overflow-hidden border-border/50 hover:border-primary/40 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 bg-card"
      >
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}80)` }} />
        <div className="flex flex-col flex-1 p-4">

          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {test.title}
              </h3>
              {test._platformName && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                  <Database className="h-2.5 w-2.5 shrink-0" />
                  {test._platformName}
                </p>
              )}
            </div>
            {isLive
              ? <Badge className="text-[8px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0">LIVE</Badge>
              : <Badge className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">PRACTICE</Badge>
            }
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-4 flex-1">
            {!!test.total_tests && test.total_tests > 0 && (
              <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{test.total_tests} Tests</span>
            )}
            {!!test.total_questions && test.total_questions > 0 && (
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{test.total_questions} Qs</span>
            )}
            {!!test.duration && test.duration > 0 && (
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{test.duration} min</span>
            )}
            {test.category && (
              <Badge className="text-[9px] text-white px-1.5 py-0 border-0" style={{ backgroundColor: color }}>
                {test.category.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => openQuiz(test)}
              size="sm"
              className="flex-1 h-9 text-xs font-semibold gap-1.5 bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start Test
            </Button>
            <Button
              onClick={() => browseSeries(test)}
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0 border-border/60 hover:bg-muted/50 hover:border-primary/40 shrink-0"
              title="Browse tests in this series"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const renderListItem = (test: MockTest, idx: number) => {
    const color = getCategoryColor(test.category)
    const Icon  = getCategoryIcon(test.category)
    const isLive = !test.isSample

    return (
      <Card
        key={`l-${idx}-${test.slug || test.id}`}
        className="flex items-center gap-3 px-4 py-3 border-border/50 hover:border-primary/40 hover:bg-muted/20 transition-all"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{test.title}</p>
            {isLive
              ? <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0">LIVE</Badge>
              : <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">PRACTICE</Badge>
            }
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {test._platformName && <span className="text-[10px] text-muted-foreground">{test._platformName}</span>}
            {!!test.total_tests    && test.total_tests > 0    && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{test.total_tests} tests</span>}
            {!!test.duration       && test.duration > 0       && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{test.duration}m</span>}
            {!!test.total_questions && test.total_questions > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><FileText className="h-2.5 w-2.5" />{test.total_questions} Qs</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={() => openQuiz(test)} className="h-8 px-3 text-xs gap-1 bg-gradient-to-r from-primary to-accent text-white hover:opacity-90">
            <Play className="h-3 w-3 fill-current" /> Start
          </Button>
          <Button size="sm" variant="outline" onClick={() => browseSeries(test)} className="h-8 w-8 p-0 border-border/60 hover:border-primary/40">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Hero Section ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-background">
        {/* Layered backgrounds - matching hero section */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(120,80,200,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(239,68,68,0.06),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(120,80,200,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(120,80,200,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute top-20 left-10 w-80 h-80 bg-primary/6 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/6 rounded-full blur-[140px] pointer-events-none" />

        <div className="container mx-auto px-4 pt-10 pb-8 sm:pt-16 sm:pb-12 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-xs font-semibold text-primary mb-5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <Sparkles className="h-3 w-3 opacity-70" />
              <span>Free Mock Tests</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 leading-[1.1]">
              <span className="text-foreground">TechVyro </span>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Mock Test Portal
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
              Access 9,686+ platforms with free mock tests for SSC, Banking, Defence, Railways, UPSC and more. 
              Practice anytime, anywhere with auto-graded tests.
            </p>

            {/* Stats pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {[
                { icon: Trophy,       label: "Free Mock Tests",                    color: "text-amber-500", bg: "bg-amber-500/10" },
                { icon: Zap,          label: liveCount > 0 ? `${liveCount} Live` : "Live Tests", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { icon: CheckCircle,  label: "Auto-Graded",                        color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: Users,        label: "No Login for Samples",               color: "text-rose-500", bg: "bg-rose-500/10" },
              ].map(({ icon: Ic, label, color, bg }) => (
                <div key={label} className={`flex items-center gap-1.5 ${bg} border border-border/50 rounded-full px-3 py-1.5`}>
                  <Ic className={`h-3.5 w-3.5 ${color}`} />
                  <span className="text-xs font-medium text-foreground/80">{label}</span>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {!loading && mockTests.length > 0 && (
                <Button
                  onClick={quickPractice}
                  className="gap-2 bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 shadow-lg shadow-primary/25"
                >
                  <Shuffle className="h-4 w-4" />
                  Quick Practice
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => fetchMockTests(selectedCategory)}
                disabled={loading}
                className="gap-2 border-border/60 hover:border-primary/50 hover:bg-primary/5"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh Tests
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky controls ──────────────────────────────────────────────────── */}
      <div className="sticky top-14 sm:top-16 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-3 space-y-2.5">

          {/* Platform search */}
          <div ref={platformDropdownRef} className="relative">
            <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10 pointer-events-none" />
            <Input
              placeholder="Search 9,686+ platforms... (e.g. parmaracademy, ssccglpinnacle, oliveboard)"
              value={platformQuery}
              onChange={e => { setPlatformQuery(e.target.value); if (!e.target.value) clearPlatform() }}
              className="pl-9 pr-9 h-10 text-sm border-border/50 focus:border-primary/50 bg-muted/30"
            />
            {platformSearchLoading
              ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              : selectedPlatform && (
                <button onClick={clearPlatform} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )
            }

            {/* Dropdown */}
            {showPlatformDropdown && platformResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border/60 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                {platformResults.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handlePlatformSelect(p)}
                    className="w-full px-4 py-2.5 text-left hover:bg-muted/60 flex items-center justify-between gap-2 border-b border-border/20 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.web}</p>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 -rotate-90" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Test search — only in bulk mode */}
          {!selectedPlatform && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search mock tests..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm bg-muted/20 border-border/40 focus:border-primary/50"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Category pills — only in bulk mode */}
          {!selectedPlatform && (
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                {CATEGORIES.map(cat => {
                  const Icon   = cat.icon
                  const active = selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryChange(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all shrink-0 ${
                        active
                          ? "text-white border-transparent shadow-lg"
                          : "bg-background border-border/50 hover:border-primary/40 hover:bg-primary/5 text-foreground"
                      }`}
                      style={active ? { backgroundColor: cat.color, boxShadow: `0 4px 14px ${cat.color}40` } : {}}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent" />
            </div>
          )}

          {/* Sort + view toggle — only in bulk mode */}
          {!selectedPlatform && (
            <div className="flex items-center justify-between gap-2">
              <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-8 w-[160px] text-xs gap-1 border-border/50">
                  <SortAsc className="h-3 w-3 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default order</SelectItem>
                  <SelectItem value="duration">Short duration first</SelectItem>
                  <SelectItem value="questions">Most questions</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex rounded-lg border border-border/50 overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  title="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <section className="py-8 sm:py-12 bg-background relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(120,80,200,0.04),transparent)]" />
        
        <div className="container mx-auto px-4 relative">

          {/* ── PLATFORM MODE ─────────────────────────────────────────────── */}
          {selectedPlatform && (
            <div>
              {/* Platform header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center gap-2 bg-primary/8 border border-primary/20 rounded-xl px-4 py-2.5">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{selectedPlatform.name}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-primary/60" />
                </div>
                <button onClick={clearPlatform} className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors">
                  Show all tests
                </button>
              </div>

              {/* Loading */}
              {platformTestsLoading && (
                <div className="flex items-center gap-3 py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Fetching from {selectedPlatform.name}...</span>
                </div>
              )}

              {/* Error */}
              {!platformTestsLoading && platformTestsError && (
                <div className="text-center py-20 border border-dashed border-border/60 rounded-2xl bg-muted/10">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground mb-2">No tests found</p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{platformTestsError}</p>
                  <Button variant="outline" onClick={clearPlatform} className="gap-2">
                    <Search className="h-4 w-4" />
                    Search another platform
                  </Button>
                </div>
              )}

              {/* Results */}
              {!platformTestsLoading && platformTests.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground mb-5">
                    <span className="font-semibold text-foreground">{platformTests.length}</span> mock tests found
                  </p>
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {platformTests.map((t, i) => renderGridCard(t, i))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── BULK MODE ─────────────────────────────────────────────────── */}
          {!selectedPlatform && (
            <>
              {/* Popular + recent platforms (shown when not loading and no search) */}
              {!loading && !search && (
                <div className="mb-8 space-y-5">

                  {/* Recently visited */}
                  {recentPlatforms.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <History className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Recently Visited</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentPlatforms.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => handlePlatformSelect(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                          >
                            <History className="h-3 w-3" />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Popular platforms */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold text-foreground">Popular Platforms</span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Quick access</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_PLATFORMS.map((p, i) => {
                        const color = getCategoryColor(p.category)
                        return (
                          <button
                            key={i}
                            onClick={() => handlePlatformSelect(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-md"
                            style={{ borderColor: `${color}30`, color, backgroundColor: `${color}08` }}
                          >
                            <Database className="h-3 w-3" />
                            {p.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Loading skeletons */}
              {loading && (
                <div>
                  <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Fetching live mock tests from TechVyro platforms...
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                </div>
              )}

              {/* Error state */}
              {!loading && fetchError && mockTests.length === 0 && (
                <div className="text-center py-20">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground mb-2">Could not load mock tests</p>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">{fetchError}</p>
                  <Button onClick={() => fetchMockTests(selectedCategory)} className="gap-2 bg-gradient-to-r from-primary to-accent text-white">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              )}

              {/* Tests grid / list */}
              {!loading && filteredTests.length > 0 && (
                <>
                  {/* Result count bar */}
                  <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{filteredTests.length}</span> mock tests
                    </span>
                    {liveCount > 0 && (
                      <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <Zap className="h-3 w-3 mr-1" />{liveCount} live
                      </Badge>
                    )}
                    {search && (
                      <Badge variant="outline" className="text-xs gap-1">
                        &quot;{search}&quot;
                        <button onClick={() => setSearch("")}><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                  </div>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                      {filteredTests.map((t, i) => renderGridCard(t, i))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTests.map((t, i) => renderListItem(t, i))}
                    </div>
                  )}
                </>
              )}

              {/* No search results */}
              {!loading && search && filteredTests.length === 0 && mockTests.length > 0 && (
                <div className="text-center py-20">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">
                    No results for &quot;<strong>{search}</strong>&quot;
                  </p>
                  <Button variant="link" size="sm" onClick={() => setSearch("")} className="text-primary">Clear search</Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────────────────────────────── */}
      <section className="relative py-16 sm:py-20 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(120,80,200,0.10),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(120,80,200,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(120,80,200,0.02)_1px,transparent_1px)] bg-[size:72px_72px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Also Explore
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-4 tracking-tight leading-[1.1]">
              More Ways to <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Learn</span>
            </h3>

            <p className="text-muted-foreground text-sm sm:text-base mb-8 max-w-lg mx-auto leading-relaxed">
              Explore our PDF library, quiz portal, and study materials to enhance your preparation.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/#content"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 transition-all duration-200 shadow-xl shadow-primary/25"
              >
                <BookOpen className="h-4 w-4" />
                Browse PDF Library
              </Link>
              <Link
                href="/quiz"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm text-foreground text-sm font-semibold hover:border-amber-500/50 hover:bg-amber-500/5 transition-all duration-200"
              >
                <Zap className="h-4 w-4 text-amber-500" />
                Try Quiz Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Auth modal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}
