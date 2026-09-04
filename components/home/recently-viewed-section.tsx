"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, Clock, FileText, ListChecks, Star } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useFavorites } from "@/hooks/use-favorites"
import { getQuizProgress, type QuizProgressSnapshot } from "@/lib/study-progress"
import type { HomepageQuiz, PDF } from "@/lib/types"

export interface RecentlyViewedItem {
  id: string
  title: string
  type: "pdf" | "quiz"
  categoryName?: string
  categoryColor?: string
  viewedAt: string
}

const STORAGE_KEY = "techvyro_recently_viewed"
const MAX_ITEMS = 8

export function saveRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  if (typeof window === "undefined") return
  try {
    const existing: RecentlyViewedItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    const filtered = existing.filter(entry => !(entry.id === item.id && entry.type === item.type))
    const updated = [{ ...item, viewedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Private browsing or blocked storage should not interrupt navigation.
  }
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    return Array.isArray(raw) ? raw.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  if (diff < 60_000) return "Just now"
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? "Yesterday" : `${days}d ago`
}

interface ContinueItem {
  key: string
  id: string
  title: string
  type: "pdf" | "quiz"
  label: string
  detail: string
  color?: string
  progress?: number
}

interface RecentlyViewedSectionProps {
  pdfs: Pick<PDF, "id" | "title">[]
  quizzes: Pick<HomepageQuiz, "id" | "title">[]
}

export function RecentlyViewedSection({ pdfs, quizzes }: RecentlyViewedSectionProps) {
  const { user, loading: authLoading } = useAuth()
  const { favorites, isLoaded: favoritesLoaded } = useFavorites()
  const [recentItems, setRecentItems] = useState<RecentlyViewedItem[]>([])
  const [quizProgress, setQuizProgress] = useState<QuizProgressSnapshot[]>([])

  useEffect(() => {
    if (!user) {
      setRecentItems([])
      setQuizProgress([])
      return
    }
    setRecentItems(getRecentlyViewed())
    setQuizProgress(getQuizProgress(user.id))
  }, [user?.id])

  const items = useMemo(() => {
    if (!user) return []
    const combined: ContinueItem[] = []
    const quizLookup = new Map(quizzes.map(quiz => [quiz.id, quiz.title]))
    const pdfLookup = new Map(pdfs.map(pdf => [pdf.id, pdf.title]))

    for (const progress of quizProgress) {
      const answered = Object.keys(progress.answers).length
      combined.push({
        key: `quiz:${progress.quizId}`,
        id: progress.quizId,
        title: quizLookup.get(progress.quizId) || progress.title,
        type: "quiz",
        label: "In progress",
        detail: `${answered} of ${progress.totalQuestions} answered`,
        progress: Math.round((answered / progress.totalQuestions) * 100),
      })
    }

    for (const item of recentItems) {
      combined.push({
        key: `${item.type}:${item.id}`,
        id: item.id,
        title: item.title,
        type: item.type,
        label: item.type === "pdf" ? "Recently read" : "Recently opened",
        detail: relativeTime(item.viewedAt),
        color: item.categoryColor,
      })
    }

    if (favoritesLoaded) {
      for (const id of favorites) {
        combined.push({
          key: `pdf:${id}`,
          id,
          title: pdfLookup.get(id) || "Saved PDF",
          type: "pdf",
          label: "Saved PDF",
          detail: "In your favorites",
        })
      }
    }

    return combined.filter(
      (item, index, all) => all.findIndex(candidate => candidate.key === item.key) === index
    ).slice(0, 4)
  }, [favorites, favoritesLoaded, pdfs, quizProgress, quizzes, recentItems, user])

  if (authLoading || !user || items.length === 0) return null

  return (
    <section className="border-b border-border/50 bg-card/50 py-8 sm:py-10">
      <div className="container mx-auto px-4">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              Continue learning
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Pick up where you left off</h2>
          </div>
          <Link href="/profile" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View profile <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(item => {
            const isPdf = item.type === "pdf"
            const Icon = isPdf ? FileText : ListChecks
            return (
              <Link
                key={item.key}
                href={isPdf ? `/pdf/${item.id}` : `/quiz/${item.id}`}
                className="group min-w-0 rounded-xl border border-border/60 bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"
                    style={item.color ? { backgroundColor: `${item.color}18`, color: item.color } : undefined}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">{item.title}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {item.label === "Saved PDF" ? <Star className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      <span>{item.label}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.detail}</span>
                    </div>
                    {item.progress !== undefined && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}