"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Clock, FileText, Play, ArrowRight, Zap, Target, 
  BookOpen, Shield, Train, TrendingUp, Atom,
  GraduationCap, Loader2, Lock, Globe, Brain
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

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

// Fallback data when API fails
const FALLBACK_SERIES: TestSeries[] = [
  {
    id: "ssc-cgl-1", title: "SSC CGL Full Mock Test", slug: "ssc-cgl-general-knowledge",
    description: "Complete SSC CGL preparation with practice tests",
    total_tests: 25, total_questions: 375, duration: 60, is_free: true, category: "ssc", isSample: true
  },
  {
    id: "ibps-po-1", title: "IBPS PO Complete Series", slug: "banking-reasoning-aptitude",
    description: "Banking exam preparation with reasoning & aptitude",
    total_tests: 30, total_questions: 450, duration: 60, is_free: true, category: "banking", isSample: true
  },
  {
    id: "nda-full-1", title: "NDA & NA Mock Test Series", slug: "nda-general-knowledge",
    description: "Defence exam preparation for NDA aspirants",
    total_tests: 20, total_questions: 600, duration: 150, is_free: true, category: "defence", isSample: true
  },
  {
    id: "rrb-ntpc-1", title: "RRB NTPC Complete Series", slug: "rrb-ntpc-general-knowledge",
    description: "Railway exam preparation with full test series",
    total_tests: 25, total_questions: 375, duration: 90, is_free: true, category: "railways", isSample: true
  },
]

const getCategoryColor = (category: string): string => {
  const cat = CATEGORIES.find(c => c.id === category || c.label.toLowerCase() === category?.toLowerCase())
  return cat?.color || "#6366f1"
}

const getCategoryIcon = (category: string) => {
  const cat = CATEGORIES.find(c => c.id === category || c.label.toLowerCase() === category?.toLowerCase())
  return cat?.icon || GraduationCap
}

export function TestSeriesSection() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [testSeries, setTestSeries] = useState<TestSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})

  const fetchTestSeries = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch ALL test series from all platforms
      const res = await fetch(`/api/extract?bulk=true&category=all`)
      const data = await res.json()
      
      if (data.success && data.testSeries?.length > 0) {
        // Get unique categories and count series per category
        const counts: Record<string, number> = {}
        const allSeries = data.testSeries as TestSeries[]
        
        for (const series of allSeries) {
          const cat = series.category || "general"
          counts[cat] = (counts[cat] || 0) + 1
        }
        
        // Take top 8 series for home page (mix of live and sample)
        const liveSeries = allSeries.filter((s: TestSeries) => !s.isSample).slice(0, 6)
        const sampleSeries = allSeries.filter((s: TestSeries) => s.isSample).slice(0, 2)
        
        setTestSeries([...liveSeries, ...sampleSeries].slice(0, 8))
        setCategoryCounts(counts)
      } else {
        // Use fallback if no data
        setTestSeries(FALLBACK_SERIES)
        setCategoryCounts({ ssc: 6, banking: 7, defence: 5, railways: 4, upsc: 4, "jee-neet": 3 })
      }
    } catch (err) {
      console.error("[v0] Error fetching test series for home:", err)
      setTestSeries(FALLBACK_SERIES)
      setCategoryCounts({ ssc: 6, banking: 7, defence: 5, railways: 4, upsc: 4, "jee-neet": 3 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTestSeries()
  }, [fetchTestSeries])

  const handleStartSeries = (series: TestSeries) => {
    const params = new URLSearchParams({
      slug: series.slug || series.id,
      apiBase: series._sourceApi || `sample:${series.category}`,
      webBase: series._sourceWeb || "",
      title: series.title,
    })
    router.push(`/test-series/series?${params}`)
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-3 sm:mb-4 bg-violet-500/10 text-violet-600 border-violet-500/20 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Mock Tests
          </Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2 sm:mb-3 text-balance">
            Practice Mock Tests
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md sm:max-w-xl mx-auto px-2">
            Free unlimited mock tests for all competitive exams - SSC, Banking, NDA, Railways & more
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const count = categoryCounts[cat.id] || 0
            return (
              <Link
                key={cat.id}
                href={`/test-series?category=${cat.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm shrink-0"
                style={{ 
                  backgroundColor: `${cat.color}10`, 
                  borderColor: `${cat.color}30`,
                  color: cat.color 
                }}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
                {count > 0 && <span className="text-[10px] opacity-70">({count}+)</span>}
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
              
              return (
                <Card 
                  key={series.id || idx}
                  className="group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/50 hover:border-violet-400/40 flex flex-col"
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
                          className="text-[9px] sm:text-[10px] text-white py-0.5 px-1.5"
                          style={{ backgroundColor: color }}
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
                    <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-violet-600 transition-colors mb-1">
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
                    
                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 mt-auto">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>{series.total_tests || 10} Tests</span>
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
                      className="w-full h-8 sm:h-9 text-[11px] sm:text-xs bg-violet-600 hover:bg-violet-700 gap-1"
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
