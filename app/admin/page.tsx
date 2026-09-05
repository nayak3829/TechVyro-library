"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ArrowLeft, Plus, Upload, FolderPlus, Trash2, FileText, LogOut,
  BarChart3, RefreshCw, Settings, Database, Loader2, MessageSquare,
  TrendingUp, Download, Eye, Star, Clock, Users, Zap, HardDrive,
  Activity, AlertCircle, Home, History, Menu, X, ChevronRight,
  BookOpen, Layers, Shield, Bell, Search, Moon, Sun, CheckCircle2,
  AlertTriangle, Info, ArrowUpRight, ArrowDownRight, Minus, Wand2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import type { Category, PDF } from "@/lib/types"

const PDFUploadForm = dynamic(() => import("@/components/admin/pdf-upload-form").then(m => ({ default: m.PDFUploadForm })), {
  loading: () => <ComponentLoader text="Loading uploader..." />,
})
const CategoryManager = dynamic(() => import("@/components/admin/category-manager").then(m => ({ default: m.CategoryManager })), {
  loading: () => <ComponentLoader text="Loading categories..." />,
})
const PDFList = dynamic(() => import("@/components/admin/pdf-list").then(m => ({ default: m.PDFList })), {
  loading: () => <ComponentLoader text="Loading PDFs..." />,
})
const AnalyticsDashboard = dynamic(() => import("@/components/admin/analytics-dashboard").then(m => ({ default: m.AnalyticsDashboard })), {
  loading: () => <ComponentLoader text="Loading analytics..." />,
})
const ReviewsManager = dynamic(() => import("@/components/admin/reviews-manager").then(m => ({ default: m.ReviewsManager })), {
  loading: () => <ComponentLoader text="Loading reviews..." />,
})
const SiteSettings = dynamic(() => import("@/components/admin/site-settings").then(m => ({ default: m.SiteSettings })), {
  loading: () => <ComponentLoader text="Loading settings..." />,
})
const ActivityLog = dynamic(() => import("@/components/admin/activity-log").then(m => ({ default: m.ActivityLog })), {
  loading: () => <ComponentLoader text="Loading activity log..." />,
})
const HomepageManager = dynamic(() => import("@/components/admin/homepage-manager").then(m => ({ default: m.HomepageManager })), {
  loading: () => <ComponentLoader text="Loading homepage manager..." />,
})
const FolderManager = dynamic(() => import("@/components/admin/folder-manager").then(m => ({ default: m.FolderManager })), {
  loading: () => <ComponentLoader text="Loading folder manager..." />,
})
const QuizManager = dynamic(() => import("@/components/admin/quiz-manager").then(m => ({ default: m.QuizManager })), {
  loading: () => <ComponentLoader text="Loading quiz manager..." />,
})
const ToolsManager = dynamic(() => import("@/components/admin/tools-manager").then(m => ({ default: m.ToolsManager })), {
  loading: () => <ComponentLoader text="Loading power tools..." />,
})

function ComponentLoader({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Activity, group: "main" },
  { id: "pdfs", label: "PDF Manager", icon: FileText, group: "content" },
  { id: "structure", label: "Structure", icon: Layers, group: "content" },
  { id: "categories", label: "Categories", icon: Database, group: "content" },
  { id: "quizzes", label: "Quizzes", icon: Zap, group: "content" },
  { id: "tools", label: "Power Tools", icon: Wand2, group: "content" },
  { id: "reviews", label: "Reviews", icon: MessageSquare, group: "engagement" },
  { id: "homepage", label: "Homepage", icon: Home, group: "engagement" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "insights" },
  { id: "activity", label: "Activity Log", icon: History, group: "insights" },
  { id: "settings", label: "Settings", icon: Settings, group: "system" },
]

const GROUP_LABELS: Record<string, string> = {
  main: "Main",
  content: "Content",
  engagement: "Engagement",
  insights: "Insights",
  system: "System",
}

