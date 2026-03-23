"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import {
  Search, Loader2, BookOpen, ChevronRight,
  Zap, GraduationCap, FileText, Clock, X, Star,
  Shield, Train, TrendingUp, Atom, Users, CheckCircle,
  ChevronDown, SlidersHorizontal, Award
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────
interface SearchResult {
  name: string
  api: string
  webBase: string
}

interface DisplaySeries {
  id: string
  title: string
  subtitle: string
  category: string
  examTags: string[]
  totalTests: number
  totalQuestions: number
  duration: string
  language: string
  slug: string
  sampleCategory: string
  color: string
  icon: string
  badge?: string
}

// ── Category config ────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",      label: "All Tests",   icon: "📚" },
  { id: "ssc",      label: "SSC",         icon: "📋" },
  { id: "banking",  label: "Banking",     icon: "🏦" },
  { id: "nda",      label: "NDA/Defence", icon: "🛡️" },
  { id: "railways", label: "Railways",    icon: "🚂" },
  { id: "upsc",     label: "UPSC",        icon: "⚖️" },
  { id: "jee",      label: "JEE/NEET",   icon: "⚛️" },
  { id: "teaching", label: "Teaching",    icon: "📖" },
]

const CAT_COLORS: Record<string, string> = {
  ssc:      "#3b82f6",
  banking:  "#10b981",
  nda:      "#ef4444",
  railways: "#f97316",
  upsc:     "#8b5cf6",
  jee:      "#06b6d4",
  teaching: "#ec4899",
}

