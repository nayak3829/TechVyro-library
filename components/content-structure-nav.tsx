"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronRight, ChevronDown, BookOpen, Layers, FileText,
  Folder, FolderOpen, Code, Calculator, FlaskConical,
  Globe, Briefcase, Zap, Database, LayoutGrid, X, Menu,
  GraduationCap
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder, FolderOpen, BookOpen, Code, Calculator, FlaskConical,
  Globe, Briefcase, Zap, Database, FileText, Layers, GraduationCap
}

function DynIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = ICON_MAP[name] || Folder
  return <Icon className={className} style={style} />
}

export interface ContentStructureFilter {
  folderId: string | null
  categoryId: string | null
  sectionId: string | null
}

export interface StructureNode {
  id: string
  name: string
  icon?: string
  color?: string
  pdfCount?: number
  quizCount?: number
  sections?: StructureSectionNode[]
}

export interface StructureSectionNode {
  id: string
  name: string
  pdfCount?: number
  quizCount?: number
}

export interface StructureFolderNode extends StructureNode {
  categories?: StructureCategoryNode[]
}

export interface StructureCategoryNode extends StructureNode {
  sections?: StructureSectionNode[]
}

interface ContentStructureNavProps {
  filter: ContentStructureFilter
  onFilterChange: (f: ContentStructureFilter) => void
  showType?: "all" | "pdfs" | "quizzes"
  autoRefreshMs?: number
  className?: string
}

