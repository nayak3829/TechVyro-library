"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search, Loader2, BookOpen, ChevronRight,
  AlertCircle, Zap, GraduationCap, FileText, Clock, X
} from "lucide-react"

interface TestSeries {
  id?: string | number
  title?: string
  name?: string
  slug?: string
  description?: string
  total_tests?: number
  image?: string
  thumbnail?: string
  subjects?: unknown[]
}

interface SearchResult {
  name: string
  api: string
  webBase: string
}

// Featured popular platforms: search tries appx.json first, sampleCategory is fallback
const FEATURED = [
  { label: "CareerWill", search: "Careerwill", sampleCategory: "nda" },
  { label: "Physics Wallah", search: "Physicswallah", sampleCategory: "jee-neet" },
  { label: "ExamPur", search: "Exampur", sampleCategory: "ssc-banking" },
  { label: "Adda247", search: "Adda247", sampleCategory: "ssc-banking" },
  { label: "Dron Study", search: "Dronstudy", sampleCategory: "jee-neet" },
  { label: "Vivek Sir", search: "Vivek", sampleCategory: "ssc-banking" },
  { label: "StudyIQ", search: "Studyiq", sampleCategory: "upsc" },
  { label: "Mahendras", search: "Mahendra", sampleCategory: "ssc-banking" },
  { label: "Khan GS", search: "Khangs", sampleCategory: "ssc-banking" },
  { label: "Padhle IAS", search: "Padhle", sampleCategory: "upsc" },
  { label: "Unacademy", search: "Unacademy", sampleCategory: "ssc-banking" },
  { label: "Testbook", search: "Testbook", sampleCategory: "ssc-banking" },
]

export default function ExtractPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [testSeries, setTestSeries] = useState<TestSeries[]>([])
  const [apiBase, setApiBase] = useState("")
  const [webBase, setWebBase] = useState("")
  const [searched, setSearched] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const searchPlatforms = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/extract/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data.results || [])
      setShowDropdown(true)
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlatforms(val), 300)
  }

  const doExtract = async (platform: SearchResult) => {
    setSelectedPlatform(platform)
    setShowDropdown(false)
    setQuery(platform.name)
    setLoading(true)
    setError("")
    setNotice("")
    setTestSeries([])
    setSearched(false)

    try {
      const params = new URLSearchParams({ apiUrl: platform.api, url: platform.webBase })
      const res = await fetch(`/api/extract?${params}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "Could not extract tests from this platform.")
        return
      }

      setTestSeries(data.testSeries || [])
      setApiBase(data.apiBase || "")
      setWebBase(data.webBase || "")
      setNotice(data.notice || "")
      setSearched(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFeatured = async (label: string, search: string, sampleCategory: string) => {
    setQuery(label)
    setError("")
    try {
      const res = await fetch(`/api/extract/search?q=${encodeURIComponent(search)}`)
      const data = await res.json()
      const first = data.results?.[0]
      if (first) {
        doExtract(first)
      } else {
        // Not in classx.co.in — load sample tests for the category
        doExtract({
          name: label,
          api: `sample:${sampleCategory}`,
          webBase: `https://${search.toLowerCase()}.classx.co.in`,
        })
      }
    } catch {
      setError("Network error. Please try again.")
    }
  }

  const goToSeries = (series: TestSeries) => {
    const slug = series.slug || String(series.id || "")
    const params = new URLSearchParams({
      slug,
      apiBase,
      webBase,
      title: series.title || series.name || "Test Series",
    })
    router.push(`/extract/series?${params.toString()}`)
  }

  const clearSearch = () => {
    setQuery("")
    setSearchResults([])
    setShowDropdown(false)
    setTestSeries([])
    setSearched(false)
    setError("")
    setNotice("")
    setSelectedPlatform(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-14 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-background to-blue-500/5" />
          <div className="relative max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-4">
              <Zap className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">AppX Test Extractor</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Extract & Play Test Series
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Search from 9,000+ coaching platforms — instantly access their full test series.
            </p>

            {/* Search */}
            <div className="relative max-w-xl mx-auto" ref={searchRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {searchLoading
                    ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-violet-500" />
                    : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  }
                  <Input
                    value={query}
                    onChange={e => handleQueryChange(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                    placeholder="Search platform e.g. CareerWill, Adda247..."
                    className="pl-10 pr-10 h-12 text-base"
                    disabled={loading}
                    autoComplete="off"
                    suppressHydrationWarning
                  />
                  {query && (
                    <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {loading && (
                  <Button disabled size="lg" className="h-12 px-5 bg-violet-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </Button>
                )}
              </div>

              {/* Dropdown results */}
              {showDropdown && searchResults.length > 0 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-3 hover:bg-violet-500/10 transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
                      onClick={() => doExtract(r)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.webBase.replace("https://", "")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && query.length >= 2 && searchResults.length === 0 && !searchLoading && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-xl z-50 px-4 py-3 text-sm text-muted-foreground">
                  No platforms found for &quot;{query}&quot;
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Notice */}
        {notice && (
          <div className="max-w-3xl mx-auto px-4 mb-4">
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <Zap className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Sample Practice Tests</p>
                <p className="text-sm text-muted-foreground mt-0.5">{notice}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-3xl mx-auto px-4 mb-6">
            <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-destructive">Could Not Load</p>
                <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="max-w-2xl mx-auto px-4 text-center py-12">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-violet-600 mb-4" />
            <p className="font-medium">Loading test series from {selectedPlatform?.name}...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Results */}
        {!loading && searched && testSeries.length === 0 && !error && (
          <div className="max-w-2xl mx-auto px-4 text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No Test Series Found</p>
            <p className="text-muted-foreground">Try another platform.</p>
          </div>
        )}

        {!loading && testSeries.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-violet-600" />
                  {selectedPlatform?.name || "Available"} Test Series
                </h2>
                {notice && <p className="text-sm text-amber-600 mt-1">Showing sample practice tests</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{testSeries.length} series</Badge>
                <Button variant="outline" size="sm" onClick={clearSearch}>
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testSeries.map((series, idx) => {
                const title = series.title || series.name || `Test Series ${idx + 1}`
                const totalTests = series.total_tests ?? (Array.isArray(series.subjects) ? series.subjects.length : null)
                const thumbnail = series.image || series.thumbnail
                return (
                  <Card
                    key={series.id || idx}
                    className="group p-5 cursor-pointer hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-200"
                    onClick={() => goToSeries(series)}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-36 object-cover rounded-lg mb-3"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    ) : (
                      <div className="w-full h-36 rounded-lg mb-3 bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center">
                        <FileText className="h-12 w-12 text-violet-400" />
                      </div>
                    )}
                    <h3 className="font-semibold text-base line-clamp-2 group-hover:text-violet-600 transition-colors mb-2">{title}</h3>
                    {series.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{series.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {totalTests !== null && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />{totalTests} tests
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center text-violet-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        View <ChevronRight className="h-4 w-4 ml-0.5" />
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* Featured Platforms (shown when not searching) */}
        {!searched && !loading && (
          <section className="max-w-5xl mx-auto px-4 pb-16">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="h-5 w-5 text-violet-600" />
              <h2 className="text-xl font-bold">Popular Platforms</h2>
              <Badge variant="secondary" className="ml-auto">Click to load</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {FEATURED.map(f => (
                <button
                  key={f.label}
                  onClick={() => handleFeatured(f.label, f.search, f.sampleCategory)}
                  disabled={loading}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-violet-400 hover:bg-violet-500/5 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-5 w-5 text-violet-600" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-violet-600 transition-colors">{f.label}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              9,000+ platforms available — just search by name above
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
