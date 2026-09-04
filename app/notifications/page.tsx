"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Check, FileText, Mail, RefreshCw, Settings2, Trophy, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

type Notice = { id: string; kind: string; title: string; body: string; href?: string | null; status: string; created_at: string; read_at?: string | null }
type Preferences = { pdfs: boolean; quizzes: boolean; tests: boolean; digest_mode: "immediate" | "daily" }
const iconFor = (kind: string) => kind === "pdf" ? FileText : kind === "quiz" || kind === "achievement" ? Trophy : Zap
const relativeDate = (date: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date))

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<Notice[]>([])
  const [unread, setUnread] = useState(0)
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")
  const load = async () => {
    setLoading(true); setError("")
    try {
      const [notificationResponse, preferenceResponse] = await Promise.all([fetch("/api/notifications?limit=30"), fetch("/api/notification-preferences")])
      if (notificationResponse.status === 401 || preferenceResponse.status === 401) { router.replace("/login?redirect=/notifications"); return }
      if (!notificationResponse.ok || !preferenceResponse.ok) throw new Error()
      const notificationData = await notificationResponse.json(); const preferenceData = await preferenceResponse.json()
      setItems(notificationData.notifications || []); setUnread(notificationData.unreadCount || 0); setPreferences(preferenceData.preferences)
    } catch { setError("We could not load your notification centre.") } finally { setLoading(false) }
  }
  useEffect(() => { if (!authLoading) { if (!user) router.replace("/login?redirect=/notifications"); else void load() } }, [authLoading, user, router])
  async function updateNotice(action: "read" | "dismiss", id?: string, all?: boolean) {
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(id ? { id } : {}), ...(all ? { all: true } : {}) }) })
    if (!response.ok) { setFeedback("Could not update that notification."); return }
    if (all) { setItems((current) => current.map((item) => ({ ...item, status: "read" }))); setUnread(0) }
    else if (action === "dismiss" && id) setItems((current) => current.filter((item) => item.id !== id))
    else if (id) { setItems((current) => current.map((item) => item.id === id ? { ...item, status: "read" } : item)); setUnread((count) => Math.max(0, count - 1)) }
    setFeedback(action === "dismiss" ? "Notification dismissed." : "Marked as read.")
  }
  async function updatePreference(key: keyof Preferences, value: boolean | "immediate" | "daily") {
    if (!preferences || key === "digest_mode") return
    setSaving(key); setFeedback("")
    try {
      const response = await fetch("/api/notification-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) })
      if (!response.ok) throw new Error()
      const data = await response.json(); setPreferences(data.preferences); setFeedback("Preferences saved.")
    } catch { setFeedback("Could not save this preference. Try again.") } finally { setSaving(null) }
  }
  if (authLoading || loading) return <main className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-12"><div className="mx-auto max-w-5xl space-y-5"><div className="h-28 animate-pulse rounded-3xl bg-muted" /><div className="h-96 animate-pulse rounded-2xl bg-muted" /></div></main>
  if (error) return <main className="flex min-h-[100dvh] items-center justify-center px-4"><div className="text-center"><X className="mx-auto mb-3 h-9 w-9 text-destructive" /><h1 className="font-bold">Inbox unavailable</h1><p className="mt-1 text-sm text-muted-foreground">{error}</p><Button onClick={() => void load()} className="mt-5 gap-2"><RefreshCw className="h-4 w-4" />Try again</Button></div></main>
  if (!preferences) return null
  const controls = [{ key: "pdfs" as const, label: "PDF library updates", detail: "New notes and resources saved to your subjects", icon: FileText }, { key: "quizzes" as const, label: "Quiz activity", detail: "Results, reminders, and quiz milestones", icon: Trophy }, { key: "tests" as const, label: "Mock test activity", detail: "Test-series announcements and results", icon: Zap }]
  return <main className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-accent/5"><div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Your study desk</p><h1 className="study-display text-4xl font-bold">Notifications</h1><p className="mt-2 text-sm text-muted-foreground">Useful nudges, never noise. Choose what deserves your attention.</p></div><Link href="/profile" className="text-sm font-semibold text-primary hover:underline">Back to profile</Link></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]"><section className="premium-surface overflow-hidden rounded-2xl border border-border/60"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4"><div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><h2 className="font-bold">Inbox</h2>{unread > 0 && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent-foreground">{unread} unread</span>}</div>{unread > 0 && <Button variant="ghost" size="sm" onClick={() => void updateNotice("read", undefined, true)} className="gap-1.5 text-xs"><Check className="h-3.5 w-3.5" />Mark all read</Button>}</div>{items.length ? <div className="divide-y divide-border/40">{items.map((item) => { const Icon = iconFor(item.kind); return <div key={item.id} className={`flex gap-3 px-5 py-4 transition-colors ${item.status === "unread" ? "bg-primary/[0.035]" : ""}`}><div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.status === "unread" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold">{item.title}</p><time className="text-[11px] text-muted-foreground">{relativeDate(item.created_at)}</time></div><p className="mt-1 text-sm text-muted-foreground">{item.body}</p><div className="mt-3 flex gap-3">{item.href && <Link href={item.href} onClick={() => item.status === "unread" && void updateNotice("read", item.id)} className="text-xs font-bold text-primary hover:underline">Open update</Link>}{item.status === "unread" && <button onClick={() => void updateNotice("read", item.id)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Mark read</button>}<button onClick={() => void updateNotice("dismiss", item.id)} className="text-xs font-semibold text-muted-foreground hover:text-destructive">Dismiss</button></div></div>{item.status === "unread" && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}</div> })}</div> : <div className="px-6 py-16 text-center"><Mail className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" /><h3 className="font-semibold">Your inbox is clear</h3><p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">When something important happens in your study journey, it will appear here.</p></div>}</section>
      <section className="premium-surface h-fit rounded-2xl border border-border/60 p-5"><div className="mb-5 flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary" /><div><h2 className="font-bold">Preferences</h2><p className="text-xs text-muted-foreground">Tune your study updates</p></div></div><div className="space-y-4">{controls.map(({ key, label, detail, icon: Icon }) => <div key={key} className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-muted p-2"><Icon className="h-4 w-4 text-primary" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail}</p></div><Switch checked={preferences[key]} disabled={saving === key} onCheckedChange={(value) => void updatePreference(key, value)} aria-label={label} /></div>)}</div>{feedback && <p className="mt-5 border-t border-border/50 pt-4 text-xs font-semibold text-primary">{feedback}</p>}</section>
    </div>
  </div></main>
}