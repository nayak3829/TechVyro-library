"use client"

import { useEffect, useState, useRef } from "react"
import { FileText, FolderOpen, Download, Eye, Star, TrendingUp, Target, BookOpen, Zap, ArrowUpRight, Sparkles } from "lucide-react"

interface LiveStats {
  totalPdfs: number
  totalCategories: number
  totalDownloads: number
  totalViews: number
  avgRating: number
  thisWeekDownloads: number
  thisWeekUploads: number
}

interface StatsSectionProps {
  stats: {
    totalPdfs: number
    totalCategories: number
    totalDownloads: number
    totalViews: number
    avgRating: number
  }
}

function AnimatedCounter({ value, duration = 1800 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let start: number
    function tick(ts: number) {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setCount(Math.floor(value * ease))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, duration, visible])

  return <span ref={ref}>{count.toLocaleString()}</span>
}

const STAT_BASE = [
  {
    key: "totalPdfs",
    label: "Total PDFs",
    sublabel: "Curated documents",
    icon: FileText,
    accent: "blue",
    gradient: "from-blue-600 to-blue-400",
    glow: "shadow-blue-500/15",
    ring: "ring-blue-500/20",
    bg: "bg-blue-500/8",
    iconBg: "bg-blue-500/12",
    iconColor: "text-blue-500",
    bar: "bg-blue-500",
  },
  {
    key: "totalCategories",
    label: "Categories",
    sublabel: "Organized topics",
    icon: FolderOpen,
    accent: "violet",
    gradient: "from-violet-600 to-violet-400",
    glow: "shadow-violet-500/15",
    ring: "ring-violet-500/20",
    bg: "bg-violet-500/8",
    iconBg: "bg-violet-500/12",
    iconColor: "text-violet-500",
    bar: "bg-violet-500",
  },
  {
    key: "totalDownloads",
    label: "Downloads",
    sublabel: "Files served",
    icon: Download,
    accent: "emerald",
    gradient: "from-emerald-600 to-emerald-400",
    glow: "shadow-emerald-500/15",
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-500/8",
    iconBg: "bg-emerald-500/12",
    iconColor: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  {
    key: "totalViews",
    label: "Total Views",
    sublabel: "Page visits",
    icon: Eye,
    accent: "orange",
    gradient: "from-orange-600 to-orange-400",
    glow: "shadow-orange-500/15",
    ring: "ring-orange-500/20",
    bg: "bg-orange-500/8",
    iconBg: "bg-orange-500/12",
    iconColor: "text-orange-500",
    bar: "bg-orange-500",
  },
]

const WHY_US = [
  { icon: Target, title: "Selected by Toppers", desc: "Curated by top performers", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  { icon: TrendingUp, title: "Success-Oriented", desc: "Exam-focused content", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { icon: BookOpen, title: "Exam-Ready PDFs", desc: "Latest pattern coverage", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  { icon: Zap, title: "Instant Access", desc: "One-click downloads", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
]

function buildTrend(key: string, live: LiveStats | null): string {
  if (!live) return "—"
  switch (key) {
    case "totalPdfs": return live.thisWeekUploads > 0 ? `+${live.thisWeekUploads} added this week` : "Growing collection"
    case "totalCategories": return `${live.totalCategories} subject${live.totalCategories !== 1 ? "s" : ""} covered`
    case "totalDownloads": return live.thisWeekDownloads > 0 ? `+${live.thisWeekDownloads.toLocaleString()} this week` : "All time total"
    case "totalViews": return live.totalViews > 1000 ? `${(live.totalViews / 1000).toFixed(1)}K+ all time` : `${live.totalViews} all time`
    default: return ""
  }
}

export function StatsSection({ stats: initialStats }: StatsSectionProps) {
  const [live, setLive] = useState<LiveStats | null>(null)

  const stats = live
    ? { totalPdfs: live.totalPdfs, totalCategories: live.totalCategories, totalDownloads: live.totalDownloads, totalViews: live.totalViews, avgRating: live.avgRating }
    : initialStats

  useEffect(() => {
    fetch("/api/stats/summary")
      .then(r => r.json())
      .then(data => { if (!data.error) setLive(data) })
      .catch(() => {})
  }, [])

  return (
    <section className="relative py-16 sm:py-20 lg:py-24 overflow-hidden bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(120,80,200,0.05),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(120,80,200,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(120,80,200,0.018)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <div className="container mx-auto px-4 relative">

        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <Sparkles className="h-3 w-3" />
            {live ? "Live Data" : "Our Numbers"}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Trusted by <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Students</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Quality content that helps you succeed in your exams
          </p>
        </div>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5">
          {STAT_BASE.map((stat) => {
            const Icon = stat.icon
            const value = stats[stat.key as keyof typeof stats]
            const trend = buildTrend(stat.key, live)

            return (
              <div
                key={stat.key}
                className={`group relative bg-card rounded-2xl p-4 sm:p-5 lg:p-6 border border-border/50 hover:border-border hover:shadow-2xl ${stat.glow} transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
              >
                {/* Top gradient bar */}
                <div className={`absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r ${stat.gradient} rounded-full opacity-50 group-hover:opacity-100 group-hover:left-0 group-hover:right-0 transition-all duration-500`} />
                {/* Subtle bg fill on hover */}
                <div className={`absolute inset-0 ${stat.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl`} />

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${stat.iconBg} ring-1 ${stat.ring} group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors" />
                  </div>

                  <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight mb-1">
                    <AnimatedCounter value={typeof value === "number" ? Math.round(value) : 0} />
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground/80 mb-0.5">{stat.label}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block mb-3">{stat.sublabel}</p>

                  <div className={`h-px bg-border/30 mb-2 hidden sm:block`} />
                  <span className={`hidden sm:inline text-[10px] font-medium ${live ? "text-emerald-500" : "text-muted-foreground"}`}>
                    {trend}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom row: Rating + Why Us */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {stats.avgRating > 0 && (
            <div className="md:col-span-2">
              <div className="h-full bg-card rounded-2xl p-6 sm:p-7 border border-amber-500/20 hover:border-amber-500/35 hover:shadow-xl hover:shadow-amber-500/8 transition-all duration-300 flex flex-col items-center text-center justify-center gap-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <Star className="h-7 w-7 text-amber-500 fill-amber-500" />
                </div>
                <div className="relative">
                  <p className="text-5xl font-extrabold text-foreground mb-1 tabular-nums">{stats.avgRating.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground mb-3">Community Rating</p>
                  <div className="flex items-center justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 text-amber-400 ${i < Math.round(stats.avgRating) ? "fill-current" : "opacity-20"}`} />
                    ))}
                  </div>
                </div>
                <p className="relative text-xs text-muted-foreground">Based on student reviews</p>
              </div>
            </div>
          )}

          <div className={stats.avgRating > 0 ? "md:col-span-3" : "md:col-span-5"}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap px-2">Why Students Choose Us</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {WHY_US.map((f, i) => (
                <div
                  key={i}
                  className={`group flex items-start gap-3 p-4 rounded-xl bg-card border ${f.border} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${f.bg} group-hover:scale-105 transition-transform duration-300`}>
                    <f.icon className={`h-4.5 w-4.5 ${f.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">{f.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
