"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, FileText, X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface RecentlyViewedItem {
  id: string
  title: string
  categoryName?: string
  categoryColor?: string
  viewedAt: string
}

const STORAGE_KEY = "techvyro_recently_viewed"
const MAX_ITEMS = 10

export function saveRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  try {
    const existing: RecentlyViewedItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    const filtered = existing.filter(i => i.id !== item.id)
    const updated = [{ ...item, viewedAt: new Date().toISOString() }, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}

export function RecentlyViewedSection() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
      setItems(stored)
    } catch {}
  }, [])

  function removeItem(id: string) {
    const updated = items.filter(i => i.id !== id)
    setItems(updated)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)) } catch {}
  }

  function clearAll() {
    setItems([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  if (!mounted || items.length === 0) return null

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return "Abhi"
    if (mins < 60) return `${mins} min pehle`
    if (hours < 24) return `${hours} ghante pehle`
    return `${days} din pehle`
  }

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
              <p className="text-[10px] text-muted-foreground">Jahan se chhoda tha, wahan se shuru karo</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
          >
            Sab Clear karo
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {items.map((item) => (
            <div
              key={item.id}
              className="relative group flex-shrink-0 w-44 sm:w-52 rounded-xl border border-border/50 bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              <button
                onClick={() => removeItem(item.id)}
                className="absolute top-1.5 right-1.5 z-10 h-5 w-5 rounded-full bg-background/80 border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>

              <Link href={`/pdf/${item.id}`} className="block p-4 space-y-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: item.categoryColor ? `${item.categoryColor}18` : "rgba(99,102,241,0.1)" }}
                >
                  <FileText
                    className="h-5 w-5"
                    style={{ color: item.categoryColor || "#6366f1" }}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">{item.title}</p>
                  {item.categoryName && (
                    <p className="text-[10px] font-medium mt-1" style={{ color: item.categoryColor || "#6366f1" }}>
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
          ))}
        </div>
      </div>
    </section>
  )
}
