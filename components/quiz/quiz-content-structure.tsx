"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ChevronRight, ChevronDown, BookOpen, Layers, FileText,
  Folder, FolderOpen, Code, Calculator, FlaskConical,
  Globe, Briefcase, Zap, Database, LayoutGrid, X, Menu
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ContentFolder } from "@/lib/types"

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder, BookOpen, Code, Calculator, FlaskConical,
  Globe, Briefcase, Zap, Database, FileText, Layers,
}

function DynIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Folder
  return <Icon className={className} />
}

export interface StructureFilter {
  folderId: string | null
  categoryId: string | null
  sectionId: string | null
}

interface QuizStructureItem {
  structure_location: { folderId: string; categoryId: string; sectionId: string } | null
}

interface QuizContentStructureProps {
  quizzes: QuizStructureItem[]
  filter: StructureFilter
  onFilterChange: (f: StructureFilter) => void
}

export function QuizContentStructure({ quizzes, filter, onFilterChange }: QuizContentStructureProps) {
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch("/api/folders")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.folders)) {
          const sorted = [...data.folders]
            .filter(f => f.enabled !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          setFolders(sorted)
          // Auto-expand first folder if it has quizzes
          if (sorted.length > 0) {
            setExpandedFolders(new Set([sorted[0].id]))
          }
        }
      })
      .catch(() => {})
  }, [])

  // Build quiz count maps from structure_location
  const countMap = useMemo(() => {
    const byFolder: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const bySection: Record<string, number> = {}

    for (const q of quizzes) {
      const loc = q.structure_location
      if (!loc?.folderId) continue
      byFolder[loc.folderId] = (byFolder[loc.folderId] || 0) + 1
      if (loc.categoryId) byCategory[loc.categoryId] = (byCategory[loc.categoryId] || 0) + 1
      if (loc.sectionId) bySection[loc.sectionId] = (bySection[loc.sectionId] || 0) + 1
    }
    return { byFolder, byCategory, bySection }
  }, [quizzes])

  const totalStructured = useMemo(() =>
    quizzes.filter(q => q.structure_location?.folderId).length
  , [quizzes])

  const totalUnstructured = quizzes.length - totalStructured

  function toggleFolder(id: string) {
    setExpandedFolders(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleCategory(id: string) {
    setExpandedCategories(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
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

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Content Structure</span>
        </div>
        {!isAllActive && (
          <button
            onClick={clearFilter}
            className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2 px-2">

          {/* All Quizzes */}
          <button
            onClick={clearFilter}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5 ${
              isAllActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground hover:bg-muted/70"
            }`}
          >
            <BookOpen className={`h-4 w-4 shrink-0 ${isAllActive ? "text-primary-foreground" : "text-primary"}`} />
            <span className="flex-1 text-left">All Quizzes</span>
            <Badge
              variant="secondary"
              className={`text-[10px] h-4 px-1.5 shrink-0 ${isAllActive ? "bg-white/20 text-primary-foreground border-0" : ""}`}
            >
              {quizzes.length}
            </Badge>
          </button>

          {/* Folder tree */}
          {folders.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {folders.map(folder => {
                const folderCount = countMap.byFolder[folder.id] || 0
                if (folderCount === 0) return null

                const isFolderActive = filter.folderId === folder.id
                const isFolderExpanded = expandedFolders.has(folder.id)
                const enabledCategories = folder.categories?.filter(c =>
                  c.enabled !== false && (countMap.byCategory[c.id] || 0) > 0
                ) ?? []

                return (
                  <div key={folder.id}>
                    {/* Folder row */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {isFolderExpanded
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />
                        }
                      </button>
                      <button
                        onClick={() => selectFolder(folder.id)}
                        className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                          isFolderActive && !filter.categoryId
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <span
                          className="h-5 w-5 rounded flex items-center justify-center shrink-0"
                          style={{ backgroundColor: folder.color ? `${folder.color}20` : undefined }}
                        >
                          <DynIcon
                            name={folder.icon || "Folder"}
                            className="h-3.5 w-3.5"
                            // @ts-ignore
                            style={{ color: folder.color || undefined }}
                          />
                        </span>
                        <span className="flex-1 text-left text-xs font-semibold truncate">{folder.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isFolderActive && !filter.categoryId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {folderCount}
                        </span>
                      </button>
                    </div>

                    {/* Categories */}
                    {isFolderExpanded && enabledCategories.length > 0 && (
                      <div className="ml-6 mt-0.5 space-y-0.5">
                        {enabledCategories.map(category => {
                          const catCount = countMap.byCategory[category.id] || 0
                          const isCatActive = filter.categoryId === category.id
                          const isCatExpanded = expandedCategories.has(category.id)
                          const enabledSections = category.sections?.filter(s =>
                            s.enabled !== false && (countMap.bySection[s.id] || 0) > 0
                          ) ?? []

                          return (
                            <div key={category.id}>
                              {/* Category row */}
                              <div className="flex items-center gap-1">
                                {enabledSections.length > 0 ? (
                                  <button
                                    onClick={() => toggleCategory(category.id)}
                                    className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                  >
                                    {isCatExpanded
                                      ? <ChevronDown className="h-3 w-3" />
                                      : <ChevronRight className="h-3 w-3" />
                                    }
                                  </button>
                                ) : (
                                  <div className="w-5 shrink-0" />
                                )}
                                <button
                                  onClick={() => selectCategory(folder.id, category.id)}
                                  className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                                    isCatActive && !filter.sectionId
                                      ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium"
                                  }`}
                                >
                                  <span
                                    className="h-4 w-1 rounded-full shrink-0"
                                    style={{ backgroundColor: category.color || "#6366f1" }}
                                  />
                                  <span className="flex-1 text-left truncate">{category.name}</span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    isCatActive && !filter.sectionId
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground"
                                  }`}>
                                    {catCount}
                                  </span>
                                </button>
                              </div>

                              {/* Sections */}
                              {isCatExpanded && enabledSections.length > 0 && (
                                <div className="ml-6 mt-0.5 space-y-0.5">
                                  {enabledSections.map(section => {
                                    const secCount = countMap.bySection[section.id] || 0
                                    const isSecActive = filter.sectionId === section.id

                                    return (
                                      <button
                                        key={section.id}
                                        onClick={() => selectSection(folder.id, category.id, section.id)}
                                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all duration-150 ${
                                          isSecActive
                                            ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground font-medium"
                                        }`}
                                      >
                                        <FileText className="h-3 w-3 shrink-0 opacity-60" />
                                        <span className="flex-1 text-left truncate">{section.name}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                          isSecActive
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground"
                                        }`}>
                                          {secCount}
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
                  </div>
                )
              })}
            </div>
          )}

          {/* Uncategorized */}
          {totalUnstructured > 0 && (
            <button
              onClick={() => onFilterChange({ folderId: "uncategorized", categoryId: null, sectionId: null })}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 mt-2 ${
                filter.folderId === "uncategorized"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Layers className="h-4 w-4 shrink-0 opacity-60" />
              <span className="flex-1 text-left text-xs">Other Quizzes</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                filter.folderId === "uncategorized"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}>
                {totalUnstructured}
              </span>
            </button>
          )}
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="gap-2 h-9 text-xs border-border/60"
        >
          <Menu className="h-3.5 w-3.5" />
          {isAllActive ? "Content Structure" : (
            filter.sectionId ? "Section selected" :
            filter.categoryId ? "Chapter selected" :
            filter.folderId === "uncategorized" ? "Other Quizzes" : "Subject selected"
          )}
          {!isAllActive && (
            <span className="ml-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              ✓
            </span>
          )}
        </Button>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="mt-2 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden" style={{ maxHeight: 380 }}>
            {sidebarContent}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden sticky top-24" style={{ minHeight: 400, maxHeight: "calc(100vh - 140px)" }}>
        {sidebarContent}
      </div>
    </>
  )
}
