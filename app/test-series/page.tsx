"use client"

import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import { AuthModal } from "@/components/auth-modal"
import {
  Search, X, FileText, Clock, Play, Loader2, Lock, ChevronDown,
  Target, TrendingUp, Shield, Train, BookOpen, Atom, GraduationCap, Globe
} from "lucide-react"

interface TestSeries {
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

const CATEGORIES = [
  { id: "all", label: "All", icon: Globe, color: "#6366f1" },
  { id: "ssc", label: "SSC", icon: Target, color: "#3b82f6" },
  { id: "banking", label: "Banking", icon: TrendingUp, color: "#10b981" },
  { id: "defence", label: "Defence", icon: Shield, color: "#ef4444" },
  { id: "railways", label: "Railways", icon: Train, color: "#f97316" },
  { id: "upsc", label: "UPSC", icon: BookOpen, color: "#8b5cf6" },
  { id: "jee-neet", label: "JEE/NEET", icon: Atom, color: "#06b6d4" },
]

function getCategoryColor(category: string): string {
  const cat = CATEGORIES.find(c => c.id === category)
  return cat?.color || "#6366f1"
}

function getCategoryIcon(category: string) {
  const cat = CATEGORIES.find(c => c.id === category)
  return cat?.icon || GraduationCap
}

export default function TestSeriesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [testSeries, setTestSeries] = useState<TestSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [fetchError, setFetchError] = useState("")
  const [showAuthModal, setShowAuthModal] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Get initial category from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cat = params.get("category")
    if (cat && CATEGORIES.some(c => c.id === cat)) {
      setSelectedCategory(cat)
    }
  }, [])

  const fetchTestSeries = useCallback(async (category: string) => {
    setLoading(true)
    setFetchError("")
    
    try {
      const cat = category === "all" ? "ssc" : category
      const res = await fetch(`/api/extract?bulk=true&category=${cat}`)
      const data = await res.json()
      
      if (data.success && data.testSeries?.length > 0) {
        setTestSeries(data.testSeries.map((s: TestSeries, idx: number) => ({
          ...s,
          id: s.id || `series-${idx}`,
          category: s.category || cat,
        })))
        setFetchError("")
      } else {
        setTestSeries([])
        setFetchError(data.notice || "No test series found")
      }
    } catch (err) {
      console.error("Error fetching test series:", err)
      setFetchError("Could not load tests")
      setTestSeries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTestSeries(selectedCategory)
  }, [selectedCategory, fetchTestSeries])

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId)
    setSearch("")
    router.push(`/test-series?category=${catId}`, { scroll: false })
  }

  const filteredSeries = useMemo(() => {
    if (!search.trim()) return testSeries
    const q = search.toLowerCase()
    return testSeries.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    )
  }, [testSeries, search])

  const handleStartSeries = (series: TestSeries) => {
    if (!series.isSample && !user && !authLoading) {
      setShowAuthModal(true)
      return
    }
    const params = new URLSearchParams({
      slug: series.slug || series.id,
      apiBase: series._sourceApi || `sample:${series.category}`,
      webBase: series._sourceWeb || "",
      title: series.title,
    })
    router.push(`/test-series/series?${params}`)
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mock Tests</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Practice with {testSeries.length}+ test series
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                <Globe className="h-3 w-3 mr-1" />
                APX Live
              </Badge>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                placeholder="Search test series..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-9 h-10 text-sm bg-muted/30 border-border/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {CATEGORIES.map(cat => {
                const Icon = cat.icon
                const isActive = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all shrink-0 ${
                      isActive
                        ? "text-white border-transparent shadow-md"
                        : "bg-background border-border/50 text-foreground hover:border-border"
                    }`}
                    style={isActive ? { backgroundColor: cat.color } : {}}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-9 w-full mt-4 rounded-lg" />
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && fetchError && testSeries.length === 0 && (
          <div className="text-center py-12">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{fetchError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fetchTestSeries(selectedCategory)}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Test Series Grid */}
        {!loading && filteredSeries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSeries.map((series, idx) => {
              const color = getCategoryColor(series.category || "ssc")
              const Icon = getCategoryIcon(series.category || "ssc")

              return (
                <Card
                  key={series.id || idx}
                  className="group overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-border/50 hover:border-violet-400/40"
                >
                  <div className="p-4">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="h-6 w-6" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-violet-600 transition-colors">
                          {series.title}
                        </h3>
                        {series._platformName && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {series._platformName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {series.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {series.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-4">
                      {series.total_tests && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{series.total_tests} Tests</span>
                        </div>
                      )}
                      {series.duration && series.duration > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{series.duration} min</span>
                        </div>
                      )}
                      {series.isSample && (
                        <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                          SAMPLE
                        </Badge>
                      )}
                    </div>

                    {/* CTA */}
                    <Button
                      onClick={() => handleStartSeries(series)}
                      size="sm"
                      className="w-full h-9 text-xs bg-violet-600 hover:bg-violet-700 gap-1.5"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Now
                      {!series.isSample && !user && !authLoading && (
                        <Lock className="h-3 w-3 ml-0.5 opacity-70" />
                      )}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* No Results */}
        {!loading && search && filteredSeries.length === 0 && testSeries.length > 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No results for "{search}"</p>
            <Button variant="link" size="sm" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title="Login Required"
        description="Please login to access this test series"
      />
    </div>
  )
}
