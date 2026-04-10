"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, Loader2, BookOpen, Play, Clock, FileText,
  ChevronDown, ChevronUp, AlertCircle, Lock, Search, X,
  CheckCircle2, Trophy, Zap, LayoutGrid, List,
  SortAsc, Filter, Star, RefreshCw, TrendingUp
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { AuthModal } from "@/components/auth-modal"

const ATTEMPT_KEY = "techvyro_test_attempts"

interface AttemptRecord {
  count: number
  lastAt: string
  score?: number
}

function getAttempts(): Record<string, AttemptRecord> {
  try { return JSON.parse(localStorage.getItem(ATTEMPT_KEY) || "{}") } catch { return {} }
}

function recordAttempt(testId: string) {
  try {
    const all = getAttempts()
    const prev = all[testId] || { count: 0, lastAt: "" }
    all[testId] = { ...prev, count: prev.count + 1, lastAt: new Date().toISOString() }
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(all))
  } catch {}
}

interface Subject {
  id?: string | number
  name?: string
  title?: string
  tests?: Test[]
}

interface Test {
  id?: string | number
  title?: string
  name?: string
  duration?: number
  time?: number
  total_marks?: number
  total_questions?: number
  is_free?: boolean
  slug?: string
}

function cleanTitle(title: string): string {
  const patterns = [
    /\s*by\s+\w+\s*(academy|classes|institute|coaching)?/gi,
    /\s*-\s*\w+\s*(academy|classes|institute)?$/gi,
    /^\w+\s*(academy|classes|institute)?\s*-\s*/gi,
    /\(\w+\s*(app|academy|classes)?\)/gi,
  ]
  let cleaned = title
  for (const pattern of patterns) cleaned = cleaned.replace(pattern, "")
  return cleaned.trim() || title
}

function formatDuration(min?: number) {
  if (!min) return null
  if (min >= 60) return `${Math.floor(min / 60)}h ${min % 60 > 0 ? `${min % 60}m` : ""}`.trim()
  return `${min} min`
}

function SeriesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const slug = searchParams.get("slug") || ""
  const apiBase = searchParams.get("apiBase") || ""
  const webBase = searchParams.get("webBase") || ""
  const rawTitle = searchParams.get("title") || "Mock Test"
  const seriesTitle = cleanTitle(rawTitle)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"default" | "duration_asc" | "duration_desc" | "questions">("default")
  const [filterFree, setFilterFree] = useState<"all" | "free" | "paid">("all")
  const [attempts, setAttempts] = useState<Record<string, AttemptRecord>>({})
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [expandAll, setExpandAll] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const { user } = useAuth()
  const isSample = apiBase.startsWith("sample:")

  useEffect(() => {
    if (!slug || !apiBase) { router.push("/test-series"); return }
    setAttempts(getAttempts())
    fetchData()
  }, [slug, apiBase, webBase])

  const fetchData = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ slug, apiBase, webBase })
      const res = await fetch(`/api/extract/tests?${params}`)
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error || "Could not load test series"); return }
      const subs = data.subjects || []
      setSubjects(subs)
      setTests(data.tests || [])
      if (subs.length > 0) setExpanded({ [String(subs[0].id || 0)]: true })
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const toggleExpandAll = () => {
    if (expandAll) {
      setExpanded({})
    } else {
      const all: Record<string, boolean> = {}
      subjects.forEach((s, i) => { all[String(s.id || i)] = true })
      setExpanded(all)
    }
    setExpandAll(!expandAll)
  }

  const startTest = (test: Test) => {
    if (!user && !isSample && !test.is_free) { setShowAuthModal(true); return }
    const testId = String(test.id || test.slug || "")
    recordAttempt(testId)
    setAttempts(getAttempts())
    const params = new URLSearchParams({
      testId,
      apiBase,
      title: test.title || test.name || "Test",
      platform: seriesTitle,
      duration: String(test.duration || test.time || 60),
    })
    router.push(`/test-series/play?${params}`)
  }

  const allRawTests = useMemo(() => [
    ...tests,
    ...subjects.flatMap(s => s.tests || []),
  ], [tests, subjects])

  const filteredSorted = useMemo(() => {
    let list = [...allRawTests]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(t => (t.title || t.name || "").toLowerCase().includes(q))
    }
    if (filterFree === "free") list = list.filter(t => t.is_free || isSample)
    if (filterFree === "paid") list = list.filter(t => !t.is_free && !isSample)
    if (sortBy === "duration_asc") list.sort((a, b) => (a.duration || a.time || 999) - (b.duration || b.time || 999))
    if (sortBy === "duration_desc") list.sort((a, b) => (b.duration || b.time || 0) - (a.duration || a.time || 0))
    if (sortBy === "questions") list.sort((a, b) => (b.total_questions || 0) - (a.total_questions || 0))
    return list
  }, [allRawTests, searchQuery, filterFree, sortBy, isSample])

  const freeCount = allRawTests.filter(t => t.is_free || isSample).length
  const attemptedCount = allRawTests.filter(t => {
    const id = String(t.id || t.slug || "")
    return id && attempts[id]?.count > 0
  }).length
  const totalQs = allRawTests.reduce((s, t) => s + (t.total_questions || 0), 0)
  const completionPct = allRawTests.length > 0 ? Math.round((attemptedCount / allRawTests.length) * 100) : 0

  const isSearchActive = !!(searchQuery || filterFree !== "all" || sortBy !== "default")

  const filterSubjectTests = (subTests: Test[]) => {
    let list = [...subTests]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(t => (t.title || t.name || "").toLowerCase().includes(q))
    }
    if (filterFree === "free") list = list.filter(t => t.is_free || isSample)
    if (filterFree === "paid") list = list.filter(t => !t.is_free && !isSample)
    if (sortBy === "duration_asc") list.sort((a, b) => (a.duration || a.time || 999) - (b.duration || b.time || 999))
    if (sortBy === "duration_desc") list.sort((a, b) => (b.duration || b.time || 0) - (a.duration || a.time || 0))
    if (sortBy === "questions") list.sort((a, b) => (b.total_questions || 0) - (a.total_questions || 0))
    return list
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      <Header />
      <main className="flex-1 w-full">

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground">
          <div className="max-w-5xl mx-auto px-4 pt-6 pb-5">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Tests
            </button>

            <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight">{seriesTitle}</h1>
                <p className="text-primary-foreground/70 text-sm mt-1">
                  {loading ? "Loading test series..." : `${allRawTests.length} tests available`}
                </p>
              </div>
              {!loading && !error && allRawTests.length > 0 && (
                <Button
                  size="sm"
                  className="bg-white text-primary hover:bg-white/90 font-semibold gap-2 shrink-0"
                  onClick={() => { const t = allRawTests.find(t => t.is_free || isSample) || allRawTests[0]; if (t) startTest(t) }}
                >
                  <Play className="h-4 w-4 fill-current" /> Start First Test
                </Button>
              )}
            </div>

            {!loading && !error && allRawTests.length > 0 && (
              <>
                {/* Stats bar */}
                <div className="flex flex-wrap gap-3 mt-4 text-xs">
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-blue-300" />
                    <span>{allRawTests.length} Tests</span>
                  </div>
                  {subjects.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-green-300" />
                      <span>{subjects.length} Subjects</span>
                    </div>
                  )}
                  {totalQs > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
                      <Zap className="h-3.5 w-3.5 text-yellow-300" />
                      <span>{totalQs.toLocaleString()} Questions</span>
                    </div>
                  )}
                  {freeCount > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
                      <Trophy className="h-3.5 w-3.5 text-yellow-300" />
                      <span>{freeCount} Free</span>
                    </div>
                  )}
                  {attemptedCount > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      <span>{attemptedCount} Attempted</span>
                    </div>
                  )}
                </div>

                {/* Progress bar (if attempts exist) */}
                {attemptedCount > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-primary-foreground/70">
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Your Progress</span>
                      <span>{attemptedCount}/{allRawTests.length} tests attempted ({completionPct}%)</span>
                    </div>
                    <Progress value={completionPct} className="h-1.5 bg-primary-foreground/20" />
                  </div>
                )}

                {/* Login prompt for non-sample */}
                {!isSample && !user && (
                  <div className="mt-3 flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-lg px-3 py-2 text-xs">
                    <Lock className="h-3.5 w-3.5 text-primary-foreground/70 shrink-0" />
                    <span className="text-primary-foreground/90">
                      <Link href="/login" className="font-semibold underline">Login</Link> to save your progress and access all tests
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        {!loading && !error && allRawTests.length > 0 && (
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tests in this series..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-9 text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select value={filterFree} onValueChange={(v) => setFilterFree(v as typeof filterFree)}>
                    <SelectTrigger className="h-9 w-[110px] text-xs gap-1">
                      <Filter className="h-3.5 w-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tests</SelectItem>
                      <SelectItem value="free">Free Only</SelectItem>
                      <SelectItem value="paid">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger className="h-9 w-[130px] text-xs gap-1">
                      <SortAsc className="h-3.5 w-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default Order</SelectItem>
                      <SelectItem value="duration_asc">Shortest First</SelectItem>
                      <SelectItem value="duration_desc">Longest First</SelectItem>
                      <SelectItem value="questions">Most Questions</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 py-6">

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Fetching test series...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col sm:flex-row items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-5 mb-6">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium mb-1">Could not load series</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" /> Retry
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push("/test-series")}>
                    Browse All Tests
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Search results mode — flat list of all matching tests */}
              {isSearchActive ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{filteredSorted.length}</span> tests matching filters
                    </p>
                    <button
                      onClick={() => { setSearchQuery(""); setFilterFree("all"); setSortBy("default") }}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Clear filters
                    </button>
                  </div>

                  {filteredSorted.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                      <Search className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-medium">No tests match your filters</p>
                      <p className="text-sm text-muted-foreground mt-1">Try adjusting the search or filter options</p>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredSorted.map((test, idx) => (
                        <TestCard key={String(test.id || idx)} test={test} isSample={isSample} attempt={attempts[String(test.id || test.slug || "")]} onStart={() => startTest(test)} />
                      ))}
                    </div>
                  ) : (
                    <Card className="divide-y overflow-hidden">
                      {filteredSorted.map((test, idx) => (
                        <TestRow key={String(test.id || idx)} test={test} isSample={isSample} attempt={attempts[String(test.id || test.slug || "")]} onStart={() => startTest(test)} />
                      ))}
                    </Card>
                  )}
                </div>
              ) : (
                <>
                  {/* Subjects accordion */}
                  {subjects.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          Subjects ({subjects.length})
                        </h2>
                        <button
                          onClick={toggleExpandAll}
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          {expandAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {expandAll ? "Collapse all" : "Expand all"}
                        </button>
                      </div>

                      {subjects.map((subj, idx) => {
                        const subjId = String(subj.id || idx)
                        const rawSubjTests = subj.tests || []
                        const subjTests = filterSubjectTests(rawSubjTests)
                        const name = cleanTitle(subj.name || subj.title || `Subject ${idx + 1}`)
                        const attemptedInSubj = rawSubjTests.filter(t => {
                          const id = String(t.id || t.slug || "")
                          return id && attempts[id]?.count > 0
                        }).length
                        const freeInSubj = rawSubjTests.filter(t => t.is_free || isSample).length

                        return (
                          <Card key={subjId} className="overflow-hidden">
                            <button
                              className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors text-left"
                              onClick={() => setExpanded(prev => ({ ...prev, [subjId]: !prev[subjId] }))}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                  <BookOpen className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-medium text-sm">{name}</span>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="text-xs text-muted-foreground">{rawSubjTests.length} tests</span>
                                    {freeInSubj > 0 && (
                                      <Badge className="text-[10px] h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">{freeInSubj} free</Badge>
                                    )}
                                    {attemptedInSubj > 0 && (
                                      <Badge className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20">
                                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                        {attemptedInSubj}/{rawSubjTests.length}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {attemptedInSubj > 0 && (
                                  <div className="hidden sm:block w-16">
                                    <Progress value={(attemptedInSubj / rawSubjTests.length) * 100} className="h-1.5" />
                                  </div>
                                )}
                                {expanded[subjId] ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                              </div>
                            </button>

                            {expanded[subjId] && (
                              <div className="border-t">
                                {subjTests.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-6">No tests match filters in this subject</p>
                                ) : viewMode === "grid" ? (
                                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {subjTests.map((test, tidx) => (
                                      <TestCard key={String(test.id || tidx)} test={test} isSample={isSample} attempt={attempts[String(test.id || test.slug || "")]} onStart={() => startTest(test)} />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="divide-y">
                                    {subjTests.map((test, tidx) => (
                                      <TestRow key={String(test.id || tidx)} test={test} isSample={isSample} attempt={attempts[String(test.id || test.slug || "")]} onStart={() => startTest(test)} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  )}

                  {/* Flat tests */}
                  {tests.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="text-base font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        All Tests ({tests.length})
                      </h2>
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filterSubjectTests(tests).map((test, idx) => (
                            <TestCard key={String(test.id || idx)} test={test} isSample={isSample} attempt={attempts[String(test.id || test.slug || "")]} onStart={() => startTest(test)} />
                          ))}
                        </div>
                      ) : (
                        <Card className="divide-y overflow-hidden">
                          {filterSubjectTests(tests).map((test, idx) => (
                            <TestRow key={String(test.id || idx)} test={test} isSample={isSample} attempt={attempts[String(test.id || test.slug || "")]} onStart={() => startTest(test)} />
                          ))}
                        </Card>
                      )}
                    </div>
                  )}

                  {allRawTests.length === 0 && (
                    <div className="text-center py-16 border border-dashed border-border rounded-2xl">
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-lg font-medium">No tests found</p>
                      <p className="text-muted-foreground text-sm mt-1 mb-4">This series is currently unavailable. Try another series.</p>
                      <Button variant="outline" onClick={() => router.push("/test-series")}>
                        Browse All Tests
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

// ── TestRow: compact list item ──
function TestRow({ test, isSample, attempt, onStart }: {
  test: Test; isSample: boolean; attempt?: AttemptRecord; onStart: () => void
}) {
  const title = cleanTitle(test.title || test.name || "Untitled Test")
  const duration = test.duration || test.time
  const isFree = test.is_free || isSample
  const attempted = (attempt?.count || 0) > 0

  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-3 hover:bg-muted/30 transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {attempted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
          <p className="font-medium text-sm truncate">{title}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {formatDuration(duration)}
            </span>
          )}
          {test.total_questions && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" /> {test.total_questions} Qs
            </span>
          )}
          {test.total_marks && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" /> {test.total_marks} marks
            </span>
          )}
          {isFree && <Badge className="text-[10px] h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">Free</Badge>}
          {attempted && (
            <span className="text-[10px] text-emerald-600 font-medium">
              Attempted {attempt!.count}×
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        onClick={onStart}
        className={`gap-1.5 shrink-0 h-9 px-4 text-xs font-semibold transition-all ${
          attempted
            ? "bg-emerald-600 hover:bg-emerald-700"
            : "bg-gradient-to-r from-primary to-accent hover:opacity-90"
        }`}
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        {attempted ? "Retry" : "Start"}
      </Button>
    </div>
  )
}

// ── TestCard: grid card view ──
function TestCard({ test, isSample, attempt, onStart }: {
  test: Test; isSample: boolean; attempt?: AttemptRecord; onStart: () => void
}) {
  const title = cleanTitle(test.title || test.name || "Untitled Test")
  const duration = test.duration || test.time
  const isFree = test.is_free || isSample
  const attempted = (attempt?.count || 0) > 0

  return (
    <div className={`relative rounded-xl border p-4 flex flex-col gap-3 hover:shadow-md transition-all ${
      attempted ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 hover:border-primary/40 bg-card"
    }`}>
      {attempted && (
        <div className="absolute top-3 right-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </div>
      )}
      <div>
        <p className="font-semibold text-sm pr-6 line-clamp-2 leading-snug">{title}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {isFree && <Badge className="text-[10px] h-4 px-1.5 bg-green-500/10 text-green-600 border-green-500/20">Free</Badge>}
          {attempted && (
            <Badge className="text-[10px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Tried {attempt!.count}×
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(duration)}</span>}
        {test.total_questions && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {test.total_questions} Qs</span>}
        {test.total_marks && <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {test.total_marks} marks</span>}
      </div>
      <Button
        size="sm"
        onClick={onStart}
        className={`w-full h-9 gap-1.5 text-xs font-semibold ${
          attempted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gradient-to-r from-primary to-accent hover:opacity-90"
        }`}
      >
        <Play className="h-3.5 w-3.5 fill-current" />
        {attempted ? "Retry Test" : "Start Test"}
      </Button>
    </div>
  )
}

export default function SeriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SeriesContent />
    </Suspense>
  )
}
