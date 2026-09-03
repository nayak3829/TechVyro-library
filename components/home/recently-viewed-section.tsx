"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, FileText, X, Eye, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface RecentlyViewedItem {
  id: string
  title: string
  type: "pdf" | "quiz"
  categoryName?: string
  categoryColor?: string
  viewedAt: string
}

const STORAGE_KEY = "techvyro_recently_viewed"
const MAX_ITEMS = 20

export function saveRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  try {
    const existing: RecentlyViewedItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    const filtered = existing.filter(i => !(i.id === item.id && (i.type || "pdf") === item.type))
    const updated = [{ ...item, viewedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  try {
    const raw: any[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    return raw.map(i => ({ ...i, type: i.type || "pdf" }))
  } catch {
    return []
  }
}

function itemHref(item: RecentlyViewedItem) {
  return item.type === "quiz" ? `/quiz/${item.id}` : `/pdf/${item.id}`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function RecentlyViewedSection() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setItems(getRecentlyViewed())
  }, [])

  function removeItem(id: string, type: string) {
    const updated = items.filter(i => !(i.id === id && (i.type || "pdf") === type))
    setItems(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
  }

  function clearAll() {
    setItems([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  if (!mounted || items.length === 0) return null

  return (
    <section className="py-10 sm:py-12 bg-muted/20 border-y border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Recently Viewed</h2>
              <p className="text-[10px] text-muted-foreground">Continue where you left off</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
          >
            Clear All
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {items.map((item) => {
            const isQuiz = item.type === "quiz"
            const accent = isQuiz ? "#f59e0b" : (item.categoryColor || "#6366f1")
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="relative group flex-shrink-0 w-44 sm:w-52 rounded-xl border border-border/50 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.id, item.type)}
                    aria-label={`Remove ${item.title} from recently viewed`}
                    className="absolute top-1.5 right-1.5 z-10 h-5 w-5 rounded-full bg-background/80 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-3 w-3" />
                </button>

                <Link href={itemHref(item)} className="block p-4 space-y-3">
                  {/* Type badge */}
                  <div className="flex items-start justify-between gap-1">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${accent}18` }}
                    >
                      {isQuiz
                        ? <Trophy className="h-5 w-5" style={{ color: accent }} />
                        : <FileText className="h-5 w-5" style={{ color: accent }} />
                      }
                    </div>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide mt-0.5"
                      style={{ backgroundColor: `${accent}18`, color: accent }}
                    >
                      {isQuiz ? "Quiz" : "PDF"}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
                    {!isQuiz && item.categoryName && (
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: accent }}>
                        {item.categoryName}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{timeAgo(item.viewedAt)}</span>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
