"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, Check, ChevronRight, FileText, Trophy, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

type Notification = { id: string; kind: string; title: string; body: string; href?: string | null; created_at: string; status: string }

function iconFor(kind: string) {
  if (kind === "pdf") return FileText
  if (kind === "achievement" || kind === "quiz") return Trophy
  return Bell
}

export function NotificationBell() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || loading) return
    let active = true
    fetch("/api/notifications?limit=5")
      .then(async (response) => {
        if (!response.ok) return null
        return response.json()
      })
      .then((data) => {
        if (active && data) { setItems(data.notifications || []); setUnread(data.unreadCount || 0) }
      })
      .catch(() => {})
    return () => { active = false }
  }, [user, loading])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  async function markRead(id: string) {
    setBusy(true)
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read", id }) })
      if (response.ok) {
        setItems((current) => current.map((item) => item.id === id ? { ...item, status: "read" } : item))
        setUnread((count) => Math.max(0, count - 1))
      }
    } finally { setBusy(false) }
  }

  if (!user || loading) return null
  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground ring-2 ring-background">{unread > 9 ? "9+" : unread}</span>}
      </Button>
      {open && (
        <div className="absolute right-0 top-11 z-[60] w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl shadow-foreground/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div><p className="text-sm font-bold">Your inbox</p><p className="text-[11px] text-muted-foreground">{unread ? `${unread} waiting for you` : "You are all caught up"}</p></div>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center"><Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" /><p className="text-sm font-medium">No new notes</p><p className="mt-1 text-xs text-muted-foreground">Updates from your study desk will land here.</p></div>
          ) : (
            <div className="max-h-80 divide-y divide-border/40 overflow-auto">
              {items.map((item) => {
                const Icon = iconFor(item.kind)
                const content = <><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.status === "unread" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p></div>{item.status === "unread" && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}</>
                return item.href ? <Link key={item.id} href={item.href} onClick={() => { if (item.status === "unread") void markRead(item.id); setOpen(false) }} className="flex gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">{content}</Link> : <button key={item.id} disabled={busy} onClick={() => void markRead(item.id)} className="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">{content}</button>
              })}
            </div>
          )}
          <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1 border-t border-border/50 px-4 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5">Open notification settings <ChevronRight className="h-3.5 w-3.5" /></Link>
        </div>
      )}
    </div>
  )
}