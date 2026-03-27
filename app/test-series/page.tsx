"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import { AuthModal } from "@/components/auth-modal"
import {
  Search, X, FileText, Clock, Play, Loader2,
  Target, TrendingUp, Shield, Train, BookOpen, Atom, GraduationCap, Globe,
  Zap, RefreshCw, Building2, ExternalLink, Database, ChevronDown,
  Trophy, Users, Layers, CheckCircle, Shuffle, List, LayoutGrid, SortAsc,
  Star, History, ChevronRight, BookMarked, Flame
} from "lucide-react"

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

const CATEGORIES = [
  { id: "all", label: "All", icon: Globe, color: "#6366f1" },
  { id: "ssc", label: "SSC", icon: Target, color: "#3b82f6" },
  { id: "banking", label: "Banking", icon: TrendingUp, color: "#10b981" },
  { id: "defence", label: "Defence", icon: Shield, color: "#ef4444" },
  { id: "railways", label: "Railways", icon: Train, color: "#f97316" },
  { id: "upsc", label: "UPSC/PCS", icon: BookOpen, color: "#8b5cf6" },
  { id: "jee-neet", label: "JEE/NEET", icon: Atom, color: "#06b6d4" },
  { id: "teaching", label: "CTET/TET", icon: GraduationCap, color: "#ec4899" },
  { id: "agriculture", label: "Agriculture", icon: Building2, color: "#84cc16" },
  { id: "general", label: "Others", icon: Globe, color: "#64748b" },
]

function getCategoryColor(cat?: string): string {
  return CATEGORIES.find(c => c.id === cat)?.color || "#6366f1"
}

function getCategoryIcon(cat?: string) {
  return CATEGORIES.find(c => c.id === cat)?.icon || GraduationCap
}

const POPULAR_PLATFORMS = [
  { name: "Parmar Academy", api: "https://parmaracademyapi.classx.co.in", web: "https://parmaracademy.classx.co.in", category: "defence" },
  { name: "SSC Pinnacle", api: "https://ssccglpinnacleapi.classx.co.in", web: "https://ssccglpinnacle.classx.co.in", category: "ssc" },
  { name: "Oliveboard", api: "https://oliveboardapi.classx.co.in", web: "https://oliveboard.classx.co.in", category: "banking" },
  { name: "Adda247", api: "https://achieversadda247api.classx.co.in", web: "https://achieversadda247.classx.co.in", category: "ssc" },
  { name: "Wifistudy SSC", api: "https://cccwifistudyapi.classx.co.in", web: "https://cccwifistudy.classx.co.in", category: "ssc" },
  { name: "Testbook", api: "https://etestseriescompetitiveexamstestbookapi.classx.co.in", web: "https://etestseriestestbook.classx.co.in", category: "ssc" },
  { name: "Drishti IAS", api: "https://drishtipediaapi.classx.co.in", web: "https://drishtipedia.classx.co.in", category: "upsc" },
  { name: "Divya Drishti", api: "https://divyadrishticlassesapi.classx.co.in", web: "https://divyadrishticlasses.classx.co.in", category: "defence" },
]

const ATTEMPT_KEY = "techvyro_test_attempts"
const RECENT_PLATFORMS_KEY = "techvyro_recent_platforms"

interface RecentPlatform {
  name: string; api: string; web: string; visitedAt: string
}

function saveRecentPlatform(platform: { name: string; api: string; web: string }) {
  try {
    const existing: RecentPlatform[] = JSON.parse(localStorage.getItem(RECENT_PLATFORMS_KEY) || "[]")
    const filtered = existing.filter(p => p.api !== platform.api)
    const updated = [{ ...platform, visitedAt: new Date().toISOString() }, ...filtered].slice(0, 5)
    localStorage.setItem(RECENT_PLATFORMS_KEY, JSON.stringify(updated))
  } catch {}
}

