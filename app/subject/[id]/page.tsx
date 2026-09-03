"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import {
  ChevronRight, FileText, Trophy, BookOpen, Search,
  Play, Clock, Layers, LayoutGrid, Lock, Sparkles, X,
  Brain, GraduationCap, Flame, Star, ArrowRight,
  AlignLeft, ListChecks, ChevronDown, ChevronUp,
  Home, Folder as FolderIcon
} from "lucide-react"
import { toast } from "sonner"

interface SectionNode {
  id: string; name: string; order: number; enabled: boolean
  pdfCount: number; quizCount: number
}
interface CategoryNode {
  id: string; name: string; color: string; icon: string
  sections: SectionNode[]; order: number; enabled: boolean
  pdfCount: number; quizCount: number
}
interface FolderNode {
  id: string; name: string; description: string; icon: string; color: string
  categories: CategoryNode[]; order: number; enabled: boolean
  pdfCount: number; quizCount: number
}
interface PDF {
  id: string; title: string; description: string | null
  file_size: number | null; view_count: number; allow_download: boolean
  created_at: string
  structure_location: { folderId: string; categoryId: string; sectionId: string } | null
  category: { id: string; name: string; color?: string } | null
}
interface Quiz {
  id: string; title: string; description: string; category: string
  difficulty: string; time_limit: number; questions: { id: string }[]
  enabled: boolean; created_at: string; url_slug?: string
  structure_location: { folderId: string; categoryId: string; sectionId: string } | null
}

type Tab = "all" | "pdfs" | "quizzes"

const DIFF_COLORS: Record<string, string> = {
  easy: "#22c55e", medium: "#f59e0b", hard: "#ef4444",
}

function StructureIcon({ name, className = "h-6 w-6" }: { name?: string; className?: string }) {
  const Icon = name === "Folder" ? FolderIcon
    : name === "GraduationCap" ? GraduationCap
      : name === "FileText" ? FileText
        : name === "Layers" ? Layers
          : BookOpen
  return <Icon className={className} aria-hidden="true" />
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? "1 month ago" : `${months} months ago`
}