// ── Featured series library ───────────────────────────────────────────────
const SERIES_LIBRARY: DisplaySeries[] = [
  // SSC
  {
    id: "ssc-cgl-1", title: "SSC CGL Full Mock Test Series", subtitle: "Complete prep for SSC CGL Tier 1 & 2",
    category: "ssc", examTags: ["SSC CGL", "Tier 1", "Tier 2"],
    totalTests: 25, totalQuestions: 375, duration: "60 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋",
  },
  {
    id: "ssc-chsl-1", title: "SSC CHSL Complete Practice Series", subtitle: "SSC CHSL Tier 1 Previous Year Papers",
    category: "ssc", examTags: ["SSC CHSL", "LDC", "DEO"],
    totalTests: 20, totalQuestions: 300, duration: "60 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋",
  },
  {
    id: "ssc-mts-1", title: "SSC MTS & Havaldar Series", subtitle: "SSC MTS Tier 1 practice papers with solutions",
    category: "ssc", examTags: ["SSC MTS", "Havaldar"],
    totalTests: 15, totalQuestions: 225, duration: "45 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋",
  },
  {
    id: "ssc-gd-1", title: "SSC GD Constable Mock Series", subtitle: "Full mock tests for SSC GD Constable exam",
    category: "ssc", examTags: ["SSC GD", "Constable"],
    totalTests: 18, totalQuestions: 360, duration: "60 min/test", language: "Hindi + English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#3b82f6", icon: "📋",
    badge: "HOT",
  },
  // Banking
  {
    id: "ibps-po-1", title: "IBPS PO Complete Mock Series", subtitle: "Prelims + Mains full mock tests",
    category: "banking", examTags: ["IBPS PO", "Prelims", "Mains"],
    totalTests: 30, totalQuestions: 450, duration: "60 min/test", language: "Hindi + English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦",
    badge: "POPULAR",
  },
  {
    id: "sbi-clerk-1", title: "SBI Clerk Prelims & Mains", subtitle: "Complete SBI Clerk preparation series",
    category: "banking", examTags: ["SBI Clerk", "Prelims", "Mains"],
    totalTests: 25, totalQuestions: 375, duration: "60 min/test", language: "Hindi + English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦",
  },
  {
    id: "ibps-rrb-1", title: "IBPS RRB Officer Scale I Series", subtitle: "RRB PO Prelims + Mains mock tests",
    category: "banking", examTags: ["IBPS RRB", "RRB PO"],
    totalTests: 20, totalQuestions: 300, duration: "45 min/test", language: "Hindi + English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦",
  },
  {
    id: "sbi-po-1", title: "SBI PO Mains Special Series", subtitle: "Data Analysis, English & Reasoning",
    category: "banking", examTags: ["SBI PO", "Mains"],
    totalTests: 15, totalQuestions: 300, duration: "180 min/test", language: "English",
    slug: "banking-reasoning-aptitude", sampleCategory: "ssc-banking",
    color: "#10b981", icon: "🏦",
  },
  // NDA/Defence
  {
    id: "nda-full-1", title: "NDA & NA Full Mock Test Series", subtitle: "Maths + GAT previous year mock tests",
    category: "nda", examTags: ["NDA", "NA", "Mathematics", "GAT"],
    totalTests: 20, totalQuestions: 600, duration: "150 min/test", language: "Hindi + English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️",
    badge: "POPULAR",
  },
  {
    id: "cds-1", title: "CDS Combined Defence Services", subtitle: "English + GK + Maths complete series",
    category: "nda", examTags: ["CDS", "IMA", "INA", "AFA"],
    totalTests: 18, totalQuestions: 360, duration: "120 min/test", language: "English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️",
  },
  {
    id: "afcat-1", title: "AFCAT Air Force Mock Series", subtitle: "AFCAT 1 & 2 complete preparation",
    category: "nda", examTags: ["AFCAT", "IAF", "Flying Branch"],
    totalTests: 15, totalQuestions: 300, duration: "120 min/test", language: "English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️",
  },
  {
    id: "capf-1", title: "CAPF Assistant Commandant Series", subtitle: "Paper I & Paper II mock tests",
    category: "nda", examTags: ["CAPF", "BSF", "CRPF", "CISF"],
    totalTests: 12, totalQuestions: 240, duration: "120 min/test", language: "English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#ef4444", icon: "🛡️",
  },
  // Railways
  {
    id: "rrb-ntpc-1", title: "RRB NTPC Complete Mock Series", subtitle: "CBT 1 & CBT 2 full practice tests",
    category: "railways", examTags: ["RRB NTPC", "CBT 1", "CBT 2"],
    totalTests: 25, totalQuestions: 375, duration: "90 min/test", language: "Hindi + English",
    slug: "rrb-ntpc-general-knowledge", sampleCategory: "railways",
    color: "#f97316", icon: "🚂",
    badge: "POPULAR",
  },
  {
    id: "rrb-group-d-1", title: "RRB Group D Full Mock Series", subtitle: "Complete CBT practice for Group D",
    category: "railways", examTags: ["RRB Group D", "CBT"],
    totalTests: 20, totalQuestions: 400, duration: "90 min/test", language: "Hindi + English",
    slug: "rrb-ntpc-general-knowledge", sampleCategory: "railways",
    color: "#f97316", icon: "🚂",
  },
  {
    id: "rrb-je-1", title: "RRB Junior Engineer Mock Tests", subtitle: "CBT 1 + CBT 2 engineering series",
    category: "railways", examTags: ["RRB JE", "Junior Engineer"],
    totalTests: 15, totalQuestions: 300, duration: "90 min/test", language: "Hindi + English",
    slug: "rrb-ntpc-general-knowledge", sampleCategory: "railways",
    color: "#f97316", icon: "🚂",
  },
  // UPSC
  {
    id: "upsc-prelims-1", title: "UPSC Prelims GS Paper I Series", subtitle: "History, Polity, Geography, Economy, Current Affairs",
    category: "upsc", examTags: ["UPSC CSE", "Prelims", "GS Paper 1"],
    totalTests: 30, totalQuestions: 600, duration: "120 min/test", language: "English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#8b5cf6", icon: "⚖️",
    badge: "POPULAR",
  },
  {
    id: "upsc-csat-1", title: "UPSC CSAT Paper II Complete Series", subtitle: "Aptitude, Comprehension & Basic Numeracy",
    category: "upsc", examTags: ["UPSC CSAT", "Paper 2", "Qualifying"],
    totalTests: 20, totalQuestions: 400, duration: "120 min/test", language: "English",
    slug: "ssc-cgl-general-knowledge", sampleCategory: "ssc-banking",
    color: "#8b5cf6", icon: "⚖️",
  },
  {
    id: "uppsc-1", title: "UPPSC PCS Prelims Mock Series", subtitle: "UP State PSC complete preparation",
    category: "upsc", examTags: ["UPPSC", "PCS", "UP State"],
    totalTests: 20, totalQuestions: 400, duration: "120 min/test", language: "Hindi + English",
    slug: "nda-general-knowledge", sampleCategory: "nda",
    color: "#8b5cf6", icon: "⚖️",
  },
  // JEE/NEET
  {
    id: "jee-main-1", title: "JEE Main Full Mock Test Series", subtitle: "Physics, Chemistry, Maths — Jan & Apr sessions",
    category: "jee", examTags: ["JEE Main", "Physics", "Chemistry", "Maths"],
    totalTests: 30, totalQuestions: 900, duration: "180 min/test", language: "English + Hindi",
    slug: "jee-physics-sample", sampleCategory: "jee-neet",
    color: "#06b6d4", icon: "⚛️",
    badge: "POPULAR",
  },
  {
    id: "neet-1", title: "NEET UG Complete Mock Series", subtitle: "Biology, Physics, Chemistry chapter-wise & full mocks",
    category: "jee", examTags: ["NEET", "Biology", "Physics", "Chemistry"],
    totalTests: 25, totalQuestions: 900, duration: "200 min/test", language: "English + Hindi",
    slug: "jee-physics-sample", sampleCategory: "jee-neet",
    color: "#06b6d4", icon: "⚛️",
    badge: "HOT",
  },
  {
    id: "jee-adv-1", title: "JEE Advanced Crash Course Series", subtitle: "Advanced level problems with video solutions",
    category: "jee", examTags: ["JEE Advanced", "IIT"],
    totalTests: 20, totalQuestions: 600, duration: "180 min/test", language: "English",
    slug: "jee-physics-sample", sampleCategory: "jee-neet",
    color: "#06b6d4", icon: "⚛️",
  },
  // Teaching
  {
    id: "ctet-1", title: "CTET Paper 1 Complete Mock Series", subtitle: "CDP, Maths, EVS, Language 1 & 2",
    category: "teaching", examTags: ["CTET", "Paper 1", "Primary"],
    totalTests: 20, totalQuestions: 300, duration: "150 min/test", language: "Hindi + English",
    slug: "ctet-paper-1-sample", sampleCategory: "teaching",
    color: "#ec4899", icon: "📖",
    badge: "POPULAR",
  },
  {
    id: "ctet-2-1", title: "CTET Paper 2 Mock Test Series", subtitle: "CDP + Language + Subject-specific tests",
    category: "teaching", examTags: ["CTET", "Paper 2", "Upper Primary"],
    totalTests: 18, totalQuestions: 270, duration: "150 min/test", language: "Hindi + English",
    slug: "ctet-paper-1-sample", sampleCategory: "teaching",
    color: "#ec4899", icon: "📖",
  },
  {
    id: "uptet-1", title: "UPTET Paper 1 & Paper 2 Series", subtitle: "Complete UP Teacher Eligibility Test prep",
    category: "teaching", examTags: ["UPTET", "UP State", "TET"],
    totalTests: 15, totalQuestions: 225, duration: "150 min/test", language: "Hindi",
    slug: "ctet-paper-1-sample", sampleCategory: "teaching",
    color: "#ec4899", icon: "📖",
  },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function ExtractPage() {
  const router = useRouter()
  const [selectedCat, setSelectedCat] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [platformQuery, setPlatformQuery] = useState("")
  const [platformResults, setPlatformResults] = useState<SearchResult[]>([])
  const [platformLoading, setPlatformLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [platformName, setPlatformName] = useState("")
  const [liveSeries, setLiveSeries] = useState<DisplaySeries[] | null>(null)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [showAll, setShowAll] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const searchPlatforms = useCallback(async (q: string) => {
    if (q.length < 2) { setPlatformResults([]); setShowDropdown(false); return }
    setPlatformLoading(true)
    try {
      const res = await fetch(`/api/extract/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setPlatformResults(data.results || [])
      setShowDropdown(true)
    } catch { setPlatformResults([]) }
    finally { setPlatformLoading(false) }
  }, [])

  const handlePlatformChange = (val: string) => {
    setPlatformQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlatforms(val), 300)
  }

  const loadPlatform = async (platform: SearchResult) => {
    setShowDropdown(false)
    setPlatformQuery(platform.name)
    setPlatformName(platform.name)
    setLoading(true)
    setError("")
    setNotice("")
    setLiveSeries(null)
    setSelectedCat("all")

    try {
      const params = new URLSearchParams({ apiUrl: platform.api, url: platform.webBase })
      const res = await fetch(`/api/extract?${params}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "Could not extract from this platform.")
        setLoading(false)
        return
      }

      const rawSeries = (data.testSeries || []) as Array<{ id?: string | number; title?: string; name?: string; slug?: string; description?: string; total_tests?: number }>
      if (data.source === "sample" || rawSeries.length === 0) {
        setNotice(`Live extraction unavailable for ${platform.name}. Showing practice tests.`)
        setLiveSeries(null)
      } else {
        const mapped: DisplaySeries[] = rawSeries.map((s, i) => ({
          id: String(s.id || i),
          title: s.title || s.name || `Test Series ${i + 1}`,
          subtitle: s.description || `Practice tests from ${platform.name}`,
          category: "all",
          examTags: [platform.name],
          totalTests: s.total_tests || 10,
          totalQuestions: (s.total_tests || 10) * 15,
          duration: "60 min/test",
          language: "Hindi + English",
          slug: s.slug || String(s.id || i),
          sampleCategory: "ssc-banking",
          color: "#8b5cf6",
          icon: "🎓",
          _raw: s,
          _apiBase: data.apiBase,
          _webBase: data.webBase,
        } as DisplaySeries & { _raw: typeof s; _apiBase: string; _webBase: string }))
        setLiveSeries(mapped)
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const goToSeries = (series: DisplaySeries & { _raw?: unknown; _apiBase?: string; _webBase?: string }) => {
    if (series._raw && series._apiBase) {
      const raw = series._raw as { id?: string | number; title?: string; name?: string; slug?: string }
      const slug = raw.slug || String(raw.id || "")
      const params = new URLSearchParams({
        slug,
        apiBase: series._apiBase!,
        webBase: series._webBase || "",
        title: raw.title || raw.name || series.title,
      })
      router.push(`/extract/series?${params.toString()}`)
    } else {
      const params = new URLSearchParams({
        slug: series.slug,
        apiBase: `sample:${series.sampleCategory}`,
        webBase: "",
        title: series.title,
      })
      router.push(`/extract/series?${params.toString()}`)
    }
  }

  const clearPlatform = () => {
    setPlatformQuery("")
    setPlatformName("")
    setPlatformResults([])
    setLiveSeries(null)
    setNotice("")
    setError("")
    setLoading(false)
  }

  // Determine which series to show
  const displaySeries: DisplaySeries[] = liveSeries || SERIES_LIBRARY

  const filtered = displaySeries.filter(s => {
    const catMatch = selectedCat === "all" || s.category === selectedCat
    const qMatch = !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.examTags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    return catMatch && qMatch
  })

  const visible = showAll ? filtered : filtered.slice(0, 12)
  const hasMore = filtered.length > 12 && !showAll

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="bg-gradient-to-br from-violet-600 to-blue-700 text-white py-10 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-semibold text-yellow-200 uppercase tracking-wider">AppX Test Extractor</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Free Mock Test Series</h1>
            <p className="text-violet-100 text-base mb-6 max-w-xl">
              Practice with 9,000+ coaching platform test series — SSC, Banking, NDA, Railways, UPSC, JEE/NEET & more
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-4 mb-6">
              {[
                { icon: BookOpen, label: "9,000+ Platforms" },
                { icon: FileText, label: "25+ Mock Series" },
                { icon: Users, label: "All Exams Covered" },
                { icon: CheckCircle, label: "Free Access" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-sm text-white/80">
                  <Icon className="h-4 w-4 text-yellow-300" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Platform search */}
            <div className="relative max-w-lg" ref={dropdownRef}>
              <div className="relative">
                {platformLoading
                  ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-violet-500" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                }
                <Input
                  value={platformQuery}
                  onChange={e => handlePlatformChange(e.target.value)}
                  onFocus={() => platformResults.length > 0 && setShowDropdown(true)}
                  placeholder="Search AppX platform e.g. CareerWill, Adda247..."
                  className="pl-10 pr-10 h-12 text-base bg-white text-gray-900 border-0 shadow-lg"
                  disabled={loading}
                  autoComplete="off"
                  suppressHydrationWarning
                />
                {platformQuery && (
                  <button onClick={clearPlatform} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {showDropdown && platformResults.length > 0 && !loading && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                  {platformResults.map((r, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-3 hover:bg-violet-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-3"
                      onClick={() => loadPlatform(r)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <GraduationCap className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.webBase.replace("https://", "")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && platformQuery.length >= 2 && platformResults.length === 0 && !platformLoading && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 px-4 py-3 text-sm text-gray-500">
                  No platforms found for &quot;{platformQuery}&quot;
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Notice / Error / Loading ── */}
        {(notice || error || loading) && (
          <div className="max-w-6xl mx-auto px-4 mt-4">
            {loading && (
              <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl p-4">
                <Loader2 className="h-5 w-5 text-violet-600 animate-spin flex-shrink-0" />
                <div>
                  <p className="font-semibold text-violet-700">Loading {platformName}...</p>
                  <p className="text-sm text-violet-600">Fetching test series from AppX platform</p>
                </div>
              </div>
            )}
            {notice && !loading && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <Zap className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-700">{notice}</p>
                  <p className="text-sm text-amber-600 mt-0.5">Browse our sample test series below</p>
                </div>
              </div>
            )}
            {error && !loading && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <Zap className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Platform header when live data loaded ── */}
        {platformName && liveSeries && (
          <div className="max-w-6xl mx-auto px-4 mt-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-violet-600" />
                {platformName} Test Series
              </h2>
              <p className="text-sm text-muted-foreground">{liveSeries.length} series found</p>
            </div>
            <button onClick={clearPlatform} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        )}

        {/* ── Main content ── */}
        <div className="max-w-6xl mx-auto px-4 py-6">

          {/* Search + Filter row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowAll(false) }}
                placeholder="Search test series, exam name..."
                className="pl-9 h-10"
                suppressHydrationWarning
                autoComplete="off"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground border border-border rounded-lg px-3 py-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span>{filtered.length} series</span>
            </div>
          </div>

          {/* Category tabs */}
          {!liveSeries && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCat(cat.id); setShowAll(false) }}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
                    selectedCat === cat.id
                      ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200"
                      : "bg-background text-foreground border-border hover:border-violet-400 hover:text-violet-600"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Series grid */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-semibold">No test series found</p>
              <p className="text-muted-foreground text-sm mt-1">Try a different category or search term</p>
            </div>
          )}

          {!loading && visible.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((series) => (
                <SeriesCard
                  key={series.id}
                  series={series}
                  onStart={() => goToSeries(series as DisplaySeries & { _raw?: unknown; _apiBase?: string; _webBase?: string })}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setShowAll(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-background hover:bg-muted/60 text-sm font-semibold transition-all hover:shadow-md"
              >
                <ChevronDown className="h-4 w-4" />
                Show all {filtered.length} series
              </button>
            </div>
          )}
        </div>

        {/* ── Popular Platforms Quick Access ── */}
        {!liveSeries && !platformName && (
          <section className="bg-muted/30 border-t border-border py-10 px-4 mt-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 mb-5">
                <Star className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold">Popular AppX Platforms</h2>
                <span className="ml-auto text-sm text-muted-foreground">2,421 platforms available</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  { label: "CareerWill", search: "Careerwill", color: "#ef4444" },
                  { label: "Physics Wallah", search: "Physicswallah", color: "#f97316" },
                  { label: "ExamPur", search: "Exampur", color: "#3b82f6" },
                  { label: "Adda247", search: "Adda247", color: "#10b981" },
                  { label: "Dron Study", search: "Dronstudy", color: "#8b5cf6" },
                  { label: "StudyIQ", search: "Studyiq", color: "#06b6d4" },
                  { label: "Mahendras", search: "Mahendra", color: "#ec4899" },
                  { label: "Khan GS", search: "Khangs", color: "#f59e0b" },
                  { label: "Padhle IAS", search: "Padhle", color: "#6366f1" },
                  { label: "Unacademy", search: "Unacademy", color: "#14b8a6" },
                  { label: "Testbook", search: "Testbook", color: "#3b82f6" },
                  { label: "Vivek Sir", search: "Vivek", color: "#ef4444" },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={async () => {
                      setPlatformQuery(p.label)
                      const res = await fetch(`/api/extract/search?q=${encodeURIComponent(p.search)}`)
                      const data = await res.json()
                      const first = data.results?.[0]
                      if (first) loadPlatform(first)
                    }}
                    disabled={loading}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-background hover:shadow-md transition-all text-left group hover:border-transparent"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.label[0]}
                    </div>
                    <span className="text-sm font-medium truncate group-hover:text-violet-600 transition-colors">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}

// ── Series Card (Testbook-like) ────────────────────────────────────────────
function SeriesCard({ series, onStart }: { series: DisplaySeries; onStart: () => void }) {
  const catColor = CAT_COLORS[series.category] || series.color || "#8b5cf6"
  const catIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    ssc: FileText, banking: TrendingUp, nda: Shield, railways: Train,
    upsc: Award, jee: Atom, teaching: BookOpen,
  }
  const CatIcon = catIcons[series.category] || GraduationCap

  return (
    <div className="group relative rounded-2xl border border-border bg-card hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Colored top strip */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${catColor}, ${catColor}88)` }} />

      <div className="p-5 flex-1 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ backgroundColor: `${catColor}18` }}
          >
            <CatIcon className="h-5 w-5" style={{ color: catColor }} />
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              FREE
            </span>
            {series.badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                series.badge === "HOT"
                  ? "bg-red-100 text-red-600 border-red-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}>
                {series.badge}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-violet-600 transition-colors">
            {series.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{series.subtitle}</p>
        </div>

        {/* Exam tags */}
        <div className="flex flex-wrap gap-1.5">
          {series.examTags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md border"
              style={{ color: catColor, backgroundColor: `${catColor}10`, borderColor: `${catColor}30` }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {series.totalTests} Tests
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {series.duration}
          </span>
          <span className="flex items-center gap-1 ml-auto text-[10px]">
            🌐 {series.language}
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${catColor}, ${catColor}cc)` }}
        >
          Attempt Now
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
