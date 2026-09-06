"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Clock, FileText, Play, ArrowRight, Zap, Target, 
  BookOpen, Shield, Train, TrendingUp, Atom,
  GraduationCap, Lock
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { deriveStudyPdfAvailability, type StudyPdfAvailability } from "@/lib/study-pdf-availability"
import { getPublicContentStructure } from "@/lib/content-structure-client"

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
  _platformName?: string
}

const CATEGORIES = [
  { id: "ssc", label: "SSC", icon: Target, color: "#3b82f6" },
  { id: "banking", label: "Banking", icon: TrendingUp, color: "#10b981" },
  { id: "defence", label: "Defence", icon: Shield, color: "#ef4444" },
  { id: "railways", label: "Railways", icon: Train, color: "#f97316" },
  { id: "upsc", label: "UPSC/PCS", icon: BookOpen, color: "#8b5cf6" },
  { id: "jee-neet", label: "JEE/NEET", icon: Atom, color: "#06b6d4" },
  { id: "teaching", label: "CTET/TET", icon: GraduationCap, color: "#ec4899" },
  { id: "agriculture", label: "Agriculture", icon: GraduationCap, color: "#84cc16" },
]

function isTestSeries(value: unknown): value is TestSeries {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return typeof item.id === "string" && typeof item.title === "string" && item.title.trim().length > 0
    && typeof item.slug === "string" && item.slug.trim().length > 0 && typeof item.category === "string"
}

const getCategoryColor = (category: string): string => {
  const cat = CATEGORIES.find(c => c.id === category || c.label.toLowerCase() === category?.toLowerCase())
  return cat?.color || "#6366f1"
}

const getCategoryIcon = (category: string) => {
  const cat = CATEGORIES.find(c => c.id === category || c.label.toLowerCase() === category?.toLowerCase())
  return cat?.icon || GraduationCap
}