export function ContentStructureNav({
  filter,
  onFilterChange,
  showType = "all",
  autoRefreshMs = 120_000,
  className = "",
}: ContentStructureNavProps) {
  const [folders, setFolders] = useState<StructureFolderNode[]>([])
  const [totals, setTotals] = useState({ pdfs: 0, quizzes: 0, unstructuredPdfs: 0, unstructuredQuizzes: 0 })
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchStructure = useCallback(async () => {
    try {
      const res = await fetch("/api/content-structure", { cache: "no-store" })
      const data = await res.json()
      if (Array.isArray(data.folders)) {
        setFolders(data.folders)
        if (data.totals) setTotals(data.totals)
        if (data.folders.length > 0 && expandedFolders.size === 0) {
          setExpandedFolders(new Set([data.folders[0].id]))
        }
      }
    } catch {}
    setLoading(false)
  }, []) // eslint-disable-line

  useEffect(() => {
    fetchStructure()
    const iv = setInterval(fetchStructure, autoRefreshMs)
    return () => clearInterval(iv)
  }, [fetchStructure, autoRefreshMs])

  function getCount(node: { pdfCount?: number; quizCount?: number }) {
    if (showType === "pdfs") return node.pdfCount || 0
    if (showType === "quizzes") return node.quizCount || 0
    return (node.pdfCount || 0) + (node.quizCount || 0)
  }

  const totalAll = showType === "pdfs" ? totals.pdfs
    : showType === "quizzes" ? totals.quizzes
    : totals.pdfs + totals.quizzes

  const unstructuredAll = showType === "pdfs" ? totals.unstructuredPdfs
    : showType === "quizzes" ? totals.unstructuredQuizzes
    : totals.unstructuredPdfs + totals.unstructuredQuizzes

  function toggleFolder(id: string) {
    setExpandedFolders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleCategory(id: string) {
    setExpandedCategories(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function selectFolder(folderId: string) {
    if (filter.folderId === folderId && !filter.categoryId) {
      onFilterChange({ folderId: null, categoryId: null, sectionId: null })
    } else {
      onFilterChange({ folderId, categoryId: null, sectionId: null })
      setExpandedFolders(prev => new Set([...prev, folderId]))
    }
    setMobileOpen(false)
  }

  function selectCategory(folderId: string, categoryId: string) {
    if (filter.categoryId === categoryId && !filter.sectionId) {
      onFilterChange({ folderId, categoryId: null, sectionId: null })
    } else {
      onFilterChange({ folderId, categoryId, sectionId: null })
      setExpandedFolders(prev => new Set([...prev, folderId]))
      setExpandedCategories(prev => new Set([...prev, categoryId]))
    }
    setMobileOpen(false)
  }

  function selectSection(folderId: string, categoryId: string, sectionId: string) {
    if (filter.sectionId === sectionId) {
      onFilterChange({ folderId, categoryId, sectionId: null })
    } else {
      onFilterChange({ folderId, categoryId, sectionId })
      setExpandedFolders(prev => new Set([...prev, folderId]))
      setExpandedCategories(prev => new Set([...prev, categoryId]))
    }
    setMobileOpen(false)
  }

  function clearFilter() {
    onFilterChange({ folderId: null, categoryId: null, sectionId: null })
  }

  const isAllActive = !filter.folderId
  const activeLabel = filter.sectionId ? "Topic" : filter.categoryId ? "Chapter" : filter.folderId === "uncategorized" ? "Other" : filter.folderId ? "Subject" : null

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Content Structure</span>
        </div>
        {!isAllActive && (
          <button onClick={clearFilter} className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2 px-2 space-y-0.5">
          {/* All */}
          <button
            onClick={clearFilter}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isAllActive ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-muted/70"
            }`}
          >
            <BookOpen className={`h-4 w-4 shrink-0 ${isAllActive ? "text-primary-foreground" : "text-primary"}`} />
            <span className="flex-1 text-left">All Content</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isAllActive ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {loading ? "…" : totalAll}
            </span>
          </button>

          {/* Folder tree */}
          {!loading && folders.map(folder => {
            const count = getCount(folder)
            if (count === 0) return null

            const isFolderActive = filter.folderId === folder.id && !filter.categoryId
            const isFolderSelected = filter.folderId === folder.id
            const isFolderExpanded = expandedFolders.has(folder.id)
            const cats = (folder.categories ?? []).filter(c => getCount(c) > 0)

            return (
              <div key={folder.id}>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="p-1 rounded hover:bg-muted/60 text-muted-foreground shrink-0"
                  >
                    {isFolderExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => selectFolder(folder.id)}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isFolderActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : isFolderSelected
                        ? "bg-muted/50 text-foreground"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: folder.color ? `${folder.color}22` : undefined }}
                    >
                      <DynIcon
                        name={folder.icon || "Folder"}
                        className="h-3.5 w-3.5"
                        style={{ color: folder.color || undefined }}
                      />
                    </span>
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                    <CountBadge count={count} active={isFolderActive} />
                  </button>
                </div>

                {isFolderExpanded && cats.length > 0 && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {cats.map(cat => {
                      const catCount = getCount(cat)
                      const isCatActive = filter.categoryId === cat.id && !filter.sectionId
                      const isCatSelected = filter.categoryId === cat.id
                      const isCatExpanded = expandedCategories.has(cat.id)
                      const secs = (cat.sections ?? []).filter(s => getCount(s) > 0)

                      return (
                        <div key={cat.id}>
                          <div className="flex items-center gap-0.5">
                            {secs.length > 0 ? (
                              <button
                                onClick={() => toggleCategory(cat.id)}
                                className="p-1 rounded hover:bg-muted/60 text-muted-foreground shrink-0"
                              >
                                {isCatExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </button>
                            ) : <div className="w-5 shrink-0" />}
                            <button
                              onClick={() => selectCategory(folder.id, cat.id)}
                              className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                                isCatActive
                                  ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium"
                              }`}
                            >
                              <span className="h-4 w-1 rounded-full shrink-0" style={{ backgroundColor: cat.color || "#6366f1" }} />
                              <span className="flex-1 text-left truncate">{cat.name}</span>
                              <CountBadge count={catCount} active={isCatActive} />
                            </button>
                          </div>

                          {isCatExpanded && secs.length > 0 && (
                            <div className="ml-6 mt-0.5 space-y-0.5">
                              {secs.map(sec => {
                                const secCount = getCount(sec)
                                const isSecActive = filter.sectionId === sec.id
                                return (
                                  <button
                                    key={sec.id}
                                    onClick={() => selectSection(folder.id, cat.id, sec.id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                                      isSecActive
                                        ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium"
                                    }`}
                                  >
                                    <FileText className="h-3 w-3 shrink-0 opacity-50" />
                                    <span className="flex-1 text-left truncate">{sec.name}</span>
                                    <CountBadge count={secCount} active={isSecActive} />
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
              </div>
            )
          })}

          {/* Loading skeleton */}
          {loading && [1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 animate-pulse">
              <div className="h-5 w-5 rounded bg-muted" />
              <div className="h-4 flex-1 rounded bg-muted" />
            </div>
          ))}

          {/* Uncategorized */}
          {!loading && unstructuredAll > 0 && (
            <button
              onClick={() => onFilterChange({ folderId: "uncategorized", categoryId: null, sectionId: null })}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all mt-1 ${
                filter.folderId === "uncategorized"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/60"
              }`}
            >
              <Layers className="h-4 w-4 shrink-0 opacity-60" />
              <span className="flex-1 text-left">Other Content</span>
              <CountBadge count={unstructuredAll} active={filter.folderId === "uncategorized"} />
            </button>
          )}
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <div className={`lg:hidden mb-4 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="gap-2 h-9 text-xs border-border/60 w-full sm:w-auto"
        >
          <Menu className="h-3.5 w-3.5" />
          <span>Content Structure</span>
          {activeLabel && (
            <span className="ml-1 h-4 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center font-bold">
              {activeLabel}
            </span>
          )}
        </Button>

        {mobileOpen && (
          <div className="mt-2 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden" style={{ maxHeight: 400 }}>
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden sticky top-24 ${className}`}
        style={{ minHeight: 300, maxHeight: "calc(100vh - 140px)" }}>
        {sidebarContent}
      </aside>
    </>
  )
}

function CountBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    }`}>
      {count}
    </span>
  )
}
