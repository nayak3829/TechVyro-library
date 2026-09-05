"use client"

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, BookOpen, FileText, FolderOpen, GraduationCap, Layers, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPublicContentStructure } from "@/lib/content-structure-client"

interface SectionNode { id: string; name: string; pdfCount?: number; quizCount?: number; enabled: boolean }
interface CategoryNode { id: string; name: string; color: string; icon: string; sections: SectionNode[]; pdfCount?: number; quizCount?: number; enabled: boolean }
interface FolderNode { id: string; name: string; description: string; icon: string; color: string; categories: CategoryNode[]; pdfCount: number; quizCount: number; enabled: boolean }

export function SubjectsSection() {
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [canScrollBack, setCanScrollBack] = useState(false)
  const [canScrollForward, setCanScrollForward] = useState(false)
  const shelfRef = useRef<HTMLDivElement>(null)

  const updateScrollControls = useCallback(() => {
    const shelf = shelfRef.current
    if (!shelf) return
    setCanScrollBack(shelf.scrollLeft > 8)
    setCanScrollForward(shelf.scrollLeft + shelf.clientWidth < shelf.scrollWidth - 8)
  }, [])

  const loadSubjects = useCallback(() => {
    setLoading(true)
    setHasError(false)
    getPublicContentStructure()
      .then(d => {
        const data = d as { folders?: FolderNode[] }
        const enriched = (data.folders || []).filter((f: FolderNode) => f.pdfCount > 0 || f.quizCount > 0)
        setFolders(enriched)
      })
      .catch(() => setHasError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadSubjects()
  }, [loadSubjects])

  useEffect(() => {
    const shelf = shelfRef.current
    if (!shelf) return
    updateScrollControls()
    const observer = new ResizeObserver(updateScrollControls)
    observer.observe(shelf)
    shelf.addEventListener("scroll", updateScrollControls, { passive: true })
    return () => {
      observer.disconnect()
      shelf.removeEventListener("scroll", updateScrollControls)
    }
  }, [folders.length, updateScrollControls])

  const scrollShelf = (direction: "back" | "forward") => {
    const shelf = shelfRef.current
    if (!shelf) return
    shelf.scrollBy({ left: (direction === "forward" ? 1 : -1) * Math.max(shelf.clientWidth * 0.78, 280), behavior: "smooth" })
  }

  const handleShelfKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault()
      scrollShelf("forward")
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault()
      scrollShelf("back")
    }
  }

  if (!loading && !hasError && folders.length === 0) return null

  return (
    <section className="relative overflow-hidden border-y border-border/45 bg-muted/20 py-14 sm:py-18">
      <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05]" style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
        backgroundSize: "28px 28px"
      }} />
      <div className="container mx-auto px-4 relative">
        <div className="mb-7 flex items-end justify-between gap-4 sm:mb-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <GraduationCap className="h-3.5 w-3.5" />
              Browse by Subject
            </div>
            <h2 className="study-display text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
              Find your study shelf
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Open a subject to find notes, practice, and the chapters that matter now.
            </p>
          </div>
          <Button asChild variant="outline" className="hidden shrink-0 gap-2 sm:flex">
            <Link href="/browse">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {hasError ? (
          <div className="flex min-h-44 flex-col items-start justify-center rounded-2xl border border-dashed border-border/70 bg-background/50 px-6">
            <p className="font-semibold text-foreground">The subject shelf could not be opened.</p>
            <Button type="button" variant="link" onClick={loadSubjects} className="mt-1 h-auto px-0 text-primary">Try again</Button>
          </div>
        ) : (
          <>
            <div className="relative">
              <div
                ref={shelfRef}
                role="region"
                aria-label="Subjects"
                aria-roledescription="carousel"
                tabIndex={0}
                onKeyDown={handleShelfKeys}
                className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-4 focus-visible:ring-offset-muted"
              >
                {loading ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-[255px] w-[274px] shrink-0 animate-pulse rounded-2xl border border-border/50 bg-background/60 sm:w-[310px]" />
                )) : folders.map((folder) => {
            const color = folder.color || "#6366f1"
            const totalSections = folder.categories.reduce((total, category) => total + category.sections.length, 0)
            return (
              <Link
                key={folder.id}
                href={`/subject/${folder.id}`}
                aria-label={`Open ${folder.name}`}
                className="group relative flex h-[255px] w-[274px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border/55 p-5 shadow-sm transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-border hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 sm:w-[310px] sm:p-6 motion-reduce:transition-none"
                style={{ background: `linear-gradient(145deg, ${color}16 0%, ${color}07 58%, hsl(var(--card) / .88) 100%)` }}
              >
                <div
                  className="pointer-events-none absolute -right-9 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl"
                  style={{ background: color }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border shadow-sm" style={{ background: `linear-gradient(135deg, ${color}2e, ${color}12)`, borderColor: `${color}38` }}>
                    <FolderOpen className="h-5 w-5" style={{ color }} aria-hidden="true" />
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none" />
                </div>
                <div className="relative mt-5">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color }}>Subject collection</p>
                  <h3 className="line-clamp-1 text-lg font-bold tracking-tight text-foreground">{folder.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{folder.description || "Study resources arranged for focused revision."}</p>
                </div>
                <div className="relative mt-auto border-t border-border/45 pt-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
                    {folder.pdfCount > 0 && <span className="flex items-center gap-1"><FileText className="h-3 w-3" style={{ color }} /><strong className="font-semibold text-foreground">{folder.pdfCount}</strong> notes</span>}
                    {folder.quizCount > 0 && <span className="flex items-center gap-1"><Trophy className="h-3 w-3" style={{ color }} /><strong className="font-semibold text-foreground">{folder.quizCount}</strong> quizzes</span>}
                    {totalSections > 0 && <span className="flex items-center gap-1"><Layers className="h-3 w-3" style={{ color }} /><strong className="font-semibold text-foreground">{totalSections}</strong> topics</span>}
                  </div>
                </div>
              </Link>
            )
                })}
              </div>
              {!loading && folders.length > 1 && (
                <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center sm:flex">
                  <div className="pointer-events-auto flex gap-2 bg-gradient-to-l from-muted/90 via-muted/70 to-transparent py-4 pl-10 pr-1">
                    <Button type="button" variant="outline" size="icon" aria-label="Previous subjects" onClick={() => scrollShelf("back")} disabled={!canScrollBack} className="h-9 w-9 rounded-full bg-background/90 shadow-sm"><ArrowLeft className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" size="icon" aria-label="Next subjects" onClick={() => scrollShelf("forward")} disabled={!canScrollForward} className="h-9 w-9 rounded-full bg-background/90 shadow-sm"><ArrowRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between sm:hidden">
              <p className="text-xs text-muted-foreground">Swipe to browse subjects</p>
              <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          </>
        )}

        <div className="mt-6 flex justify-center sm:hidden">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/browse">View all content <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