type RequestHealth = "pending" | "operational" | "degraded"

function numberOrZero(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [quizCount, setQuizCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [pdfSubTab, setPdfSubTab] = useState<"import" | "library">("import")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [requestHealth, setRequestHealth] = useState<Record<"categories" | "pdfs" | "stats", RequestHealth>>({
    categories: "pending",
    pdfs: "pending",
    stats: "pending",
  })

  const fetchData = useCallback(async () => {
    const requests = [
      { key: "categories" as const, url: "/api/categories", validate: (data: unknown) => isRecord(data) && Array.isArray(data.categories) && data.categories.every(isRecord), apply: (data: { categories: Category[] }) => setCategories(data.categories) },
      { key: "pdfs" as const, url: "/api/pdfs", validate: (data: unknown) => isRecord(data) && Array.isArray(data.pdfs) && data.pdfs.every(isRecord), apply: (data: { pdfs: PDF[] }) => setPdfs(data.pdfs) },
      { key: "stats" as const, url: "/api/stats/summary", validate: (data: unknown) => isRecord(data) && "totalQuizzes" in data && (typeof data.totalQuizzes === "number" || (typeof data.totalQuizzes === "string" && data.totalQuizzes.trim() !== "")) && Number.isFinite(Number(data.totalQuizzes)) && Number(data.totalQuizzes) >= 0, apply: (data: { totalQuizzes?: unknown }) => setQuizCount(numberOrZero(data.totalQuizzes)) },
    ]

    const results = await Promise.all(requests.map(async (request) => {
      try {
        const response = await fetch(request.url)
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
        const data: unknown = await response.json()
        if (!request.validate(data)) throw new Error("Unexpected response format")
        request.apply(data as never)
        return { key: request.key, ok: true }
      } catch {
        return { key: request.key, ok: false }
      }
    }))

    const nextHealth = results.reduce((health, result) => {
      health[result.key] = result.ok ? "operational" : "degraded"
      return health
    }, {} as Record<"categories" | "pdfs" | "stats", RequestHealth>)
    setRequestHealth(nextHealth)
    const failedRequests = results.filter(result => !result.ok)
    if (failedRequests.length === 0) {
      setLoadError(null)
      setLastRefreshed(new Date())
    } else {
      setLoadError(`Unable to load ${failedRequests.map(result => result.key === "stats" ? "quiz statistics" : result.key).join(", ")}. Please try again.`)
    }
    setLoading(false)
    setRefreshing(false)
    return failedRequests.length === 0
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const setSectionFromHash = () => {
      const [section, subTab] = window.location.hash.slice(1).split("/")
      const validSection = NAV_ITEMS.some(item => item.id === section) ? section : "overview"
      setActiveTab(validSection)
      if (validSection === "pdfs" && (subTab === "import" || subTab === "library")) {
        setPdfSubTab(subTab)
      }
      if (section !== validSection) {
        window.history.replaceState(null, "", `#${validSection}`)
      }
    }
    setSectionFromHash()
    window.addEventListener("hashchange", setSectionFromHash)
    window.addEventListener("popstate", setSectionFromHash)
    return () => {
      window.removeEventListener("hashchange", setSectionFromHash)
      window.removeEventListener("popstate", setSectionFromHash)
    }
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false)
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [sidebarOpen])

  useEffect(() => {
    const autoRefresh = setInterval(() => {
      fetchData()
    }, 5 * 60 * 1000)
    return () => clearInterval(autoRefresh)
  }, [fetchData])

  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    const succeeded = await fetchData()
    if (succeeded) toast.success("Data refreshed!")
  }

  async function handleLogout() {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch("/api/admin/logout", { method: "POST" })
        if (response.ok) {
          window.location.assign("/admin")
          return
        }
      } catch {
        // Retry once for an interrupted request so the HttpOnly cookie is cleared.
      }
      if (attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 1500))
    }
    toast.error("Could not log out. Please check your connection and try again.")
  }

  function navigate(tab: string, pdfSub?: "import" | "library") {
    // "upload" is now unified inside "pdfs" PDF Manager
    const nextTab = tab === "upload" ? "pdfs" : tab
    const nextPdfSubTab = tab === "upload" ? "import" : pdfSub
    setActiveTab(nextTab)
    if (nextTab === "pdfs" && nextPdfSubTab) setPdfSubTab(nextPdfSubTab)
    window.location.hash = nextTab === "pdfs" && nextPdfSubTab ? `pdfs/${nextPdfSubTab}` : nextTab
    setSidebarOpen(false)
  }

  const normalizedPdfs = pdfs.map(pdf => ({ ...pdf, view_count: numberOrZero(pdf.view_count), download_count: numberOrZero(pdf.download_count), file_size: numberOrZero(pdf.file_size), review_count: numberOrZero(pdf.review_count), average_rating: numberOrZero(pdf.average_rating) }))
  const totalViews = normalizedPdfs.reduce((sum, p) => sum + p.view_count, 0)
  const totalDownloads = normalizedPdfs.reduce((sum, p) => sum + p.download_count, 0)
  const totalStorage = normalizedPdfs.reduce((sum, p) => sum + p.file_size, 0)
  const totalReviews = normalizedPdfs.reduce((sum, p) => sum + p.review_count, 0)
  const ratedPdfs = normalizedPdfs.filter(p => p.average_rating > 0)
  const avgRating = ratedPdfs.length > 0
    ? ratedPdfs.reduce((sum, p) => sum + p.average_rating, 0) / ratedPdfs.length
    : 0
  const engagementRate = totalViews > 0 ? (totalDownloads / totalViews) * 100 : 0

  const recentPdfs = normalizedPdfs.filter(pdf => {
    const uploadDate = new Date(pdf.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return uploadDate >= weekAgo
  })

  function formatBytes(bytes: number) {
    bytes = numberOrZero(bytes)
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  function getGreeting() {
    if (!currentTime) return "Welcome"
    const h = currentTime.getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }

  const activeNavItem = NAV_ITEMS.find(n => n.id === activeTab)
  const groups = [...new Set(NAV_ITEMS.map(n => n.group))]
  const allRequestsOperational = Object.values(requestHealth).every(status => status === "operational")

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-navigation"
        aria-label="Admin navigation"
        className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-background border-r border-border/60 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0 lg:z-auto lg:flex lg:shrink-0
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">Admin Panel</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">TechVyro Library</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(false)} aria-label="Close navigation menu">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {groups.map(group => {
            const items = NAV_ITEMS.filter(n => n.group === group)
            return (
              <div key={group}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1.5">
                  {GROUP_LABELS[group]}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                          ${isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }
                        `}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.id === "pdfs" && pdfs.length > 0 && (
                          <Badge className={`text-[10px] h-4 px-1.5 ${isActive ? "bg-white/20 text-white border-0" : "bg-primary/10 text-primary border-0"}`}>
                            {pdfs.length}
                          </Badge>
                        )}
                        {item.id === "categories" && categories.length > 0 && (
                          <Badge className={`text-[10px] h-4 px-1.5 ${isActive ? "bg-white/20 text-white border-0" : "bg-accent/10 text-accent border-0"}`}>
                            {categories.length}
                          </Badge>
                        )}
                        {item.id === "reviews" && totalReviews > 0 && (
                          <Badge className={`text-[10px] h-4 px-1.5 ${isActive ? "bg-white/20 text-white border-0" : "bg-green-500/10 text-green-600 border-0"}`}>
                            {totalReviews}
                          </Badge>
                        )}
                        {item.id === "quizzes" && quizCount > 0 && (
                          <Badge className={`text-[10px] h-4 px-1.5 ${isActive ? "bg-white/20 text-white border-0" : "bg-amber-500/10 text-amber-600 border-0"}`}>
                            {quizCount}
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1.5">Community</p>
            <Link href="/admin/submissions" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted">
              <FileText className="h-4 w-4 shrink-0" /><span>Submissions</span>
            </Link>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/60 space-y-2 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Library
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur-xl border-b border-border/60 flex items-center px-4 gap-4 shrink-0">
          {/* Mobile menu toggle */}
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu" aria-expanded={sidebarOpen} aria-controls="admin-navigation">
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-muted-foreground hidden sm:inline">Admin</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 hidden sm:inline" />
            <span className="font-semibold text-foreground truncate">
              {activeNavItem?.label || "Overview"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${allRequestsOperational ? "bg-green-500 animate-pulse" : "bg-amber-500"}`} />
              {allRequestsOperational ? "Synced" : "Sync issue"} · {lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not synced"}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-9 px-3 gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline text-sm">Refresh</span>
            </Button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loadError && (
            <div role="alert" className="max-w-7xl mx-auto mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loadError}</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing} className="shrink-0 gap-2">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Retry
              </Button>
            </div>
          )}
          {/* ── Overview ── */}
          {activeTab === "overview" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Greeting */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">{getGreeting()}, Admin</h1>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {currentTime
                      ? currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                      : "\u00A0"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => navigate("upload")} className="gap-2">
                    <Upload className="h-3.5 w-3.5" />
                    Upload PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("analytics")} className="gap-2">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Analytics
                  </Button>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                <StatCard label="Total PDFs" value={pdfs.length} icon={FileText} color="violet" onClick={() => navigate("pdfs")} />
                <StatCard label="Categories" value={categories.length} icon={Database} color="blue" onClick={() => navigate("categories")} />
                <StatCard label="Quizzes" value={quizCount} icon={Zap} color="amber" onClick={() => navigate("quizzes")} />
                <StatCard label="Total Views" value={totalViews} icon={Eye} color="green" />
                <StatCard label="Downloads" value={totalDownloads} icon={Download} color="pink" />
                <StatCard label="Storage" value={formatBytes(totalStorage)} icon={HardDrive} color="slate" isString />
              </div>

              {/* 3-col row */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Quick Actions */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Quick Actions
                    </CardTitle>
                    <CardDescription>Jump to common tasks</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Link href="/admin/submissions" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-left group">
                      <FileText className="h-4 w-4 text-primary shrink-0" /><span className="flex-1">Moderate Submissions</span><ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    {[
                      { label: "Upload New PDF", icon: Upload, tab: "upload", color: "text-primary" },
                      { label: "Add Category", icon: FolderPlus, tab: "categories", color: "text-accent" },
                      { label: "Manage Quizzes", icon: Zap, tab: "quizzes", color: "text-amber-500" },
                      { label: "Power Tools (AI)", icon: Wand2, tab: "tools", color: "text-violet-500" },
                      { label: "Moderate Reviews", icon: MessageSquare, tab: "reviews", color: "text-green-500" },
                      { label: "View Analytics", icon: BarChart3, tab: "analytics", color: "text-blue-500" },
                      { label: "Site Settings", icon: Settings, tab: "settings", color: "text-purple-500" },
                    ].map(({ label, icon: Icon, tab, color }) => (
                      <button
                        key={tab}
                        onClick={() => navigate(tab)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors text-left group"
                      >
                        <Icon className={`h-4 w-4 ${color} shrink-0`} />
                        <span className="flex-1">{label}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </CardContent>
                </Card>

                {/* Performance KPIs */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Performance
                    </CardTitle>
                    <CardDescription>Key metrics at a glance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <KpiRow
                      label="Engagement Rate"
                      value={`${engagementRate.toFixed(1)}%`}
                      progress={Math.min(engagementRate, 100)}
                      status={engagementRate > 30 ? "good" : engagementRate > 10 ? "warn" : "low"}
                    />
                    <KpiRow
                      label="Avg Rating"
                      value={avgRating > 0 ? `${avgRating.toFixed(1)} ★` : "No data"}
                      progress={avgRating * 20}
                      status={avgRating >= 4 ? "good" : avgRating >= 3 ? "warn" : "low"}
                    />
                    <KpiRow
                      label="Category Coverage"
                      value={pdfs.length > 0 ? `${Math.round((pdfs.filter(p => p.category_id).length / pdfs.length) * 100)}%` : "0%"}
                      progress={pdfs.length > 0 ? (pdfs.filter(p => p.category_id).length / pdfs.length) * 100 : 0}
                      status={pdfs.length > 0 && (pdfs.filter(p => p.category_id).length / pdfs.length) > 0.8 ? "good" : "warn"}
                    />
                    <KpiRow
                      label="Avg Downloads/PDF"
                      value={pdfs.length > 0 ? `${Math.round(totalDownloads / pdfs.length)}` : "0"}
                      progress={Math.min((totalDownloads / Math.max(pdfs.length, 1)) / 10, 100)}
                      status="good"
                    />
                  </CardContent>
                </Card>

                {/* Recent Uploads */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Recent Uploads
                      </CardTitle>
                      {recentPdfs.length > 0 && (
                        <Badge variant="secondary" className="text-xs">{recentPdfs.length} this week</Badge>
                      )}
                    </div>
                    <CardDescription>PDFs added in the last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentPdfs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">No recent uploads</p>
                        <Button size="sm" variant="outline" className="mt-3 gap-2" onClick={() => navigate("upload")}>
                          <Upload className="h-3.5 w-3.5" /> Upload now
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentPdfs.slice(0, 5).map((pdf) => (
                          <div key={pdf.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{pdf.title}</p>
                              <p className="text-xs text-muted-foreground">{new Date(pdf.created_at).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] h-5 shrink-0 border-green-500/30 text-green-600">New</Badge>
                          </div>
                        ))}
                        {recentPdfs.length > 5 && (
                          <Button variant="ghost" className="w-full text-xs h-8" onClick={() => navigate("pdfs")}>
                            +{recentPdfs.length - 5} more — View all
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top PDFs + System Status */}
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Top Performing PDFs */}
                <Card className="lg:col-span-2 border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Top Performing PDFs
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={() => navigate("pdfs")}>
                        View all <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                    <CardDescription>Ranked by download count</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pdfs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <BookOpen className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">No PDFs uploaded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[...normalizedPdfs]
                          .sort((a, b) => b.download_count - a.download_count)
                          .slice(0, 6)
                          .map((pdf, index) => {
                            const category = categories.find(c => c.id === pdf.category_id)
                             const maxDownloads = Math.max(...normalizedPdfs.map(item => item.download_count), 1)
                            const pct = Math.round((pdf.download_count / Math.max(maxDownloads, 1)) * 100)
                            return (
                              <div key={pdf.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors border border-border/40">
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs ${
                                  index === 0 ? "bg-amber-400/20 text-amber-600" :
                                  index === 1 ? "bg-slate-400/20 text-slate-500" :
                                  index === 2 ? "bg-orange-500/20 text-orange-600" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  #{index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{pdf.title}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <Progress value={pct} className="h-1.5 flex-1" />
                                    <span className="text-xs text-muted-foreground shrink-0">{pdf.download_count} DL</span>
                                    <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-0.5">
                                      <Eye className="h-3 w-3" />{pdf.view_count || 0}
                                    </span>
                                  </div>
                                </div>
                                {category && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5 shrink-0"
                                    style={{ backgroundColor: category.color + "20", color: category.color, borderColor: category.color + "40" }}
                                  >
                                    {category.name}
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* System Status */}
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="h-4 w-4 text-green-500" />
                      System Status
                    </CardTitle>
                    <CardDescription>Latest admin data request outcomes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Categories request", status: requestHealth.categories },
                      { label: "PDFs request", status: requestHealth.pdfs },
                      { label: "Quiz statistics request", status: requestHealth.stats },
                    ].map(({ label, status }) => (
                      <div key={label} className="flex items-center justify-between py-1">
                        <span className="text-sm text-muted-foreground">{label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${status === "operational" ? "bg-green-500 animate-pulse" : status === "degraded" ? "bg-rose-500" : "bg-amber-500"}`} />
                          <span className={`text-xs font-medium ${status === "operational" ? "text-green-600" : status === "degraded" ? "text-rose-500" : "text-amber-600"}`}>{status === "operational" ? "Operational" : status === "degraded" ? "Degraded" : "Checking"}</span>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Storage Used</span>
                        <span className="font-medium">{formatBytes(totalStorage)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Documents</span>
                        <span className="font-medium">{pdfs.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Categories</span>
                        <span className="font-medium">{categories.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Quizzes</span>
                        <span className="font-medium">{quizCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Synced</span>
                        <span className={`font-medium ${lastRefreshed ? "text-green-600" : "text-muted-foreground"}`}>{lastRefreshed ? lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not synced"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── PDF Manager (unified upload + library) ── */}
          {activeTab === "pdfs" && (
            <div className="max-w-7xl mx-auto space-y-5">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    PDF Manager
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Import new files and manage your entire library in one place
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1.5">
                    <FileText className="h-3 w-3" />
                    {pdfs.length} PDFs
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1.5">
                    <HardDrive className="h-3 w-3" />
                    {formatBytes(totalStorage)}
                  </div>
                </div>
              </div>

              {/* Sub-tab switcher */}
              <div role="tablist" aria-label="PDF manager views" className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl w-fit border border-border/40">
                <button
                  id="pdf-import-tab"
                  type="button"
                  role="tab"
                  aria-selected={pdfSubTab === "import"}
                  aria-controls="pdf-import-panel"
                  onClick={() => navigate("pdfs", "import")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pdfSubTab === "import"
                      ? "bg-background text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import Files
                </button>
                <button
                  id="pdf-library-tab"
                  type="button"
                  role="tab"
                  aria-selected={pdfSubTab === "library"}
                  aria-controls="pdf-library-panel"
                  onClick={() => navigate("pdfs", "library")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pdfSubTab === "library"
                      ? "bg-background text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  All PDFs
                  {pdfs.length > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      pdfSubTab === "library" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {pdfs.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Import Files panel */}
              {pdfSubTab === "import" && (
                <Card id="pdf-import-panel" role="tabpanel" aria-labelledby="pdf-import-tab" className="border-border/50">
                  <CardHeader className="pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Upload className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Import New Files</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            PDF &amp; HTML supported · Auto-split over 50MB · Parallel upload
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-xs text-muted-foreground hidden sm:flex"
                        onClick={() => navigate("pdfs", "library")}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View Library
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <PDFUploadForm
                      categories={categories}
                      onSuccess={() => { fetchData(); navigate("pdfs", "library") }}
                    />
                  </CardContent>
                </Card>
              )}

              {/* All PDFs panel */}
              {pdfSubTab === "library" && (
                <Card id="pdf-library-panel" role="tabpanel" aria-labelledby="pdf-library-tab" className="border-border/50">
                  <CardHeader className="pb-2 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                          <FileText className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-base">Library</CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            Search, filter, edit metadata, replace files, delete entries
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="gap-2 text-xs hidden sm:flex"
                        onClick={() => navigate("pdfs", "import")}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Import Files
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <PDFList
                      pdfs={pdfs}
                      categories={categories}
                      loading={loading}
                      onDelete={fetchData}
                      onUpdate={fetchData}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Structure ── */}
          {activeTab === "structure" && (
            <PageSection icon={Layers} title="Content Structure" description="Create hierarchical structure: Folders contain Categories, and Categories contain Sections displayed on the homepage.">
              <FolderManager />
            </PageSection>
          )}

          {/* ── Categories ── */}
          {activeTab === "categories" && (
            <PageSection icon={Database} title="Database Categories" description="Manage database categories for PDFs. These are linked to actual PDF files in the system.">
              <CategoryManager categories={categories} onChange={fetchData} />
            </PageSection>
          )}

          {/* ── Quizzes ── */}
          {activeTab === "quizzes" && (
            <div className="max-w-7xl mx-auto space-y-5">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Quiz Manager
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Create, import, and manage quizzes — all in one place
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1.5">
                    <Zap className="h-3 w-3" />
                    {quizCount} Quizzes
                  </div>
                </div>
              </div>
              <QuizManager />
            </div>
          )}

          {/* ── Reviews ── */}
          {activeTab === "reviews" && (
            <PageSection icon={MessageSquare} title="Manage Reviews" description="View, filter, and moderate user reviews. Delete inappropriate or spam reviews.">
              <ReviewsManager pdfs={pdfs} categories={categories} />
            </PageSection>
          )}

          {/* ── Analytics ── */}
          {activeTab === "analytics" && (
            <AnalyticsDashboard pdfs={pdfs} categories={categories} />
          )}

          {/* ── Homepage ── */}
          {activeTab === "homepage" && (
            <HomepageManager pdfs={pdfs} categories={categories} />
          )}

          {/* ── Activity ── */}
          {activeTab === "activity" && (
              <ActivityLog />
          )}

          {/* ── Power Tools ── */}
          {activeTab === "tools" && (
            <ToolsManager />
          )}

          {/* ── Settings ── */}
          {activeTab === "settings" && (
            <SiteSettings />
          )}
        </main>
      </div>
    </div>
  )
}

// ── Helpers ──

function PageSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof FileText
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <Card className="border-border/50">
        <CardContent className="pt-6">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

function KpiRow({ label, value, progress, status }: {
  label: string
  value: string
  progress: number
  status: "good" | "warn" | "low"
}) {
  const color = status === "good" ? "text-green-600" : status === "warn" ? "text-amber-600" : "text-rose-500"
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold ${color}`}>{value}</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  )
}

function StatCard({
  label, value, icon: Icon, color, isString, onClick,
}: {
  label: string
  value: number | string
  icon: typeof FileText
  color: "violet" | "blue" | "green" | "amber" | "pink" | "slate"
  isString?: boolean
  onClick?: () => void
}) {
  const cfg = {
    violet: { bg: "from-violet-500/20 to-violet-500/10", text: "text-violet-600", border: "hover:border-violet-400/50" },
    blue:   { bg: "from-blue-500/20 to-blue-500/10",   text: "text-blue-600",   border: "hover:border-blue-400/50" },
    green:  { bg: "from-green-500/20 to-green-500/10",  text: "text-green-600",  border: "hover:border-green-400/50" },
    amber:  { bg: "from-amber-500/20 to-amber-500/10",  text: "text-amber-600",  border: "hover:border-amber-400/50" },
    pink:   { bg: "from-pink-500/20 to-pink-500/10",    text: "text-pink-600",   border: "hover:border-pink-400/50" },
    slate:  { bg: "from-slate-500/20 to-slate-500/10",  text: "text-slate-600",  border: "hover:border-slate-400/50" },
  }[color]

  const content = (
    <Card className={`border-border/50 ${cfg.border} transition-all duration-200 ${onClick ? "hover:shadow-md" : ""}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
              {isString ? value : (typeof value === "number" ? value.toLocaleString() : value)}
            </p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${cfg.bg}`}>
            <Icon className={`h-5 w-5 ${cfg.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${label}`}
      className="block w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {content}
    </button>
  ) : content
}
