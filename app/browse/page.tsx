"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ContentStructureNav, type ContentStructureFilter } from "@/components/content-structure-nav"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger
} from "@/components/ui/drawer"
import {
  Search, X, FileText, BookOpen, Clock, Play, Flame,
  Lock, Sparkles, Brain, GraduationCap, LayoutGrid,
  ChevronRight, SlidersHorizontal
} from "lucide-react"
import { toast } from "sonner"

interface PDF {
  id: string
  title: string
  description: string | null
  file_path: string
  file_size: number | null
  view_count: number
  allow_download: boolean
  created_at: string
  structure_location: { folderId: string; categoryId: string; sectionId: string } | null
  category: { id: string; name: string; color?: string } | null
}

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  time_limit: number
  questions: { id: string }[]
  enabled: boolean
  created_at: string
  structure_location: { folderId: string; categoryId: string; sectionId: string } | null
}

const CATEGORY_COLORS: Record<string, string> = {
  Mathematics: "#3b82f6",
  Physics: "#a855f7",
  Chemistry: "#22c55e",
  Biology: "#10b981",
  English: "#f59e0b",
  General: "#6b7280",
  NDA: "#ef4444",
  SSC: "#f97316",
}

const DIFF_COLORS: Record<string, string> = {
  easy: "#22c55e",
  medium: "#f59e0b",
  hard: "#ef4444",
}

const REFRESH_MS = 2 * 60 * 1000

type Tab = "all" | "pdfs" | "quizzes"

