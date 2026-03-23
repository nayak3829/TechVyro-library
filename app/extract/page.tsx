"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Search, Loader2, BookOpen, ChevronRight, Globe,
  AlertCircle, Zap, GraduationCap, FileText, Clock,
  Shield, Atom, Landmark, Train, Calculator, BookMarked, Users
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

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

interface Platform {
  name: string
  url: string
  desc: string
  category: string
  badge?: string
}

const CATEGORIES = [
  { id: "all", label: "All Platforms", icon: Globe },
  { id: "nda", label: "NDA / Defence", icon: Shield },
  { id: "jee-neet", label: "JEE / NEET", icon: Atom },
  { id: "upsc", label: "UPSC / IAS", icon: Landmark },
  { id: "ssc-banking", label: "SSC / Banking", icon: Calculator },
  { id: "railways", label: "Railways", icon: Train },
  { id: "teaching", label: "Teaching / CTET", icon: BookMarked },
  { id: "state", label: "State Exams", icon: Users },
]

const PLATFORMS: Platform[] = [
  // NDA / Defence
  { name: "CareerWill", url: "careerwill.com", desc: "Khan Sir — NDA, GK, Police, SSC", category: "nda", badge: "Popular" },
  { name: "NDA Cracker", url: "ndacracker.in", desc: "Dedicated NDA exam preparation", category: "nda" },
  { name: "SSB Crack", url: "ssbcrack.com", desc: "NDA, CDS & SSB Interview prep", category: "nda" },
  { name: "Sainik School", url: "sainikschoolprep.com", desc: "Sainik School entrance exam tests", category: "nda" },

  // JEE / NEET
  { name: "Dron Study", url: "dronstudy.com", desc: "JEE, NEET, CBSE video + tests", category: "jee-neet", badge: "Popular" },
  { name: "Physics Wallah", url: "physicswallah.live", desc: "JEE & NEET test series by PW", category: "jee-neet", badge: "Popular" },
  { name: "Etoos India", url: "etoosindia.com", desc: "JEE Main & Advanced tests", category: "jee-neet" },
  { name: "Aakash iTutor", url: "aakash.ac.in", desc: "NEET & JEE mock tests", category: "jee-neet" },
  { name: "Motion Education", url: "motioniitjee.com", desc: "IIT JEE preparation tests", category: "jee-neet" },

  // UPSC / IAS
  { name: "Vikas Ankur", url: "vikasankur.com", desc: "IAS/UPSC comprehensive test series", category: "upsc", badge: "Popular" },
  { name: "IAS Baba", url: "iasbaba.com", desc: "UPSC CSE prelims & mains tests", category: "upsc" },
  { name: "Forum IAS", url: "forumias.com", desc: "UPSC mock tests & current affairs", category: "upsc" },
  { name: "Insights IAS", url: "insightsonindia.com", desc: "UPSC prelims test series", category: "upsc" },

  // SSC / Banking
  { name: "ExamPur", url: "exampur.com", desc: "SSC, Railways, Banking full tests", category: "ssc-banking", badge: "Popular" },
  { name: "Adda247", url: "adda247.com", desc: "SSC, Banking, Insurance tests", category: "ssc-banking", badge: "Popular" },
  { name: "Mahendras", url: "mahendraguru.com", desc: "SSC CGL, CHSL, Banking mock tests", category: "ssc-banking" },
  { name: "Bankers Adda", url: "bankersadda.com", desc: "IBPS, SBI, RBI banking tests", category: "ssc-banking" },
  { name: "SSC Adda", url: "sscadda.com", desc: "SSC CGL, CHSL, MTS tests", category: "ssc-banking" },
  { name: "Oliveboard", url: "oliveboard.io", desc: "Banking, SSC, Railways mock tests", category: "ssc-banking" },
  { name: "Smart Keeda", url: "smartkeeda.com", desc: "Banking & Insurance test series", category: "ssc-banking" },
  { name: "Testbook", url: "testbook.com", desc: "All government exam mock tests", category: "ssc-banking", badge: "Popular" },
  { name: "Gradeup", url: "gradeup.co", desc: "Competitive exam preparation", category: "ssc-banking" },

  // Railways
  { name: "Railway Exam", url: "railwayexam.in", desc: "RRB NTPC, Group D, ALP tests", category: "railways" },
  { name: "ALP Mock Test", url: "alpmocktest.in", desc: "RRB ALP & Technician tests", category: "railways" },
  { name: "Railway Guru", url: "railwayguru.in", desc: "All RRB exam mock tests", category: "railways" },

  // Teaching / CTET
  { name: "CTET Prep", url: "ctetprep.com", desc: "CTET Paper 1 & 2 mock tests", category: "teaching" },
  { name: "Teaching Adda", url: "teachingadda.com", desc: "CTET, DSSSB, KVS, NVS tests", category: "teaching" },
  { name: "Super TET", url: "supertetonline.in", desc: "UP TET & Super TET tests", category: "teaching" },

  // State Exams
  { name: "Maha Sarathi", url: "mahasarathi.in", desc: "Maharashtra PSC & state tests", category: "state" },
  { name: "GK Guru", url: "gkguru.in", desc: "State GK & government job tests", category: "state" },
  { name: "UPPSC Prep", url: "uppscpaper.com", desc: "UP PSC & state exam tests", category: "state" },
]

