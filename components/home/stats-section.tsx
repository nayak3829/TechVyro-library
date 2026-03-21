"use client"

import { useEffect, useState, useRef } from "react"
import { FileText, FolderOpen, Download, Eye, Star, TrendingUp, Target, BookOpen, Award, GraduationCap, Zap, CheckCircle } from "lucide-react"

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

    if (countRef.current) {
      observer.observe(countRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number
    const startValue = 0
    const endValue = value

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(startValue + (endValue - startValue) * easeOut))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, isVisible])

  return (
    <span ref={countRef}>
      {count.toLocaleString()}{suffix}
    </span>
  )
}

const statsConfig = [
  {
    key: "totalPdfs",
    label: "Total PDFs",
    icon: FileText,
    gradient: "from-primary/20 to-primary/5",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    borderHover: "hover:border-primary/40",
    shadowHover: "hover:shadow-primary/10",
  },
  {
    key: "totalCategories",
    label: "Categories",
    icon: FolderOpen,
    gradient: "from-accent/20 to-accent/5",
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    borderHover: "hover:border-accent/40",
    shadowHover: "hover:shadow-accent/10",
  },
  {
    key: "totalDownloads",
    label: "Downloads",
    icon: Download,
    gradient: "from-green-500/20 to-green-500/5",
    iconBg: "bg-green-500/15",
    iconColor: "text-green-500",
    borderHover: "hover:border-green-500/40",
    shadowHover: "hover:shadow-green-500/10",
  },
  {
    key: "totalViews",
    label: "Total Views",
    icon: Eye,
    gradient: "from-blue-500/20 to-blue-500/5",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-500",
    borderHover: "hover:border-blue-500/40",
    shadowHover: "hover:shadow-blue-500/10",
  },
]

const emotionalFeatures = [
  {
    icon: Target,
    title: "Selected by Toppers",
    description: "Curated by top performers",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: TrendingUp,
    title: "Success-Oriented",
    description: "Exam-focused content",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: BookOpen,
    title: "Exam-Focused PDFs",
    description: "Latest pattern coverage",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Zap,
    title: "Instant Access",
    description: "One-click downloads",
    color: "text-rose-500",
    bg: "bg-rose-500/10",
  },
]

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section className="relative py-10 sm:py-14 md:py-16">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,80,200,0.08),transparent)]" />
      
      <div className="container mx-auto px-4 relative">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {statsConfig.map((stat, index) => {
            const Icon = stat.icon
            const value = stats[stat.key as keyof typeof stats]
            
            return (
              <div
                key={stat.key}
                className={`group relative bg-card rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-border/50 ${stat.borderHover} hover:shadow-xl ${stat.shadowHover} transition-all duration-300 hover:-translate-y-1`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                
                <div className="relative">
                  <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${stat.iconBg} mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.iconColor}`} />
                  </div>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                    <AnimatedCounter value={typeof value === 'number' ? Math.round(value) : 0} />
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Average Rating Card */}
        {stats.avgRating > 0 && (
          <div className="mt-6 sm:mt-8 max-w-md mx-auto">
            <div className="group relative bg-gradient-to-r from-amber-500/10 via-card to-orange-500/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-amber-500/30 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Star className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 fill-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">Community Rating</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.avgRating.toFixed(1)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1 text-amber-500 shrink-0">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 sm:h-5 sm:w-5 ${i < Math.round(stats.avgRating) ? "fill-current" : "opacity-30"}`} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Emotional Impact Features */}
        <div className="mt-10 sm:mt-14">
          {/* Section Divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <span className="text-xs sm:text-sm font-medium text-muted-foreground px-4">Why Students Choose Us</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {emotionalFeatures.map((feature, index) => (
              <div
                key={index}
                className="group flex flex-col items-center text-center p-4 sm:p-5 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl ${feature.bg} mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-6 w-6 sm:h-7 sm:w-7 ${feature.color}`} />
                </div>
                <h4 className="font-semibold text-sm sm:text-base text-foreground mb-1">{feature.title}</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">Verified Content</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
            <GraduationCap className="h-4 w-4 text-blue-500" />
            <span className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">Student Approved</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="text-xs sm:text-sm font-medium text-amber-600 dark:text-amber-400">Topper Recommended</span>
          </div>
        </div>
      </div>
    </section>
  )
}