export default function BrowsePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("all")
  const [filter, setFilter] = useState<ContentStructureFilter>({
    folderId: null, categoryId: null, sectionId: null
  })
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  // Build category name → content structure categoryId mapping for PDFs
  const [catNameMap, setCatNameMap] = useState<Record<string, string>>({})
  const [catToFolder, setCatToFolder] = useState<Record<string, string>>({})

  const fetchAll = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const [pdfRes, quizRes, structRes] = await Promise.all([
        fetch("/api/pdfs"),
        fetch("/api/quizzes"),
        fetch("/api/content-structure", { cache: "no-store" }),
      ])
      const [pdfData, quizData, structData] = await Promise.all([
        pdfRes.json(),
        quizRes.json(),
        structRes.json(),
      ])
      setPdfs(pdfData.pdfs || [])
      setQuizzes((quizData.quizzes || []).filter((q: Quiz) => q.enabled && q.questions.length > 0))

      // Build name maps from structure
      const nm: Record<string, string> = {}
      const fm: Record<string, string> = {}
      for (const folder of (structData.folders || [])) {
        for (const cat of (folder.categories || [])) {
          nm[cat.name.toLowerCase()] = cat.id
          fm[cat.id] = folder.id
        }
      }
      setCatNameMap(nm)
      setCatToFolder(fm)
    } catch {}
    if (initial) setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll(true)
    const iv = setInterval(() => fetchAll(false), REFRESH_MS)
    return () => clearInterval(iv)
  }, [fetchAll])

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredPdfs = useMemo(() => {
    let result = pdfs
    const f = filter
    if (f.folderId === "uncategorized") {
      result = result.filter(p => {
        if (p.structure_location?.folderId) return false
        const catName = p.category?.name?.toLowerCase()
        return !catName || !catNameMap[catName]
      })
    } else if (f.sectionId) {
      result = result.filter(p => p.structure_location?.sectionId === f.sectionId)
    } else if (f.categoryId) {
      result = result.filter(p => {
        if (p.structure_location?.categoryId === f.categoryId) return true
        const catName = p.category?.name?.toLowerCase()
        return catName && catNameMap[catName] === f.categoryId
      })
    } else if (f.folderId) {
      result = result.filter(p => {
        if (p.structure_location?.folderId === f.folderId) return true
        const catName = p.category?.name?.toLowerCase()
        const matchedCatId = catName && catNameMap[catName]
        return matchedCatId && catToFolder[matchedCatId] === f.folderId
      })
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q)
      )
    }
    return result
  }, [pdfs, filter, search, catNameMap, catToFolder])

  const filteredQuizzes = useMemo(() => {
    let result = quizzes
    const f = filter
    if (f.folderId === "uncategorized") {
      result = result.filter(q => !q.structure_location?.folderId)
    } else if (f.sectionId) {
      result = result.filter(q => q.structure_location?.sectionId === f.sectionId)
    } else if (f.categoryId) {
      result = result.filter(q => q.structure_location?.categoryId === f.categoryId)
    } else if (f.folderId) {
      result = result.filter(q => q.structure_location?.folderId === f.folderId)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(qz =>
        qz.title.toLowerCase().includes(q) ||
        qz.description?.toLowerCase().includes(q) ||
        qz.category.toLowerCase().includes(q)
      )
    }
    return result
  }, [quizzes, filter, search])

  const showPdfs = activeTab !== "quizzes"
  const showQuizzes = activeTab !== "pdfs"

  function handleDownload(e: React.MouseEvent, pdf: PDF) {
    if (!pdf.allow_download) {
      e.preventDefault()
      toast.info("Download not available for this PDF")
      return
    }
    if (!user) {
      e.preventDefault()
      toast.info("Login to download this PDF")
      router.push("/login")
    }
  }

  function handleStartQuiz(e: React.MouseEvent, quizId: string) {
    if (!user) {
      e.preventDefault()
      router.push(`/login?redirect=/quiz/${quizId}`)
    }
  }

  const hasFilter = !!filter.folderId

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background border-b border-border/50">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
          backgroundSize: "32px 32px"
        }} />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative container mx-auto px-4 py-10 sm:py-12">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
              <LayoutGrid className="h-3.5 w-3.5" />
              Content Library
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 text-foreground">
              Browse by <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Subject</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              Navigate PDFs and quizzes organized by subject, chapter, and topic — just like Testbook.
            </p>

            {!loading && (
              <div className="flex items-center gap-5 mt-5 flex-wrap justify-center text-sm">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <strong className="text-foreground">{pdfs.length}</strong>
                  <span className="text-muted-foreground">PDFs</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Brain className="h-4 w-4 text-accent" />
                  <strong className="text-foreground">{quizzes.length}</strong>
                  <span className="text-muted-foreground">Quizzes</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <div className="flex gap-6 items-start">

          {/* Sidebar — hidden on mobile, visible on lg+ */}
          <div className="hidden lg:block w-60 xl:w-64 shrink-0 sticky top-20">
            <ContentStructureNav
              filter={filter}
              onFilterChange={(f) => { setFilter(f); setSearch("") }}
              showType={activeTab === "pdfs" ? "pdfs" : activeTab === "quizzes" ? "quizzes" : "all"}
              autoRefreshMs={REFRESH_MS}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tabs + Search bar */}
            <div className="flex flex-col gap-3 mb-5">
              <div className="flex items-center gap-2">
                {/* Tab pills */}
                <div className="flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/50 h-fit">
                  {(["all", "pdfs", "quizzes"] as Tab[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                        activeTab === tab
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab === "all" ? "All" : tab === "pdfs" ? "PDFs" : "Quizzes"}
                    </button>
                  ))}
                </div>

                {/* Mobile filter button - visible on screens < lg */}
                <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
                  <DrawerTrigger asChild>
                    <button className="lg:hidden relative h-10 px-3 rounded-xl border border-border/60 bg-background flex items-center gap-1.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors shrink-0 ml-auto">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Filters</span>
                      {hasFilter && (
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                          !
                        </span>
                      )}
                    </button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[85dvh]">
                    <DrawerHeader className="pb-2">
                      <DrawerTitle className="text-base">Browse by Subject</DrawerTitle>
                    </DrawerHeader>
                    <div className="px-4 pb-6 overflow-y-auto">
                      <ContentStructureNav
                        filter={filter}
                        onFilterChange={(f) => { setFilter(f); setSearch(""); setFilterDrawerOpen(false) }}
                        showType={activeTab === "pdfs" ? "pdfs" : activeTab === "quizzes" ? "quizzes" : "all"}
                        autoRefreshMs={REFRESH_MS}
                      />
                      {hasFilter && (
                        <button
                          onClick={() => { setFilter({ folderId: null, categoryId: null, sectionId: null }); setFilterDrawerOpen(false) }}
                          className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl border border-rose-500/30 text-rose-500 text-sm font-semibold hover:bg-rose-500/5 transition-colors"
                        >
                          <X className="h-4 w-4" /> Clear Filter
                        </button>
                      )}
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-9 h-11 text-sm bg-background border-border/60"
                  autoComplete="off"
                  suppressHydrationWarning
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-xl sm:rounded-2xl border border-border/50 bg-muted/30 p-4 sm:p-5 animate-pulse h-36 sm:h-40" />
                ))}
              </div>
            ) : (
              <>
                {/* Results summary */}
                <p className="text-xs text-muted-foreground mb-4">
                  {showPdfs && showQuizzes
                    ? <>{filteredPdfs.length} PDF{filteredPdfs.length !== 1 ? "s" : ""} &amp; {filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? "zes" : ""}</>
                    : showPdfs
                    ? <>{filteredPdfs.length} PDF{filteredPdfs.length !== 1 ? "s" : ""}</>
                    : <>{filteredQuizzes.length} quiz{filteredQuizzes.length !== 1 ? "zes" : ""}</>
                  }
                  {hasFilter && <span className="text-primary font-medium"> (filtered)</span>}
                  {search && <> matching &ldquo;<span className="font-semibold text-foreground">{search}</span>&rdquo;</>}
                </p>

                {/* PDFs section */}
                {showPdfs && filteredPdfs.length > 0 && (
                  <div className="mb-8">
                    {(showPdfs && showQuizzes) && (
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <h2 className="font-bold text-sm text-foreground">Study Materials</h2>
                        <Badge variant="secondary" className="text-[10px]">{filteredPdfs.length}</Badge>
                      </div>
                    )}
                    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                      {filteredPdfs.map(pdf => {
                        const color = pdf.category?.color || CATEGORY_COLORS[pdf.category?.name || ""] || "#6366f1"
                        const isNew = (Date.now() - new Date(pdf.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                        return (
                          <div key={pdf.id} className="group rounded-2xl border border-border/50 bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden">
                            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                            <div className="p-4 flex-1 flex flex-col">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  {isNew && (
                                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 rounded-full px-2 py-0.5 mb-1">
                                      <Sparkles className="h-2.5 w-2.5" /> NEW
                                    </div>
                                  )}
                                  <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                    {pdf.title}
                                  </h3>
                                </div>
                                {pdf.category?.name && (
                                  <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: color }}>
                                    {pdf.category.name}
                                  </span>
                                )}
                              </div>
                              {pdf.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                  {pdf.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-auto mb-3">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 text-[11px] font-medium">
                                  <BookOpen className="h-3 w-3 text-primary" /> PDF
                                </div>
                                {pdf.file_size && (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 text-[11px] font-medium text-muted-foreground">
                                    {(pdf.file_size / (1024 * 1024)).toFixed(1)} MB
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Link
                                  href={`/pdf/${pdf.id}`}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all"
                                  style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                                >
                                  <BookOpen className="h-3.5 w-3.5" /> View
                                </Link>
                                {pdf.allow_download && (
                                  <button
                                    onClick={(e) => handleDownload(e, pdf)}
                                    className="px-3 py-2 rounded-xl text-xs font-semibold border border-border/60 hover:bg-muted/50 transition-all"
                                    title={user ? "Download" : "Login to Download"}
                                  >
                                    {user ? "↓" : <Lock className="h-3 w-3" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quizzes section */}
                {showQuizzes && filteredQuizzes.length > 0 && (
                  <div>
                    {(showPdfs && showQuizzes) && (
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-4 w-4 text-accent" />
                        <h2 className="font-bold text-sm text-foreground">Practice Quizzes</h2>
                        <Badge variant="secondary" className="text-[10px]">{filteredQuizzes.length}</Badge>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredQuizzes.map(quiz => {
                        const color = CATEGORY_COLORS[quiz.category] || "#6366f1"
                        const diffColor = DIFF_COLORS[quiz.difficulty] || "#6366f1"
                        return (
                          <div key={quiz.id} className="group rounded-2xl border border-border/50 bg-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden">
                            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
                            <div className="p-4 flex-1 flex flex-col">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors flex-1">{quiz.title}</h3>
                                <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: color }}>
                                  {quiz.category}
                                </span>
                              </div>
                              {quiz.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{quiz.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-auto mb-3 flex-wrap">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 text-[11px] font-medium">
                                  <FileText className="h-3 w-3 text-primary" /> {quiz.questions.length} Q
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 text-[11px] font-medium">
                                  <Clock className="h-3 w-3 text-accent" /> {Math.floor(quiz.time_limit / 60)} min
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 text-[11px] font-medium capitalize" style={{ color: diffColor }}>
                                  <Flame className="h-3 w-3" /> {quiz.difficulty}
                                </div>
                              </div>
                              <Link
                                href={`/quiz/${quiz.id}`}
                                onClick={(e) => handleStartQuiz(e, quiz.id)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm"
                                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                              >
                                {user ? <Play className="h-3.5 w-3.5 fill-white" /> : <Lock className="h-3.5 w-3.5" />}
                                {user ? "Start Quiz" : "Login to Start"}
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {filteredPdfs.length === 0 && filteredQuizzes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <GraduationCap className="h-16 w-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-bold mb-2">No content found</h3>
                    <p className="text-sm text-muted-foreground mb-5">Try changing the filter or searching something else</p>
                    <Button variant="outline" size="sm" onClick={() => { setFilter({ folderId: null, categoryId: null, sectionId: null }); setSearch("") }}>
                      Show All Content
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