export default function ExtractPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [testSeries, setTestSeries] = useState<TestSeries[]>([])
  const [apiBase, setApiBase] = useState("")
  const [webBase, setWebBase] = useState("")
  const [searched, setSearched] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")

  useEffect(() => {
    if (user) {
      fetch("/api/credits")
        .then(r => r.json())
        .then(d => { if (d.credits) return })
        .catch(() => {})
    }
  }, [user])

  const doExtract = async (targetUrl: string, platformName?: string) => {
    const cleanUrl = targetUrl.trim()
    if (!cleanUrl) return

    setLoading(true)
    if (platformName) setLoadingPlatform(platformName)
    setError("")
    setTestSeries([])
    setSearched(false)

    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(cleanUrl)}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || `Could not extract tests from ${cleanUrl}. This site may not be AppX-based.`)
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
      setLoadingPlatform(null)
    }
  }

  const handleSearch = () => doExtract(url)
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch() }

  const handlePlatformClick = (p: Platform) => {
    setUrl(p.url)
    doExtract(p.url, p.name)
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

  const filteredPlatforms = selectedCategory === "all"
    ? PLATFORMS
    : PLATFORMS.filter(p => p.category === selectedCategory)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-14 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-background to-blue-500/5" />
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-4">
              <Zap className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-medium text-violet-600 dark:text-violet-400">AppX Test Extractor</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
              Extract & Play Test Series
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Choose a platform below or enter any AppX-based website URL — instantly access their test series on TechVyro.
            </p>

            {/* Search Bar */}
            <div className="flex gap-2 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter custom URL e.g. parmaracademy.com"
                  className="pl-10 h-12 text-base"
                  disabled={loading}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || !url.trim()}
                size="lg"
                className="h-12 px-6 bg-violet-600 hover:bg-violet-700"
              >
                {loading && !loadingPlatform
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <Search className="h-5 w-5" />}
                <span className="ml-2">{loading && !loadingPlatform ? "Searching..." : "Extract"}</span>
              </Button>
            </div>
          </div>
        </section>

        {/* Notice (sample tests fallback) */}
        {notice && (
          <div className="max-w-3xl mx-auto px-4 mb-4">
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <Zap className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Showing Sample Tests</p>
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
                <p className="font-medium text-destructive">Extraction Failed</p>
                <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {searched && testSeries.length === 0 && !error && (
          <div className="max-w-2xl mx-auto px-4 text-center py-12">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">No Test Series Found</p>
            <p className="text-muted-foreground">This website may not support public test series extraction.</p>
          </div>
        )}

        {testSeries.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-violet-600" />
                Available Test Series
              </h2>
              <Badge variant="secondary">{testSeries.length} found</Badge>
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

        {/* Popular Platforms Section */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-violet-600" />
              Popular Platforms
            </h2>
            <p className="text-muted-foreground text-sm">Click any platform to instantly extract their test series — no URL needed</p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              const active = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-background border-border hover:border-violet-400 hover:text-violet-600"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Platforms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredPlatforms.map(platform => {
              const isLoading = loadingPlatform === platform.name && loading
              return (
                <button
                  key={platform.url}
                  onClick={() => handlePlatformClick(platform)}
                  disabled={loading}
                  className="group text-left p-4 rounded-xl border bg-card hover:border-violet-400 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm group-hover:text-violet-600 transition-colors">
                      {platform.name}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {platform.badge && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0">
                          {platform.badge}
                        </Badge>
                      )}
                      {isLoading
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{platform.desc}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{platform.url}</p>
                </button>
              )
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
