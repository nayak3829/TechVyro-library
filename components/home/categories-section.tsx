"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { 
  FolderOpen, ChevronRight, ChevronDown, FileText, TrendingUp,
  Folder, BookOpen, Code, Calculator, FlaskConical, Globe, Briefcase, 
  Heart, Music, Camera, Palette, Cpu, Database, Server, Shield, Zap, Layers
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { Category, PDF, ContentFolder } from "@/lib/types"

interface CategoriesSectionProps {
  categories: Category[]
  pdfsByCategory: Record<string, PDF[]>
}

const ICONS: Record<string, LucideIcon> = {
  Folder, FolderOpen, BookOpen, Code, Calculator, FlaskConical, Globe, 
  Briefcase, Heart, Music, Camera, Palette, Cpu, Database, Server, Shield, Zap, FileText, Layers
}

function getIcon(iconName: string) {
  return ICONS[iconName] || Folder
}

const REFRESH_INTERVAL = 2 * 60 * 1000

export function CategoriesSection({ categories: initialCategories, pdfsByCategory: initialPdfsByCategory }: CategoriesSectionProps) {
  const [folders, setFolders] = useState<ContentFolder[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState(initialCategories)
  const [pdfsByCategory, setPdfsByCategory] = useState(initialPdfsByCategory)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchFolders = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch("/api/content-structure", { signal })
    if (!res.ok) throw new Error("Unable to load subject structure")
    const data: unknown = await res.json()
    const rawFolders = data && typeof data === "object" ? (data as { folders?: unknown }).folders : []
    const parsed: ContentFolder[] = Array.isArray(rawFolders)
      ? rawFolders.filter((folder): folder is ContentFolder => Boolean(folder) && typeof folder === "object" && typeof (folder as ContentFolder).id === "string" && typeof (folder as ContentFolder).name === "string" && Array.isArray((folder as ContentFolder).categories))
      : []
    if (signal?.aborted) return
    setFolders(prev => {
      if (prev.length === 0 && parsed.length > 0) {
        setExpandedFolders(new Set([parsed[0].id]))
      }
      return parsed.filter(f => f.enabled)
    })
  }, [])

  const fetchContent = useCallback(async (signal?: AbortSignal) => {
    try {
      await fetchFolders(signal)
      if (!signal?.aborted) setLastUpdated(new Date())
    } catch (error) {
      if ((error as Error).name !== "AbortError") console.error("[homepage] failed to load content structure")
    }
  }, [fetchFolders])

  useEffect(() => {
    const controller = new AbortController()
    void fetchContent(controller.signal)
    timerRef.current = setInterval(() => void fetchContent(), REFRESH_INTERVAL)
    return () => {
      controller.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [fetchContent])

  const toggleFolder = (id: string) => {
    const newSet = new Set(expandedFolders)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedFolders(newSet)
  }

  const toggleCategory = (id: string) => {
    const newSet = new Set(expandedCategories)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedCategories(newSet)
  }

  // If no admin folders, show database categories
  const hasFolders = folders.length > 0

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Browse by Category
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 text-balance">
            Organized Study Materials
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Find PDFs organized by subjects for easier navigation
          </p>
          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {/* Admin Folder Structure */}
        {hasFolders ? (
          <div className="space-y-4 max-w-5xl mx-auto">
            {folders.map((folder) => {
              const FolderIcon = getIcon(folder.icon)
              const isExpanded = expandedFolders.has(folder.id)
              const enabledCategories = folder.categories.filter(c => c.enabled)
              const totalSections = enabledCategories.reduce((acc, cat) => acc + cat.sections.filter(s => s.enabled).length, 0)
              const totalPdfs = enabledCategories.reduce((acc, cat) =>
                acc + cat.sections
                  .filter(s => s.enabled)
                  .reduce((sAcc, sec) => sAcc + (Number.isFinite(Number(sec.pdfCount)) ? Number(sec.pdfCount) : 0), 0), 0
              )

              return (
                <Card key={folder.id} className="border-border/50 overflow-hidden hover:shadow-lg transition-all">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full min-w-0 items-center justify-between gap-3 p-4 text-left sm:p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                        style={{ borderLeft: `4px solid ${folder.color}` }}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                          <div 
                            className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl flex items-center justify-center shadow-md"
                            style={{ backgroundColor: folder.color }}
                          >
                            <FolderIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground text-base sm:text-lg flex min-w-0 items-center gap-2">
                              <span className="truncate">{folder.name}</span>
                              {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
                              {enabledCategories.length} categories | {totalSections} sections | {totalPdfs} PDFs
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          style={{ backgroundColor: folder.color + '20', borderColor: folder.color + '60' }}
                          className="hidden text-foreground sm:flex"
                        >
                          {enabledCategories.length} Categories
                        </Badge>
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pl-6 sm:pl-8 space-y-3">
                        {enabledCategories.map((category) => {
                          const CategoryIcon = getIcon(category.icon)
                          const isCatExpanded = expandedCategories.has(category.id)
                          const enabledSections = category.sections.filter(s => s.enabled)

                          return (
                            <Collapsible 
                              key={category.id} 
                              open={isCatExpanded} 
                              onOpenChange={() => toggleCategory(category.id)}
                            >
                              <div 
                                className="border rounded-lg overflow-hidden"
                                style={{ borderColor: category.color + '40' }}
                              >
                                <CollapsibleTrigger asChild>
                                  <button type="button" className="flex w-full min-w-0 items-center justify-between gap-2 p-3 text-left sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                      <div 
                                        className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: category.color + '20' }}
                                      >
                                        <CategoryIcon className="h-4 w-4" style={{ color: category.color }} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-medium text-sm sm:text-base flex min-w-0 items-center gap-2">
                                          <span className="truncate">{category.name}</span>
                                          {isCatExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {enabledSections.length} sections
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
                                      {enabledSections.reduce((acc, s) => acc + (Number.isFinite(Number(s.pdfCount)) ? Number(s.pdfCount) : 0), 0)} PDFs
                                    </Badge>
                                  </button>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="px-3 pb-3 sm:px-4 sm:pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {enabledSections.map((section) => {
                                      const SectionIcon = getIcon(section.icon)

                                      return (
                                        <a
                                          key={section.id}
                                          href={`/browse?folderId=${encodeURIComponent(folder.id)}&categoryId=${encodeURIComponent(category.id)}&sectionId=${encodeURIComponent(section.id)}`}
                                          className="flex min-w-0 items-center justify-between gap-2 p-3 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer group"
                                        >
                                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                            <SectionIcon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                                                {section.name}
                                              </p>
                                              {section.description && (
                                                <p className="text-[10px] text-muted-foreground line-clamp-1">
                                                  {section.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                              {section.pdfCount} PDFs
                                            </Badge>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                          </div>
                                        </a>
                                      )
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          )
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )
            })}
          </div>
        ) : (
          /* Fallback: Database Categories Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((category) => {
              const categoryPdfs = pdfsByCategory[category.id] || []
              const pdfCount = categoryPdfs.length
              const totalDownloads = categoryPdfs.reduce((acc, pdf) => acc + pdf.download_count, 0)
              
              return (
                <Link key={category.id} href={`/category/${category.slug}`}>
                  <Card className="group h-full overflow-hidden border-border/50 bg-card hover:shadow-xl hover:border-primary/30 hover:-translate-y-2 transition-all duration-300">
                    <div 
                      className="h-2 w-full"
                      style={{ backgroundColor: category.color }}
                    />
                    
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex items-start gap-4">
                        <div 
                          className="shrink-0 h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md"
                          style={{ backgroundColor: category.color }}
                        >
                          <FolderOpen className="h-6 w-6 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-base sm:text-lg truncate group-hover:text-primary transition-colors">
                            {category.name}
                          </h3>
                          
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" />
                              <span>{pdfCount} PDFs</span>
                            </div>
                            {totalDownloads > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                                <span>{totalDownloads.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                      
                      {categoryPdfs.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                            Recent Additions
                          </p>
                          <div className="space-y-1.5">
                            {categoryPdfs.slice(0, 2).map((pdf) => (
                              <div key={pdf.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                                <span className="truncate">{pdf.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
