"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Flame, Clock, TrendingUp, Star, ChevronRight, Eye, Download,
  Sparkles, Trophy, Play, ListChecks, Brain, Zap
} from "lucide-react"
import type { HomepageQuiz, PDF } from "@/lib/types"

interface FeaturedData {
  popular: PDF[]
  trending: PDF[]
  recent: PDF[]
  topRated: PDF[]
}

interface FeaturedSectionProps {
  featured: FeaturedData
  initialQuizzes: HomepageQuiz[]
}

const PDF_TABS = [
  { id: "popular",  label: "Most Downloaded", short: "Popular",  icon: Flame,       color: "text-orange-500",  activeBg: "bg-orange-500/10",   activeBorder: "border-orange-500/30",   dot: "bg-orange-500"  },
  { id: "trending", label: "Most Viewed",       short: "Viewed",   icon: TrendingUp,  color: "text-blue-500",    activeBg: "bg-blue-500/10",     activeBorder: "border-blue-500/30",     dot: "bg-blue-500"    },
  { id: "recent",   label: "Recently Updated",  short: "Updated",  icon: Clock,       color: "text-emerald-500", activeBg: "bg-emerald-500/10",  activeBorder: "border-emerald-500/30",  dot: "bg-emerald-500" },
  { id: "topRated", label: "Top Rated",          short: "Rated",    icon: Star,        color: "text-amber-500",   activeBg: "bg-amber-500/10",    activeBorder: "border-amber-500/30",    dot: "bg-amber-500"   },
]

const QUIZ_TABS = [
  { id: "quiz_popular",  label: "Most Questions",   short: "Largest", icon: Trophy, color: "text-violet-500",  activeBg: "bg-violet-500/10",  activeBorder: "border-violet-500/30"  },
  { id: "quiz_recent",   label: "Recently Added",   short: "Recent",  icon: Zap,    color: "text-cyan-500",    activeBg: "bg-cyan-500/10",    activeBorder: "border-cyan-500/30"    },
  { id: "quiz_hard",     label: "Challenging",       short: "Hard",    icon: Brain,  color: "text-rose-500",    activeBg: "bg-rose-500/10",    activeBorder: "border-rose-500/30"    },
]

const ALL_TABS = [...PDF_TABS, ...QUIZ_TABS]

const RANK_STYLES = [
  "bg-gradient-to-br from-amber-300 to-amber-600 text-white shadow-md shadow-amber-400/40",
  "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md shadow-slate-400/30",
  "bg-gradient-to-br from-orange-300 to-orange-600 text-white shadow-md shadow-orange-400/30",
  "bg-muted text-muted-foreground",
]

const DIFF_COLORS: Record<string, string> = {
  easy: "#22c55e", medium: "#f59e0b", hard: "#ef4444",
}