export function TestSeriesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [testSeries, setTestSeries] = useState<TestSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [studyPdfAvailability, setStudyPdfAvailability] = useState<StudyPdfAvailability | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [error, setError] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true)
      return
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: "600px 0px" },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const fetchTestSeries = useCallback(async () => {
    requestRef.current?.abort()
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    const controller = new AbortController()
    const requestSignal = controller.signal
    requestRef.current = controller
    setLoading(true)
    setError(false)
    timeoutRef.current = window.setTimeout(() => {
      controller.abort()
      setError(true)
      setLoading(false)
    }, 12_000)
    try {
      const res = await fetch(`/api/extract?bulk=true&category=all`, { signal: requestSignal })
      const contentType = (res.headers as Headers | undefined)?.get("content-type")
      if (res.ok === false || (contentType && !contentType.includes("application/json"))) {
        throw new Error("Test series are temporarily unavailable")
      }
      const data = await res.json()
      
      if (data && typeof data === "object" && (data as { success?: unknown }).success && Array.isArray((data as { testSeries?: unknown }).testSeries)) {
        // Get unique categories and count series per category
        const counts: Record<string, number> = {}
        const allSeries = Array.from(new Map(
          (data.testSeries as unknown[]).filter(isTestSeries).map(series => [
            `${series._sourceApi || series._platformName || "sample"}:${series.id || series.slug}`,
            series,
          ]),
        ).values())
        
        for (const series of allSeries) {
          const cat = series.category || "general"
          counts[cat] = (counts[cat] || 0) + 1
        }
        
        setTestSeries(allSeries.slice(0, 8))
        setCategoryCounts(counts)
      } else {
        setTestSeries([])
        setCategoryCounts({})
      }
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        setTestSeries([])
        setCategoryCounts({})
        setError(true)
      }
    } finally {
      if (!requestSignal.aborted) setLoading(false)
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!shouldLoad) return
    void fetchTestSeries()
    return () => {
      requestRef.current?.abort()
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      requestRef.current = null
    }
  }, [fetchTestSeries, shouldLoad])

  useEffect(() => {
    if (!shouldLoad) return
    let active = true
    getPublicContentStructure()
      .then(data => {
        if (active) setStudyPdfAvailability(deriveStudyPdfAvailability(data))
      })
      .catch(() => {})
    return () => { active = false }
  }, [shouldLoad])

  const handleStartSeries = (series: TestSeries) => {
    const params = new URLSearchParams({
      slug: series.slug || series.id,
      apiBase: series._sourceApi || `sample:${series.category}`,
      webBase: series._sourceWeb || "",
      title: series.title,
      platform: series._platformName || "unknown",
      category: series.category || "general",
      location: "homepage",
    })
    router.push(`/test-series/series?${params}`)
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-background py-14 sm:py-18 lg:py-22">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border/70" />
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-3 sm:mb-4 bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Mock Tests
          </Badge>
          <h2 className="study-display mb-2 text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl text-balance">
            Practice Mock Tests
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md sm:max-w-xl mx-auto px-2">
            Browse currently available mock tests by exam category.
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const count = categoryCounts[cat.id] || 0
            const studyPdfsComingSoon = studyPdfAvailability?.[cat.id] === false
            return (
              <Link
                key={cat.id}
                href={`/test-series?category=${cat.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground border transition-all hover:shadow-sm shrink-0"
                style={{ 
                  backgroundColor: `${cat.color}10`, 
                  borderColor: `${cat.color}30`,
                }}
              >
                <Icon aria-hidden="true" className="h-3 w-3" />
                {cat.label}
                {count > 0 && <span className="text-[10px] opacity-70">· {count} tests</span>}
                {studyPdfsComingSoon && <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-700 dark:text-amber-300">PDFs soon</span>}
              </Link>
            )
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Card key={i} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-4" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </Card>
            ))}
          </div>
        )}

        {/* Test Series Grid */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {testSeries.map((series, idx) => {
              const color = getCategoryColor(series.category)
              const Icon = getCategoryIcon(series.category)
              const studyPdfsComingSoon = studyPdfAvailability?.[series.category] === false
              
              return (
                <Card 
                  key={[
                    series._sourceApi || series._platformName || "unknown-source",
                    series.id || "unknown-id",
                    series.slug || "unknown-slug",
                    idx,
                  ].join(":")}
                  className="group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/50 hover:border-primary/40 flex flex-col"
                >
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                      <div 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color }} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <Badge
                          className="border-border bg-slate-900 px-1.5 py-0.5 text-[9px] text-white dark:bg-slate-100 dark:text-slate-950 sm:text-[10px]"
                          style={{ borderLeftColor: color, borderLeftWidth: "3px" }}
                        >
                          {series.category?.toUpperCase() || "GENERAL"}
                        </Badge>
                        {series.isSample ? (
                          <Badge className="text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0.5 px-1.5">
                            SAMPLE
                          </Badge>
                        ) : (
                          <Badge className="text-[9px] sm:text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0.5 px-1.5">
                            LIVE
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors mb-1">
                      {series.title}
                    </h3>
                    
                    {/* Platform Name */}
                    {series._platformName && (
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mb-1.5">
                        {series._platformName}
                      </p>
                    )}

                    {/* Description */}
                    {series.description && !series._platformName && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mb-2">
                        {series.description}
                      </p>
                    )}
                    {studyPdfsComingSoon && (
                      <p className="mb-2 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Mock tests are available now; study PDFs are coming soon.
                      </p>
                    )}
                    
                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 mt-auto">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                          <span>{Math.max(0, Number(series.total_tests) || 0)} tests</span>
                      </div>
                      {series.duration > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{series.duration} min</span>
                        </div>
                      )}
                    </div>
                    
                    {/* CTA */}
                    <Button 
                      onClick={() => handleStartSeries(series)}
                      size="sm" 
                      className="w-full h-8 sm:h-9 text-[11px] sm:text-xs bg-primary hover:bg-primary/90 gap-1"
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
        )}
        {!loading && error && (
          <div className="mb-8 rounded-xl border border-dashed border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Mock tests could not be loaded.</p>
            <Button type="button" variant="link" onClick={() => void fetchTestSeries()} className="mt-1 text-primary">Try again</Button>
          </div>
        )}
        {!loading && !error && testSeries.length === 0 && (
          <div className="mb-8 rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">No mock tests are available yet.</div>
        )}

        {/* View All CTA */}
        <div className="text-center">
          <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm gap-1.5">
            <Link href="/test-series">
              Browse All Mock Tests
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
