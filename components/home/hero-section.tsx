"use client"

import { useState, useEffect } from "react"
import { BookOpen, Sparkles, ArrowRight, Users, RefreshCw, Star, GraduationCap, Shield, Zap, FileText, Download, TrendingUp, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

const DEFAULT_TAGLINES = [
  "Explore Curated Knowledge",
  "Download Quality PDFs",
  "Learn Without Limits",
  "Expand Your Horizons",
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
  const [description, setDescription] = useState("Discover our comprehensive collection of educational PDFs. Browse by categories, search documents instantly, and download with premium watermark protection.")
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
      .then(data => {
        if (!data.error) setLiveStats(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (taglines.length === 0) return
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % taglines.length)
        setIsAnimating(false)
      }, 500)
    }, 4000)
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
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Views",
      value: liveStats ? (liveStats.totalViews > 0 ? `${formatCount(liveStats.totalViews)}+` : "—") : "...",
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
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

  const newUploadLabel = liveStats?.latestUpload
    ? liveStats.latestUpload.title.length > 22
      ? liveStats.latestUpload.title.slice(0, 22) + "…"
      : liveStats.latestUpload.title
    : "Just now!"

  const newUploadTime = liveStats?.latestUpload
    ? formatSince(liveStats.latestUpload.created_at)
    : "Just now"

  const weekDownloadsLabel = liveStats && liveStats.thisWeekDownloads > 0
    ? `+${formatCount(liveStats.thisWeekDownloads)} downloads`
    : "+500 downloads"

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_60%_40%,rgba(120,80,200,0.10),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_10%_80%,rgba(239,68,68,0.07),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(120,80,200,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(120,80,200,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-32 left-16 w-48 sm:w-72 h-48 sm:h-72 bg-primary/8 rounded-full blur-[80px] sm:blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-10 sm:right-20 w-48 sm:w-80 h-48 sm:h-80 bg-accent/8 rounded-full blur-[80px] sm:blur-[120px] animate-pulse delay-700" />

      <div className="container mx-auto px-4 pt-10 pb-10 sm:pt-16 sm:pb-14 lg:pt-24 lg:pb-20 relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

          {/* LEFT — Text content */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/25 text-xs font-semibold text-primary mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-3 duration-500 backdrop-blur-sm">
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <Sparkles className="h-3 w-3" />
              <span className="truncate max-w-[180px] sm:max-w-none">{badgeText}</span>
              <ArrowRight className="h-3 w-3 opacity-60 shrink-0" />
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2 mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              {activeTrustStats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm border border-border/40 text-[11px] sm:text-xs font-medium shadow-sm"
                >
                  <stat.icon className={`h-3 w-3 ${stat.color} shrink-0`} />
                  <span className="text-foreground/80 whitespace-nowrap">{stat.label}</span>
                </div>
              ))}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight mb-3 sm:mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 leading-[1.1]">
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

            <div className="h-7 sm:h-9 mb-3 sm:mb-5 overflow-hidden animate-in fade-in duration-700 delay-200">
              <p className={`text-lg sm:text-2xl font-bold bg-gradient-to-r from-foreground/70 to-foreground/50 bg-clip-text text-transparent transition-all duration-500 ${isAnimating ? "opacity-0 -translate-y-3" : "opacity-100 translate-y-0"}`}>
                {taglines[taglineIndex] || ""}
              </p>
            </div>

            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mb-6 sm:mb-8 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 px-1 sm:px-0">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 mb-6 sm:mb-8">
              <Button
                size="lg"
                className="group w-full sm:w-auto px-7 sm:px-8 h-12 sm:h-14 text-sm sm:text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-2xl shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 rounded-xl"
                asChild
              >
                <a href="#content">
                  <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
                  {heroBtnText}
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform shrink-0" />
                </a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto px-7 sm:px-8 h-12 sm:h-14 text-sm sm:text-base font-semibold border-border/60 hover:border-[#25D366]/60 hover:bg-[#25D366]/5 rounded-xl transition-all duration-300"
                asChild
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-[#25D366] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {whatsappBtnText}
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-card/60 backdrop-blur-sm border border-border/40 text-[11px] sm:text-xs text-muted-foreground hover:border-primary/30 transition-colors duration-300 cursor-default"
                >
                  <feature.icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${feature.color} shrink-0`} />
                  <span className="whitespace-nowrap">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Visual panel */}
          <div className="relative hidden sm:flex items-center justify-center animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 mt-4 lg:mt-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent rounded-3xl blur-2xl scale-90" />

            <div className="relative w-full max-w-md mx-auto">
              <div className="relative bg-card/70 backdrop-blur-xl border border-border/50 rounded-3xl p-4 sm:p-5 lg:p-6 shadow-2xl shadow-black/10">
                {/* Card header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">PDF Library</p>
                      <p className="text-xs text-muted-foreground">TechVyro</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Live</span>
                  </div>
                </div>

                {/* Mini stat row — real data */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                  {miniStats.map((s, i) => (
                    <div key={i} className="flex flex-col items-center p-2.5 sm:p-3 rounded-2xl bg-muted/40 border border-border/30">
                      <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl ${s.bg} mb-1.5`}>
                        <s.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${s.color}`} />
                      </div>
                      <p className="text-sm sm:text-base font-bold text-foreground">{s.value}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Document cards — real recent PDFs */}
                <div className="space-y-2">
                  {floatingCards.map((card, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-gradient-to-r ${card.color} border ${card.border} backdrop-blur-sm hover:scale-[1.02] transition-transform duration-300`}
                    >
                      <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-card/80 border border-border/40 shadow-sm">
                        <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] sm:text-xs font-medium text-foreground truncate">{card.label}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Eye className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">{card.stat}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full text-white ${card.badgeColor}`}>
                        {card.badge}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Rating footer — real avg rating */}
                <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400 fill-amber-400" />
                    ))}
                    <span className="text-xs font-semibold text-foreground ml-1">{displayRating}</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {liveStats && liveStats.totalViews > 0
                      ? `Trusted by ${formatCount(liveStats.totalViews)}+ readers`
                      : "Trusted by students"}
                  </span>
                </div>
              </div>

              {/* Floating chips — real data */}
              <div className="absolute -top-3 right-2 lg:-top-4 lg:-right-4 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-xl flex items-center gap-1.5 sm:gap-2 animate-bounce" style={{ animationDuration: "3s" }}>
                <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow shrink-0">
                  <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-none mb-0.5">New Upload</p>
                  <p className="text-[11px] sm:text-xs font-bold text-foreground leading-none">{newUploadTime}</p>
                </div>
              </div>

              <div className="absolute -bottom-3 left-2 lg:-bottom-4 lg:-left-4 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-xl flex items-center gap-1.5 sm:gap-2 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>
                <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow shrink-0">
                  <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-none mb-0.5">This week</p>
                  <p className="text-[11px] sm:text-xs font-bold text-foreground leading-none">{weekDownloadsLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only compact stats strip */}
          <div className="sm:hidden grid grid-cols-3 gap-2 -mt-2 animate-in fade-in duration-700 delay-300">
            {miniStats.map((s, i) => (
              <div key={i} className="flex flex-col items-center p-3 rounded-2xl bg-card/70 backdrop-blur-sm border border-border/40">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.bg} mb-1.5`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-base font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-8 sm:mt-10 lg:mt-14 animate-in fade-in duration-1000 delay-700">
          <a href="#content" className="flex flex-col items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <span className="text-[10px] sm:text-xs font-medium tracking-widest uppercase">Scroll to explore</span>
            <div className="w-4 h-7 sm:w-5 sm:h-8 rounded-full border-2 border-current flex items-start justify-center pt-1">
              <div className="w-0.5 h-1.5 sm:h-2 rounded-full bg-current animate-bounce" />
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}
