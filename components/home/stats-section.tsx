"use client"

import { useEffect, useState, useRef } from "react"
import { FileText, FolderOpen, Download, Eye, Star, TrendingUp, Target, BookOpen, Zap, ArrowUpRight } from "lucide-react"

interface StatsSectionProps {
  stats: {
    totalPdfs: number
    totalCategories: number
    totalDownloads: number
    totalViews: number
    avgRating: number
  }
}

function AnimatedCounter({
  value,
  duration = 2000,
  suffix = ""
}: {
  value: number
  duration?: number
  suffix?: string
}) {
  const [count, setCount] = useState(0)
  const countRef = useRef<HTMLSpanElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    if (countRef.current) observer.observe(countRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return
    let startTime: number
    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor((value) * easeOut))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration, isVisible])

  return <span ref={countRef}>{count.toLocaleString()}{suffix}</span>
}

const statsConfig = [
  {
    key: "totalPdfs",
    label: "Total PDFs",
    sublabel: "Curated documents",
    icon: FileText,
    gradient: "from-blue-600 to-blue-400",
    glow: "shadow-blue-500/20",
    ring: "ring-blue-500/20",
    bg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    trend: "+12% this month",
  },
  {
    key: "totalCategories",
    label: "Categories",
    sublabel: "Organized topics",
    icon: FolderOpen,
    gradient: "from-violet-600 to-violet-400",
    glow: "shadow-violet-500/20",
    ring: "ring-violet-500/20",
    bg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    trend: "Growing daily",
  },
  {
    key: "totalDownloads",
    label: "Downloads",
    sublabel: "Files served",
    icon: Download,
    gradient: "from-emerald-600 to-emerald-400",
    glow: "shadow-emerald-500/20",
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    trend: "+24% this week",
  },
  {
    key: "totalViews",
    label: "Total Views",
    sublabel: "Page visits",
    icon: Eye,
    gradient: "from-orange-600 to-orange-400",
    glow: "shadow-orange-500/20",
    ring: "ring-orange-500/20",
    bg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    trend: "All time high",
  },
]

const emotionalFeatures = [
  {
    icon: Target,
    title: "Selected by Toppers",
    description: "Curated by top performers",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    icon: TrendingUp,
    title: "Success-Oriented",
    description: "Exam-focused content",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    icon: BookOpen,
    title: "Exam-Focused PDFs",
    description: "Latest pattern coverage",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "One-click downloads",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
]

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="relative py-16 sm:py-20 lg:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 via-muted/20 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(120,80,200,0.06),transparent)]" />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Our Numbers
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
            Trusted by <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Students</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Quality content that helps you succeed in your exams
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-10 lg:mb-12">
          {statsConfig.map((stat) => {
            const Icon = stat.icon
            const value = stats[stat.key as keyof typeof stats]

            return (
              <div
                key={stat.key}
                className={`group relative bg-card rounded-2xl p-4 sm:p-5 lg:p-6 border border-border/50 hover:border-border hover:shadow-xl ${stat.glow} transition-all duration-300 hover:-translate-y-1.5 overflow-hidden`}
              >
                {/* Gradient accent top bar */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${stat.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-2xl`} />

                <div className="relative">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${stat.bg} ring-1 ${stat.ring} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                  </div>

                  <p className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-0.5 sm:mb-1 tracking-tight">
                    <AnimatedCounter value={typeof value === 'number' ? Math.round(value) : 0} />
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground/80 mb-0.5 sm:mb-1">{stat.label}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">{stat.sublabel}</p>

                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/30">
                    <span className="text-[10px] font-medium text-emerald-500">{stat.trend}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Rating + Why Us — Side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Rating Card */}
          {stats.avgRating > 0 && (
            <div className="lg:col-span-2">
              <div className="h-full bg-gradient-to-br from-amber-500/10 via-card to-orange-500/8 rounded-2xl p-6 sm:p-8 border border-amber-500/25 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col items-center text-center justify-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/20">
                  <Star className="h-8 w-8 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <p className="text-5xl font-extrabold text-foreground mb-1">{stats.avgRating.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground mb-3">Community Rating</p>
                  <div className="flex items-center justify-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < Math.round(stats.avgRating) ? "fill-current" : "opacity-25"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Based on student reviews</p>
              </div>
            </div>
          )}

          {/* Why Students Choose Us */}
          <div className={stats.avgRating > 0 ? "lg:col-span-3" : "lg:col-span-5"}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap px-3">Why Students Choose Us</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {emotionalFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`group flex items-start gap-3 p-4 sm:p-5 rounded-2xl bg-card border ${feature.border} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-5 w-5 ${feature.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground mb-0.5">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
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
