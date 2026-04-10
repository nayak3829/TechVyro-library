"use client"

import { useState, useEffect } from "react"
import { BookOpen, Sparkles, ArrowRight, Users, RefreshCw, Star, GraduationCap, Shield, Zap, FileText, Download, TrendingUp, Eye, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const DEFAULT_TAGLINES = [
  "Explore Curated Knowledge",
  "Attempt Free Mock Tests",
  "Practice with Quiz Portal",
  "Learn Without Limits",
  "Download Quality PDFs",
]

const DEFAULT_TRUST_STATS = [
  { icon: Users, label: "10,000+ Students", color: "text-blue-500" },
  { icon: RefreshCw, label: "Updated Daily", color: "text-green-500" },
  { icon: Star, label: "4.9/5 Rating", color: "text-amber-500" },
]

const STAT_ICONS = [Users, RefreshCw, Star]
const STAT_COLORS = ["text-blue-500", "text-green-500", "text-amber-500"]

const features = [
  { icon: Shield, label: "Verified Content", color: "text-primary" },
  { icon: Zap, label: "One-Click Download", color: "text-green-500" },
  { icon: GraduationCap, label: "Student Approved", color: "text-accent" },
]

const DEFAULT_WHATSAPP = "https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37"

const CARD_CONFIGS = [
  { color: "from-blue-500/10 to-blue-600/5", border: "border-blue-500/20", badge: "New", badgeColor: "bg-emerald-500" },
  { color: "from-purple-500/10 to-purple-600/5", border: "border-purple-500/20", badge: "Trending", badgeColor: "bg-rose-500" },
  { color: "from-amber-500/10 to-amber-600/5", border: "border-amber-500/20", badge: "Popular", badgeColor: "bg-amber-500" },
]

const MARQUEE_ITEMS = [
  { icon: Shield, text: "100% Verified Content" },
  { icon: Download, text: "Free Downloads" },
  { icon: Star, text: "4.9/5 Rated" },
  { icon: Users, text: "10,000+ Students" },
  { icon: Zap, text: "Quiz Portal" },
  { icon: TrendingUp, text: "Free Mock Tests" },
  { icon: GraduationCap, text: "Exam-Focused" },
  { icon: CheckCircle, text: "Quality Assured" },
  { icon: FileText, text: "PDF Library" },
  { icon: Eye, text: "Daily Updates" },
]

interface SummaryStats {
  totalPdfs: number
  totalDownloads: number
  totalViews: number
  avgRating: number
  thisWeekDownloads: number
  thisWeekUploads: number
  recentPdfs: { id: string; title: string; download_count: number; view_count: number }[]
  popularPdfs: { id: string; title: string; download_count: number; view_count: number }[]
  latestUpload: { id: string; title: string; created_at: string } | null
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
  return n > 0 ? `${n}` : "0"
}

function formatSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export function HeroSection() {
  const [taglineIndex, setTaglineIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const [taglines, setTaglines] = useState(DEFAULT_TAGLINES)
  const [trustStatLabels, setTrustStatLabels] = useState(DEFAULT_TRUST_STATS.map(s => s.label))
  const [badgeText, setBadgeText] = useState("Free Educational Resources")
  const [description, setDescription] = useState("Free PDFs, quiz portal, and live mock tests — all under one roof. Browse thousands of study materials, test your knowledge, and prepare smarter for every exam.")
  const [heroBtnText, setHeroBtnText] = useState("Browse Library")
  const [whatsappBtnText, setWhatsappBtnText] = useState("Join Updates")
  const [whatsappUrl, setWhatsappUrl] = useState(DEFAULT_WHATSAPP)
  const [liveStats, setLiveStats] = useState<SummaryStats | null>(null)

  useEffect(() => {
    fetch("/api/site-settings?key=hero_settings")
      .then(r => r.json())
      .then(data => {
        if (data.value) {
          if (data.value.taglines?.length) setTaglines(data.value.taglines)
          if (data.value.trustStats?.length) setTrustStatLabels(data.value.trustStats)
          if (data.value.badgeText) setBadgeText(data.value.badgeText)
          if (data.value.description) setDescription(data.value.description)
          if (data.value.heroBtnText) setHeroBtnText(data.value.heroBtnText)
          if (data.value.whatsappBtnText) setWhatsappBtnText(data.value.whatsappBtnText)
        }
      })
      .catch(() => {})

    fetch("/api/site-settings?key=general_settings")
      .then(r => r.json())
      .then(data => {
        if (data.value?.whatsappChannelUrl) setWhatsappUrl(data.value.whatsappChannelUrl)
      })
      .catch(() => {})

    fetch("/api/stats/summary")
      .then(r => r.json())
      .then(data => { if (!data.error) setLiveStats(data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (taglines.length === 0) return
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % taglines.length)
        setIsAnimating(false)
      }, 400)
    }, 3500)
    return () => clearInterval(interval)
  }, [taglines])

  const activeTrustStats = trustStatLabels.map((label, i) => ({
    icon: STAT_ICONS[i % STAT_ICONS.length],
    label,
    color: STAT_COLORS[i % STAT_COLORS.length],
  }))

  const miniStats = [
    {
      label: "PDFs",
      value: liveStats ? (liveStats.totalPdfs > 0 ? `${liveStats.totalPdfs}+` : "—") : "...",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Downloads",
      value: liveStats ? (liveStats.totalDownloads > 0 ? `${formatCount(liveStats.totalDownloads)}+` : "—") : "...",
      icon: Download,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Views",
      value: liveStats ? (liveStats.totalViews > 0 ? `${formatCount(liveStats.totalViews)}+` : "—") : "...",
      icon: Users,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ]

  const floatingCards = liveStats && liveStats.recentPdfs.length > 0
    ? liveStats.recentPdfs.map((pdf, i) => ({
        label: pdf.title,
        stat: `${formatCount(pdf.download_count)} downloads`,
        ...CARD_CONFIGS[i % CARD_CONFIGS.length],
      }))
    : CARD_CONFIGS.map((cfg, i) => ({
        label: ["NDA Mathematics Notes", "Physics Revision Pack", "English Grammar PDF"][i],
        stat: ["2.4k downloads", "1.8k downloads", "3.1k downloads"][i],
        ...cfg,
      }))

  const displayRating = liveStats && liveStats.avgRating > 0
    ? liveStats.avgRating.toFixed(1)
    : "4.9"

  const newUploadTime = liveStats?.latestUpload
    ? formatSince(liveStats.latestUpload.created_at)
    : "Just now"

  const weekDownloadsLabel = liveStats && liveStats.thisWeekDownloads > 0
    ? `+${formatCount(liveStats.thisWeekDownloads)} this week`
    : "+500 this week"

  return (
    <section className="relative overflow-hidden bg-background">
      {/* ── Layered backgrounds ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(120,80,200,0.12),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_0%_100%,rgba(239,68,68,0.06),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(120,80,200,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(120,80,200,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
      {/* Noise grain texture */}
      <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />
      <div className="absolute top-20 left-10 w-80 h-80 bg-primary/6 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/6 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 pt-10 pb-6 sm:pt-16 sm:pb-8 md:pt-20 md:pb-10 lg:pt-28 lg:pb-16 relative">
        <div className="grid md:grid-cols-2 gap-8 md:gap-10 lg:gap-20 items-center">

          {/* ── LEFT — Text ── */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-xs font-semibold text-primary mb-5 sm:mb-7">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <Sparkles className="h-3 w-3 opacity-70" />
              <span>{badgeText}</span>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-5 sm:mb-7">
              {activeTrustStats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/60 text-[11px] sm:text-xs font-medium shadow-sm"
                >
                  <stat.icon className={`h-3 w-3 ${stat.color} shrink-0`} />
                  <span className="text-foreground/80 whitespace-nowrap">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight mb-3 sm:mb-4 leading-[1.08]">
              <span className="text-foreground">Welcome to </span>
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#ef4444] via-primary to-accent bg-clip-text text-transparent">
                  TechVyro
                </span>
                <svg className="absolute -bottom-1 left-0 w-full h-[5px] sm:h-[6px]" viewBox="0 0 200 8" fill="none" preserveAspectRatio="none">
                  <path d="M2 6C50 2 150 2 198 6" stroke="url(#ug)" strokeWidth="3" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="ug" x1="0" y1="0" x2="200" y2="0">
                      <stop stopColor="#ef4444" />
                      <stop offset="0.5" stopColor="hsl(var(--primary))" />
                      <stop offset="1" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            {/* Animated tagline */}
            <div className="h-6 sm:h-7 md:h-8 lg:h-9 mb-4 sm:mb-6 overflow-hidden">
              <p className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground/60 transition-all duration-400 ${isAnimating ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"}`}>
                {taglines[taglineIndex] || ""}
              </p>
            </div>

            {/* Description */}
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mb-7 sm:mb-9 leading-relaxed">
              {description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto mb-6 sm:mb-9">
              <a
                href="#content"
                className="group inline-flex items-center justify-center gap-2 px-6 sm:px-8 h-11 sm:h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-92 shadow-xl shadow-primary/25 transition-all duration-200 active:scale-[0.98]"
              >
                <BookOpen className="h-4 w-4 shrink-0" />
                {heroBtnText}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 px-6 sm:px-8 h-11 sm:h-12 rounded-xl border border-border/70 bg-card/80 backdrop-blur-sm text-foreground text-sm font-semibold hover:border-[#25D366]/50 hover:bg-[#25D366]/5 transition-all duration-200 active:scale-[0.98]"
              >
                <svg className="h-4 w-4 text-[#25D366] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {whatsappBtnText}
              </a>
            </div>

            {/* Quick access to Quiz + Tests */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6 sm:mb-7">
              <span className="text-xs text-muted-foreground font-medium shrink-0">Also try:</span>
              <a href="/quiz" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-600 hover:bg-amber-500/20 transition-colors">
                <Zap className="h-3 w-3" /> Quiz Portal
              </a>
              <a href="/test-series" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-600 hover:bg-violet-500/20 transition-colors">
                <TrendingUp className="h-3 w-3" /> Mock Tests
              </a>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/70 border border-border/50 text-[11px] sm:text-xs text-muted-foreground"
                >
                  <feature.icon className={`h-3 w-3 ${feature.color} shrink-0`} />
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT — Visual Panel ── */}
          <div className="relative flex items-center justify-center mt-6 md:mt-4 lg:mt-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/8 to-transparent rounded-3xl blur-3xl scale-95 pointer-events-none" />

            <div className="relative w-full max-w-[420px] mx-auto">
              {/* Main card */}
              <div className="relative bg-card/80 backdrop-blur-2xl border border-border/60 rounded-2xl p-5 lg:p-6 shadow-2xl shadow-black/8 ring-1 ring-white/5">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent rounded-t-2xl" />

                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
                      <FileText className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">PDF Library</p>
                      <p className="text-xs text-muted-foreground">TechVyro</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Live</span>
                  </div>
                </div>

                {/* Mini stat row */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {miniStats.map((s, i) => (
                    <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-muted/50 border border-border/40">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg} mb-1.5`}>
                        <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                      </div>
                      {!liveStats ? (
                        <div className="h-4 w-10 rounded-md bg-muted animate-pulse mb-0.5" />
                      ) : (
                        <p className="text-sm font-bold text-foreground tabular-nums">{s.value}</p>
                      )}
                      <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3.5" />

                {/* Document cards */}
                <div className="space-y-2">
                  {floatingCards.slice(0, 3).map((card, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r ${card.color} border ${card.border} transition-transform duration-300 hover:scale-[1.01]`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/70 border border-border/40">
                        <FileText className="h-3.5 w-3.5 text-foreground/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{card.label}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Eye className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <p className="text-[10px] text-muted-foreground">{card.stat}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Rating footer */}
                <div className="mt-4 pt-3.5 border-t border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    ))}
                    <span className="text-xs font-bold text-foreground ml-1.5">{displayRating}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {liveStats && liveStats.totalViews > 0
                      ? `${formatCount(liveStats.totalViews)}+ readers`
                      : "Trusted by students"}
                  </span>
                </div>
              </div>

              {/* Floating chip — upload */}
              <div className="absolute -top-4 -right-4 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl px-3 py-2 shadow-xl hidden sm:flex items-center gap-2 ring-1 ring-white/5" style={{ animation: "float1 4s ease-in-out infinite" }}>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow shrink-0">
                  <Download className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground leading-none mb-0.5">New Upload</p>
                  <p className="text-xs font-bold text-foreground leading-none">{newUploadTime}</p>
                </div>
              </div>

              {/* Floating chip — downloads */}
              <div className="absolute -bottom-4 -left-4 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl px-3 py-2 shadow-xl hidden sm:flex items-center gap-2 ring-1 ring-white/5" style={{ animation: "float2 5s ease-in-out infinite" }}>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow shrink-0">
                  <TrendingUp className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground leading-none mb-0.5">This week</p>
                  <p className="text-xs font-bold text-foreground leading-none">{weekDownloadsLabel}</p>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* ── Scrolling marquee strip ── */}
      <div className="relative border-t border-border/40 bg-muted/20 backdrop-blur-sm py-3 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background/80 to-transparent z-10 pointer-events-none" />
        <div className="flex gap-0 animate-marquee whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-xs font-medium text-muted-foreground/70">
              <item.icon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
              {item.text}
              <span className="ml-3 text-border">·</span>
            </span>
          ))}
        </div>
      </div>

    </section>
  )
}