export default function TestSeriesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [selectedCategory, setSelectedCategory] = useState("all")
  const [mockTests, setMockTests] = useState<MockTest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [fetchError, setFetchError] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"default" | "duration" | "questions">("default")
  const [recentPlatforms, setRecentPlatforms] = useState<RecentPlatform[]>([])

  // Platform search
  const [platformQuery, setPlatformQuery] = useState("")
  const [platformResults, setPlatformResults] = useState<Platform[]>([])
  const [platformLoading, setPlatformLoading] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false)
  const [platformTests, setPlatformTests] = useState<MockTest[]>([])
  const [platformLoading2, setPlatformLoading2] = useState(false)
  const platformDropdownRef = useRef<HTMLDivElement>(null)
  const platformDebounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cat = params.get("category")
    if (cat && CATEGORIES.some(c => c.id === cat)) setSelectedCategory(cat)
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_PLATFORMS_KEY) || "[]")
      setRecentPlatforms(recent)
    } catch {}
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target as Node))
        setShowPlatformDropdown(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    clearTimeout(platformDebounceRef.current)
    if (platformQuery.length < 1) { setPlatformResults([]); setShowPlatformDropdown(false); return }
    platformDebounceRef.current = setTimeout(async () => {
      setPlatformLoading(true)
      try {
        const res = await fetch(`/api/platforms/search?q=${encodeURIComponent(platformQuery)}&limit=15`)
        const data = await res.json()
        setPlatformResults(data.platforms || [])
        setShowPlatformDropdown(true)
      } catch { setPlatformResults([]) }
      finally { setPlatformLoading(false) }
    }, 300)
  }, [platformQuery])

  const fetchPlatformTests = useCallback(async (platform: Platform) => {
    setPlatformLoading2(true)
    setPlatformTests([])
    try {
      const res = await fetch(`/api/extract?apiUrl=${encodeURIComponent(platform.api)}&url=${encodeURIComponent(platform.web)}`)
      if (!res.ok) throw new Error("API error")
      const text = await res.text()
      if (!text || text.trim() === "") throw new Error("Empty response")
      const data = JSON.parse(text)
      if (data.success && data.testSeries?.length > 0)
        setPlatformTests(data.testSeries as MockTest[])
    } catch { setPlatformTests([]) }
    finally { setPlatformLoading2(false) }
  }, [])

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform)
    setPlatformQuery(platform.name)
    setShowPlatformDropdown(false)
    fetchPlatformTests(platform)
    saveRecentPlatform(platform)
    try {
      const recent = JSON.parse(localStorage.getItem(RECENT_PLATFORMS_KEY) || "[]")
      setRecentPlatforms(recent)
    } catch {}
  }

  const clearPlatform = () => { setSelectedPlatform(null); setPlatformQuery(""); setPlatformTests([]) }

  const fetchMockTests = useCallback(async (category: string) => {
    setLoading(true)
    setFetchError("")
    try {
      const res = await fetch(`/api/extract?bulk=true&category=${category}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (!text || text.trim() === "") throw new Error("Empty response")
      const data = JSON.parse(text)
      if (data.success && data.testSeries?.length > 0) {
        setMockTests(data.testSeries as MockTest[])
        setLiveCount(data.liveCount || 0)
        setFetchError("")
      } else {
        setMockTests([])
        setFetchError(data.notice || "No tests found")
      }
    } catch (err) {
      setFetchError("Could not load tests. Please try again.")
      setMockTests([])
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMockTests(selectedCategory) }, [selectedCategory, fetchMockTests])

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId)
    setSearch("")
    router.push(`/test-series?category=${catId}`, { scroll: false })
  }

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
    if (sortBy === "duration") list.sort((a, b) => (a.duration || 999) - (b.duration || 999))
    if (sortBy === "questions") list.sort((a, b) => (b.total_questions || 0) - (a.total_questions || 0))
    return list
  }, [mockTests, search, sortBy])

  const openQuiz = useCallback((test: MockTest) => {
    const params = new URLSearchParams({
      testId: test.slug || test.id,
      apiBase: test._sourceApi || `sample:${test.category || "ssc"}`,
      title: test.title,
      seriesTitle: test._platformName || "APX Mock Test",
      duration: String(test.duration || 60),
    })
    window.open(`/api/quiz-html?${params}`, "_blank")
  }, [])

  const browseSeries = useCallback((test: MockTest) => {
    const params = new URLSearchParams({
      slug: test.slug || test.id,
      apiBase: test._sourceApi || `sample:${test.category}`,
      webBase: test._sourceWeb || "",
      title: test.title,
    })
    router.push(`/test-series/series?${params}`)
  }, [router])

  const renderMockCard = (test: MockTest, idx: number) => {
    const color = getCategoryColor(test.category)
    const Icon = getCategoryIcon(test.category)
    const isLive = !test.isSample

    return (
      <Card
        key={`${idx}_${(test._platformName || "s").slice(0,8)}_${(test.slug || test.id || "").slice(0,12)}`}
        className="group flex flex-col overflow-hidden border-border/50 hover:border-violet-400/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card"
      >
        {/* Top color strip */}
        <div className="h-1 w-full" style={{ backgroundColor: color }} />

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
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors">
                {test.title}
              </h3>
              {test._platformName && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                  <Database className="h-2.5 w-2.5 shrink-0" />
                  {test._platformName}
                </p>
              )}
            </div>
            {isLive ? (
              <Badge className="text-[8px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 shrink-0">
                LIVE
              </Badge>
            ) : (
              <Badge className="text-[8px] bg-amber-500/10 text-amber-600 border-amber-500/30 shrink-0">
                PRACTICE
              </Badge>
            )}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground mb-4 flex-1">
            {(test.total_tests && test.total_tests > 0) ? (
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {test.total_tests} Tests
              </span>
            ) : null}
            {(test.total_questions && test.total_questions > 0) ? (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {test.total_questions} Qs
              </span>
            ) : null}
            {(test.duration && test.duration > 0) ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {test.duration} min
              </span>
            ) : null}
            {test.category && (
              <Badge
                className="text-[9px] text-white px-1.5 py-0"
                style={{ backgroundColor: color }}
              >
                {test.category.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => openQuiz(test)}
              size="sm"
              className="flex-1 h-10 text-xs font-semibold gap-1.5"
              style={{ backgroundColor: color }}
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start Mock
            </Button>
            <Button
              onClick={() => browseSeries(test)}
              size="sm"
              variant="outline"
              className="h-10 w-10 p-0 border-border/60 hover:bg-muted/50 shrink-0"
              title="Browse individual tests"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  const totalDisplayed = selectedPlatform ? platformTests.length : filteredTests.length

  const quickPractice = () => {
    const samples = mockTests.filter(t => t.isSample)
    const pool = samples.length > 0 ? samples : mockTests
    if (pool.length === 0) return
    const random = pool[Math.floor(Math.random() * pool.length)]
    openQuiz(random)
  }

  const renderMockListItem = (test: MockTest, idx: number) => {
    const color = getCategoryColor(test.category)
    const Icon = getCategoryIcon(test.category)
    const isLive = !test.isSample
    return (
      <Card
        key={`list_${idx}_${(test.slug || test.id || "").slice(0, 12)}`}
        className="flex items-center gap-3 px-4 py-3 border-border/50 hover:border-violet-400/40 hover:bg-muted/20 transition-all"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
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
            {test.total_tests && test.total_tests > 0 ? <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{test.total_tests} tests</span> : null}
            {test.duration && test.duration > 0 ? <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{test.duration}m</span> : null}
            {test.total_questions && test.total_questions > 0 ? <span className="text-[10px] text-muted-foreground flex items-center gap-1"><FileText className="h-2.5 w-2.5" />{test.total_questions} Qs</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={() => openQuiz(test)} className="h-8 px-3 text-xs gap-1" style={{ backgroundColor: color }}>
            <Play className="h-3 w-3 fill-current" /> Start
          </Button>
          <Button size="sm" variant="outline" onClick={() => browseSeries(test)} className="h-8 w-8 p-0 border-border/60">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* Hero / Header */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 text-white">
        <div className="container mx-auto px-4 pt-8 pb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">APX Mock Test Portal</h1>
              <p className="text-violet-200 text-sm mt-1">
                {loading ? "Loading tests from live platforms..." : `${totalDisplayed} mock tests · 9,686+ platforms`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!loading && mockTests.length > 0 && (
                <Button
                  size="sm"
                  onClick={quickPractice}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5 text-xs hidden sm:flex"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Quick Practice
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/20"
                onClick={() => fetchMockTests(selectedCategory)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-3 mt-4 text-xs">
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-yellow-300" />
              <span>Free Mock Tests</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <Zap className="h-3.5 w-3.5 text-green-300" />
              <span>{liveCount > 0 ? `${liveCount} Live` : "Live APX"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-blue-300" />
              <span>Auto-Graded</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <Users className="h-3.5 w-3.5 text-pink-300" />
              <span>No Login Required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Controls */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-2.5">

            {/* Platform Search */}
            <div ref={platformDropdownRef} className="relative">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500 z-10" />
              <Input
                placeholder="Search platform... (e.g. parmaracademy, ssccglpinnacle, oliveboard)"
                value={platformQuery}
                onChange={e => { setPlatformQuery(e.target.value); if (!e.target.value) clearPlatform() }}
                className="pl-9 pr-9 h-10 text-sm border-violet-200/60 focus:border-violet-400 bg-violet-50/40"
              />
              {platformLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              {(selectedPlatform && !platformLoading) && (
                <button onClick={clearPlatform} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}

              {showPlatformDropdown && platformResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto">
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

            {/* Test search (only in bulk mode) */}
            {!selectedPlatform && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search mock tests..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-9 h-9 text-sm bg-muted/20 border-border/40"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Category pills */}
            {!selectedPlatform && (
              <div className="relative">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon
                    const active = selectedCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all shrink-0 ${
                          active ? "text-white border-transparent" : "bg-background border-border/50 hover:border-border"
                        }`}
                        style={active ? { backgroundColor: cat.color } : {}}
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

            {/* Sort + View toggle (bulk mode only) */}
            {!selectedPlatform && (
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="h-8 w-[140px] text-xs gap-1 border-border/50">
                      <SortAsc className="h-3 w-3 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="duration">Short Duration First</SelectItem>
                      <SelectItem value="questions">Most Questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex rounded-lg border border-border/50 overflow-hidden">
                  <button onClick={() => setViewMode("grid")} className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} title="Grid view">
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setViewMode("list")} className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} title="List view">
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">

        {/* Platform mode */}
        {selectedPlatform && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                <Database className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-700">{selectedPlatform.name}</span>
                <a href={selectedPlatform.web} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-600">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <button onClick={clearPlatform} className="text-xs text-muted-foreground hover:text-foreground underline">
                Show all
              </button>
            </div>

            {platformLoading2 ? (
              <div className="flex items-center gap-3 py-10">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <span className="text-sm text-muted-foreground">Fetching mock tests from {selectedPlatform.name}...</span>
              </div>
            ) : platformTests.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  <span className="font-semibold text-foreground">{platformTests.length}</span> mock tests found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {platformTests.map((t, i) => renderMockCard(t, i))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="font-medium text-sm mb-1">No mock tests found for {selectedPlatform.name}</p>
                <p className="text-xs text-muted-foreground mb-4">This platform may not expose public test data</p>
                <Button variant="outline" size="sm" onClick={clearPlatform}>Search another platform</Button>
              </div>
            )}
          </div>
        )}

        {/* Bulk mode */}
        {!selectedPlatform && (
          <>
            {/* Popular Platforms (shown when not loading and no search) */}
            {!loading && !search && (
              <div className="mb-6 space-y-3">
                {/* Recent platforms */}
                {recentPlatforms.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <History className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-semibold">Recently Visited</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentPlatforms.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => handlePlatformSelect(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-violet-300/60 bg-violet-50/60 hover:bg-violet-100/80 text-violet-700 transition-colors"
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
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold">Popular Platforms</span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Quick Access</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_PLATFORMS.map((p, i) => {
                      const color = getCategoryColor(p.category)
                      return (
                        <button
                          key={i}
                          onClick={() => handlePlatformSelect(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm"
                          style={{ borderColor: `${color}40`, color, backgroundColor: `${color}10` }}
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

            {loading && (
              <div>
                <div className="flex items-center gap-2 mb-5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
                  Fetching live mock tests from APX platforms...
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
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
                  ))}
                </div>
              </div>
            )}

            {!loading && fetchError && mockTests.length === 0 && (
              <div className="text-center py-16">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">Could not load mock tests</p>
                <p className="text-sm text-muted-foreground mb-4">{fetchError}</p>
                <Button onClick={() => fetchMockTests(selectedCategory)} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {!loading && filteredTests.length > 0 && (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{filteredTests.length}</span> mock tests available
                  </span>
                  {liveCount > 0 && (
                    <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <Zap className="h-3 w-3 mr-1" />
                      {liveCount} from live platforms
                    </Badge>
                  )}
                  {search && (
                    <Badge variant="outline" className="text-xs">
                      Filtered by: {search}
                      <button onClick={() => setSearch("")} className="ml-1"><X className="h-3 w-3" /></button>
                    </Badge>
                  )}
                </div>

                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTests.map((t, i) => renderMockCard(t, i))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTests.map((t, i) => renderMockListItem(t, i))}
                  </div>
                )}
              </>
            )}

            {!loading && search && filteredTests.length === 0 && mockTests.length > 0 && (
              <div className="text-center py-16">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground mb-2">No results for "<strong>{search}</strong>"</p>
                <Button variant="link" size="sm" onClick={() => setSearch("")}>Clear search</Button>
              </div>
            )}
          </>
        )}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  )
}