export default function SubjectPage() {
  const { id: folderId } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [folder, setFolder] = useState<FolderNode | null>(null)
  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [tab, setTab] = useState<Tab>("all")
  const [search, setSearch] = useState("")
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/subject/${folderId}`)
        if (res.status === 404) { setNotFound(true); return }
        const data = await res.json()
        setFolder(data.folder)
        setPdfs(data.pdfs || [])
        setQuizzes(data.quizzes || [])
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [folderId])

  const filteredPdfs = useMemo(() => {
    let result = pdfs
    if (activeSectionId) result = result.filter(p => p.structure_location?.sectionId === activeSectionId)
    else if (activeCategoryId) result = result.filter(p => p.structure_location?.categoryId === activeCategoryId)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    return result
  }, [pdfs, activeCategoryId, activeSectionId, search])

  const filteredQuizzes = useMemo(() => {
    let result = quizzes
    if (activeSectionId) result = result.filter(q => q.structure_location?.sectionId === activeSectionId)
    else if (activeCategoryId) result = result.filter(q => q.structure_location?.categoryId === activeCategoryId)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(qz => qz.title.toLowerCase().includes(q) || qz.description?.toLowerCase().includes(q))
    }
    return result
  }, [quizzes, activeCategoryId, activeSectionId, search])

  const showPdfs = tab !== "quizzes"
  const showQuizzes = tab !== "pdfs"

  function toggleCat(catId: string) {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(catId) ? next.delete(catId) : next.add(catId)
      return next
    })
  }

  function selectCategory(catId: string) {
    if (activeCategoryId === catId && !activeSectionId) {
      setActiveCategoryId(null)
    } else {
      setActiveCategoryId(catId)
      setActiveSectionId(null)
    }
  }

  function selectSection(catId: string, secId: string) {
    setActiveCategoryId(catId)
    setActiveSectionId(activeSectionId === secId ? null : secId)
  }

  function clearFilter() {
    setActiveCategoryId(null)
    setActiveSectionId(null)
  }

  const activeCategory = folder?.categories.find(c => c.id === activeCategoryId)
  const activeSection = activeCategory?.sections.find(s => s.id === activeSectionId)

  const totalSections = folder?.categories.reduce((a, c) => a + c.sections.length, 0) ?? 0

  if (loading) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading subject...</p>
        </div>
      </div>
      <Footer />
    </div>
  )

  if (notFound || !folder) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold mb-2">Subject not found</h1>
          <p className="text-muted-foreground mb-6">This subject may have been removed or the link is incorrect.</p>
          <Button asChild><Link href="/browse">Browse All Content</Link></Button>
        </div>
      </div>
      <Footer />
    </div>
  )

  const folderColor = folder.color || "#6366f1"

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-border/50"
        style={{ background: `linear-gradient(135deg, ${folderColor}18 0%, ${folderColor}08 50%, transparent 100%)` }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
          backgroundSize: "32px 32px"
        }} />
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: folderColor }} />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: folderColor }} />

        <div className="relative container mx-auto px-4 py-10 sm:py-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 flex-wrap">
            <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Home className="h-3 w-3" /> Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/browse" className="hover:text-foreground transition-colors">Browse</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{folder.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Icon */}
            <div
              className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-lg shrink-0"
              style={{ background: `linear-gradient(135deg, ${folderColor}30, ${folderColor}15)`, border: `1.5px solid ${folderColor}40` }}
            >
              <StructureIcon name={folder.icon} className="h-8 w-8 sm:h-10 sm:w-10" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest"
                  style={{ backgroundColor: `${folderColor}20`, color: folderColor }}
                >
                  Subject
                </span>
                {folder.categories.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {folder.categories.length} {folder.categories.length === 1 ? "chapter" : "chapters"}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-1.5">
                {folder.name}
              </h1>
              {folder.description && (
                <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">{folder.description}</p>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex items-center gap-4 sm:gap-6 mt-7 flex-wrap">
            {[
              { icon: <FileText className="h-4 w-4" />, value: folder.pdfCount, label: "PDFs" },
              { icon: <Trophy className="h-4 w-4" />, value: folder.quizCount, label: "Quizzes" },
              { icon: <Layers className="h-4 w-4" />, value: folder.categories.length, label: "Chapters" },
              { icon: <BookOpen className="h-4 w-4" />, value: totalSections, label: "Topics" },
            ].map(({ icon, value, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <span style={{ color: folderColor }}>{icon}</span>
                <strong className="text-foreground">{value}</strong>
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

          {/* ── LEFT: Chapter / Topic tree ───────────────────────────── */}
          <aside className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-foreground">Chapters & Topics</h2>
              {activeCategoryId && (
                <button onClick={clearFilter} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            {folder.categories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No chapters configured yet
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* All */}
                <button
                  onClick={clearFilter}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                    !activeCategoryId
                      ? "text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                  style={!activeCategoryId ? { backgroundColor: folderColor } : {}}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">All Content</span>
                  <span className="text-[10px] opacity-70">
                    {folder.pdfCount + folder.quizCount}
                  </span>
                </button>

                {folder.categories.map((cat) => {
                  const isActive = activeCategoryId === cat.id
                  const isExpanded = expandedCats.has(cat.id) || isActive
                  const catColor = cat.color || folderColor
                  const total = cat.pdfCount + cat.quizCount

                  return (
                    <div key={cat.id}>
                      <div
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm cursor-pointer transition-all ${
                          isActive && !activeSectionId
                            ? "font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        }`}
                        style={isActive && !activeSectionId
                          ? { backgroundColor: `${catColor}18`, color: catColor }
                          : {}}
                        onClick={() => { selectCategory(cat.id); if (!isExpanded) toggleCat(cat.id) }}
                      >
                        <StructureIcon name={cat.icon} className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate font-medium">{cat.name}</span>
                        <span className="text-[10px] opacity-60">{total || ""}</span>
                        {cat.sections.length > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleCat(cat.id) }}
                            className="p-0.5 rounded hover:bg-black/5 transition-colors"
                          >
                            {isExpanded
                              ? <ChevronUp className="h-3.5 w-3.5" />
                              : <ChevronDown className="h-3.5 w-3.5" />
                            }
                          </button>
                        )}
                      </div>

                      {isExpanded && cat.sections.length > 0 && (
                        <div className="ml-5 mt-1 space-y-0.5 border-l border-border/40 pl-3">
                          {cat.sections.map((sec) => {
                            const isSecActive = activeSectionId === sec.id
                            return (
                              <button
                                key={sec.id}
                                onClick={() => selectSection(cat.id, sec.id)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                                  isSecActive
                                    ? "font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                }`}
                                style={isSecActive ? { backgroundColor: `${catColor}15`, color: catColor } : {}}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                                  <span className="truncate flex-1">{sec.name}</span>
                                  {(sec.pdfCount + sec.quizCount) > 0 && (
                                    <span className="text-[10px] opacity-50 shrink-0">{sec.pdfCount + sec.quizCount}</span>
                                  )}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Browse link */}
            <div className="pt-3">
              <Link
                href={`/browse?folder=${folderId}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Open in Browse view
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </aside>

          {/* ── RIGHT: Content ───────────────────────────────────────── */}
          <div className="min-w-0">
            {/* Filter breadcrumb */}
            {(activeCategory || activeSection) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 flex-wrap">
                <button onClick={clearFilter} className="hover:text-foreground transition-colors">{folder.name}</button>
                {activeCategory && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <button
                      onClick={() => { setActiveCategoryId(activeCategory.id); setActiveSectionId(null) }}
                      className={activeSection ? "hover:text-foreground transition-colors" : "text-foreground font-medium"}
                    >
                      {activeCategory.name}
                    </button>
                  </>
                )}
                {activeSection && (
                  <>
                    <ChevronRight className="h-3 w-3" />
                    <span className="text-foreground font-medium">{activeSection.name}</span>
                  </>
                )}
              </div>
            )}

            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
              <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 w-fit">
                {(["all", "pdfs", "quizzes"] as Tab[]).map((t) => {
                  const count = t === "all"
                    ? filteredPdfs.length + filteredQuizzes.length
                    : t === "pdfs" ? filteredPdfs.length : filteredQuizzes.length
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "pdfs" ? <FileText className="h-3.5 w-3.5" />
                        : t === "quizzes" ? <Trophy className="h-3.5 w-3.5" />
                        : <LayoutGrid className="h-3.5 w-3.5" />}
                      {t === "all" ? "All" : t === "pdfs" ? "PDFs" : "Quizzes"}
                      <span className="text-[10px] text-muted-foreground">({count})</span>
                    </button>
                  )
                })}
              </div>

              <div className="relative flex-1 max-w-xs ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search in this subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 text-sm bg-muted/30 border-border/50"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Category overview cards (when no filter active and no search) */}
            {!activeCategoryId && !search && folder.categories.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chapters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {folder.categories.map((cat) => {
                    const catColor = cat.color || folderColor
                    return (
                      <button
                        key={cat.id}
                        onClick={() => { setActiveCategoryId(cat.id); if (!expandedCats.has(cat.id)) toggleCat(cat.id) }}
                        className="group text-left p-4 rounded-xl border border-border/40 hover:border-border/70 hover:shadow-sm transition-all"
                        style={{ background: `linear-gradient(135deg, ${catColor}08, transparent)` }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ backgroundColor: `${catColor}18` }}
                          >
                            <StructureIcon name={cat.icon} className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{cat.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {cat.pdfCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />{cat.pdfCount} PDFs
                                </span>
                              )}
                              {cat.quizCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3" />{cat.quizCount} Quizzes
                                </span>
                              )}
                              {cat.sections.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Layers className="h-3 w-3" />{cat.sections.length} Topics
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Content grid */}
            {(showPdfs && filteredPdfs.length > 0) || (showQuizzes && filteredQuizzes.length > 0) ? (
              <div className="space-y-6">
                {/* PDFs */}
                {showPdfs && filteredPdfs.length > 0 && (
                  <div>
                    {tab === "all" && (
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" /> PDFs ({filteredPdfs.length})
                      </h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredPdfs.map((pdf) => {
                        const catColor = (pdf.category as any)?.color || folderColor
                        return (
                          <Link
                            key={pdf.id}
                            href={`/pdf/${pdf.id}`}
                            className="group p-4 rounded-xl border border-border/40 hover:border-border/70 hover:shadow-sm transition-all block"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${catColor}18` }}
                              >
                                <FileText className="h-4.5 w-4.5" style={{ color: catColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                  {pdf.title}
                                </p>
                                {pdf.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{pdf.description}</p>
                                )}
                                <div className="flex items-center gap-2.5 mt-2 flex-wrap text-[11px] text-muted-foreground">
                                  {pdf.view_count > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <BookOpen className="h-3 w-3" />{pdf.view_count.toLocaleString()}
                                    </span>
                                  )}
                                  {pdf.file_size && <span>{fmtSize(pdf.file_size)}</span>}
                                  <span>{timeAgo(pdf.created_at)}</span>
                                  {!pdf.allow_download && (
                                    <span className="flex items-center gap-0.5 text-amber-500">
                                      <Lock className="h-3 w-3" />No download
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quizzes */}
                {showQuizzes && filteredQuizzes.length > 0 && (
                  <div>
                    {tab === "all" && (
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Trophy className="h-3.5 w-3.5" /> Quizzes ({filteredQuizzes.length})
                      </h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredQuizzes.map((quiz) => {
                        const href = quiz.url_slug ? `/quiz/${quiz.url_slug}` : `/quiz/${quiz.id}`
                        const diffColor = DIFF_COLORS[quiz.difficulty] || "#6366f1"
                        return (
                          <Link
                            key={quiz.id}
                            href={user ? href : `/login?redirect=${href}`}
                            className="group p-4 rounded-xl border border-border/40 hover:border-border/70 hover:shadow-sm transition-all block"
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/10">
                                <Trophy className="h-4 w-4 text-amber-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                  {quiz.title}
                                </p>
                                {quiz.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{quiz.description}</p>
                                )}
                                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                                  <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                                    style={{ backgroundColor: `${diffColor}18`, color: diffColor }}
                                  >
                                    {quiz.difficulty}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                    <ListChecks className="h-3 w-3" />{quiz.questions.length} Qs
                                  </span>
                                  {quiz.time_limit > 0 && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                                      <Clock className="h-3 w-3" />{quiz.time_limit}m
                                    </span>
                                  )}
                                  {!user && (
                                    <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                                      <Lock className="h-3 w-3" />Login
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Play className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-1 transition-colors" />
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !(!activeCategoryId && !search && folder.categories.length > 0) && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${folderColor}15` }}
                  >
                    <Search className="h-7 w-7" style={{ color: folderColor }} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">No content found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {search ? "Try a different search term" : "No content in this section yet"}
                    </p>
                  </div>
                  {(search || activeCategoryId) && (
                    <Button variant="outline" onClick={() => { setSearch(""); clearFilter() }}>
                      Show all content
                    </Button>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
