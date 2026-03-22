"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { Flame, Clock, TrendingUp, Star, ChevronRight, Eye, Download, RefreshCw, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { PDF } from "@/lib/types"

const REFRESH_INTERVAL = 2 * 60 * 1000

interface FeaturedData {
  popular: PDF[]
  trending: PDF[]
  recent: PDF[]
  topRated: PDF[]
}

interface FeaturedSectionProps {
  featured: FeaturedData
}

const tabs = [
  { id: "popular",  label: "Most Downloaded", short: "Popular",  icon: Flame,      color: "text-orange-500", activeBg: "bg-orange-500/10",  activeBorder: "border-orange-500/30",  dot: "bg-orange-500" },
  { id: "trending", label: "Trending",         short: "Trending", icon: TrendingUp, color: "text-blue-500",   activeBg: "bg-blue-500/10",    activeBorder: "border-blue-500/30",    dot: "bg-blue-500"   },
  { id: "recent",   label: "New",              short: "New",      icon: Clock,      color: "text-emerald-500",activeBg: "bg-emerald-500/10", activeBorder: "border-emerald-500/30", dot: "bg-emerald-500"},
  { id: "topRated", label: "Top Rated",        short: "Rated",    icon: Star,       color: "text-amber-500", activeBg: "bg-amber-500/10",   activeBorder: "border-amber-500/30",   dot: "bg-amber-500"  },
]

const RANK_STYLES = [
  "bg-gradient-to-br from-amber-300 to-amber-600 text-white shadow-md shadow-amber-400/40",
  "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md shadow-slate-400/30",
  "bg-gradient-to-br from-orange-300 to-orange-600 text-white shadow-md shadow-orange-400/30",
  "bg-muted text-muted-foreground",
]

function FeaturedCard({ pdf, index }: { pdf: PDF; index: number }) {
  return (
    <Link href={`/pdf/${pdf.id}`} className="group block h-full">
      <div className="h-full bg-card rounded-2xl p-4 sm:p-5 border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden relative">
        {/* Top gradient accent on hover */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-start gap-3 sm:gap-4">
          {/* Rank badge */}
          <div className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl font-extrabold text-lg sm:text-xl tracking-tight ${RANK_STYLES[Math.min(index, RANK_STYLES.length - 1)]}`}>
            {index + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                {pdf.title}
              </h3>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all mt-0.5" />
            </div>

            {pdf.category && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium mb-2.5"
                style={{ backgroundColor: pdf.category.color + "18", color: pdf.category.color }}
              >
                {pdf.category.name}
              </span>
            )}

            <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                {(pdf.view_count || 0).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                {pdf.download_count.toLocaleString()}
              </span>
              {pdf.average_rating && (
                <span className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0" />
                  {pdf.average_rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function FeaturedSection({ featured: initialFeatured }: FeaturedSectionProps) {
  const [activeTab, setActiveTab] = useState("popular")
  const [featured, setFeatured] = useState<FeaturedData>(initialFeatured)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchFresh = useCallback(async (showSpinner = true) => {
    if (showSpinner) setIsRefreshing(true)
    try {
      const res = await fetch("/api/homepage-data", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      if (data.featured) { setFeatured(data.featured); setLastUpdated(new Date()) }
    } catch {
    } finally {
      if (showSpinner) setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [])

  useEffect(() => {
    fetchFresh(false)
    timerRef.current = setInterval(() => fetchFresh(true), REFRESH_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fetchFresh])

  const currentPdfs = featured[activeTab as keyof FeaturedData] || []
  if (currentPdfs.length === 0) return null

  const activeTabConfig = tabs.find(t => t.id === activeTab)!

  return (
    <section className="py-14 sm:py-18 lg:py-22 bg-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_100%,rgba(120,80,200,0.04),transparent)]" />

      <div className="container mx-auto px-4 relative">

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <Sparkles className="h-3 w-3" />
              Featured Content
              {isRefreshing && <RefreshCw className="h-3 w-3 animate-spin ml-0.5" />}
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight">
              Popular <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">PDFs</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-1.5 max-w-sm">
              What students are reading right now
            </p>
          </div>

          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground/40 sm:text-right">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 border ${
                  isActive
                    ? `${tab.activeBg} ${tab.color} ${tab.activeBorder} shadow-sm`
                    : "bg-card text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? tab.color : ""}`} />
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Cards grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 transition-opacity duration-300 ${isRefreshing ? "opacity-50" : "opacity-100"}`}>
          {currentPdfs.slice(0, 4).map((pdf, index) => (
            <FeaturedCard key={pdf.id} pdf={pdf} index={index} />
          ))}
        </div>

        {/* View all */}
        <div className="mt-10 text-center">
          <a
            href="#content"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border/60 bg-card text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-200"
          >
            View All PDFs
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