function PdfCard({ pdf, index }: { pdf: PDF; index: number }) {
  return (
    <Link href={`/pdf/${pdf.id}`} className="group block h-full">
      <div className="h-full bg-card rounded-2xl p-4 sm:p-5 border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/8 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="flex items-start gap-3 sm:gap-4">
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
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-foreground sm:text-xs mb-2.5"
                style={{ backgroundColor: pdf.category.color + "18", borderColor: pdf.category.color + "60" }}
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

function QuizCard({ quiz, index }: { quiz: HomepageQuiz; index: number }) {
  const href = `/quiz/${quiz.id}`
  const diffColor = DIFF_COLORS[quiz.difficulty] || "#6366f1"
  const duration = quiz.time_limit > 0 ? Math.max(1, Math.floor(quiz.time_limit / 60)) : null
  return (
    <Link href={href} className="group block h-full">
      <div className="h-full bg-card rounded-2xl p-4 sm:p-5 border border-border/50 hover:border-violet-400/40 hover:shadow-xl hover:shadow-violet-500/8 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl font-extrabold text-lg sm:text-xl tracking-tight ${RANK_STYLES[Math.min(index, RANK_STYLES.length - 1)]}`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 group-hover:text-violet-500 transition-colors leading-snug">
                {quiz.title}
              </h3>
              <Play className="h-4 w-4 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all mt-0.5" />
            </div>
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-violet-500/10 text-violet-500">{quiz.category || "General"}</span>
              {quiz.section && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-muted text-muted-foreground">{quiz.section}</span>}
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                style={{ backgroundColor: `${diffColor}18`, color: diffColor }}
              >
                {quiz.difficulty}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ListChecks className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                {quiz.question_count} questions
              </span>
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  {duration} min
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function FeaturedSection({ featured, initialQuizzes }: FeaturedSectionProps) {
  const [activeTab, setActiveTab] = useState("recent")
  const allQuizzes = initialQuizzes

  const isQuizTab = activeTab.startsWith("quiz_")

  const currentPdfs: PDF[] = isQuizTab ? [] : (featured[activeTab as keyof FeaturedData] || [])

  const currentQuizzes: HomepageQuiz[] = !isQuizTab ? [] : (() => {
    if (activeTab === "quiz_popular") {
      return [...allQuizzes].sort((a, b) => b.question_count - a.question_count).slice(0, 4)
    }
    if (activeTab === "quiz_recent") {
      return [...allQuizzes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4)
    }
    if (activeTab === "quiz_hard") {
      const order: Record<string, number> = { hard: 0, medium: 1, easy: 2 }
      return [...allQuizzes].sort((a, b) => (order[a.difficulty] ?? 3) - (order[b.difficulty] ?? 3)).slice(0, 4)
    }
    return []
  })()

  if (currentPdfs.length === 0 && currentQuizzes.length === 0 && !isQuizTab) return null

  const activeTabConfig = ALL_TABS.find(t => t.id === activeTab)!
  const heading = {
    popular: "Most Downloaded PDFs",
    trending: "Most Viewed PDFs",
    recent: "Recently Updated PDFs",
    topRated: "Top Rated PDFs",
    quiz_popular: "Largest Quizzes",
    quiz_recent: "Recently Added Quizzes",
    quiz_hard: "Challenging Quizzes",
  }[activeTab]

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-muted/22 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_100%,rgba(49,72,120,0.06),transparent)]" />

      <div className="container mx-auto px-4 relative">

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-3">
              <Sparkles className="h-3 w-3" />
              Featured Content
            </div>
            <h2 className="study-display text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl">
              {heading}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-1.5 max-w-sm">
              {isQuizTab ? "Compare real quiz size, recency, and difficulty" : "Ranked from current library activity and update dates"}
            </p>
          </div>
        </div>

        {/* Tab pills — PDFs group */}
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {PDF_TABS.filter(tab => featured[tab.id as keyof FeaturedData].length > 0).map((tab) => {
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

            <div className="w-px h-5 bg-border/50 shrink-0 mx-1" />

            {QUIZ_TABS.map((tab) => {
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
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {isQuizTab
            ? currentQuizzes.length > 0
              ? currentQuizzes.map((quiz, i) => <QuizCard key={quiz.id} quiz={quiz} index={i} />)
              : (
                <div className="col-span-4 flex flex-col items-center justify-center py-12 text-center gap-3">
                  <Trophy className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">No quizzes available yet</p>
                </div>
              )
            : currentPdfs.slice(0, 4).map((pdf, i) => <PdfCard key={pdf.id} pdf={pdf} index={i} />)
          }
        </div>

        {/* View all */}
        <div className="mt-10 text-center">
          {isQuizTab ? (
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border/60 bg-card text-sm font-semibold text-foreground hover:border-violet-400/40 hover:bg-violet-500/5 hover:text-violet-500 transition-all duration-200"
            >
              View All Quizzes
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <a
              href="#content"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border/60 bg-card text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all duration-200"
            >
              View All PDFs
              <ChevronRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
