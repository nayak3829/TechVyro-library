"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  User, Trophy, BookOpen, Star, Clock, CheckCircle, XCircle,
  SkipForward, ArrowLeft, Edit2, Save, X, LogOut, FileText,
  TrendingUp, Download, Calendar, Zap, Award, Target, ChevronRight,
  RefreshCw, Eye,
} from "lucide-react"
import { getRecentlyViewed, type RecentlyViewedItem } from "@/components/home/recently-viewed-section"

interface QuizResult {
  id: string
  quiz_id: string | null
  quiz_title: string
  score: number
  percentage: number
  correct: number
  wrong: number
  skipped: number
  total_time: number
  created_at: string
}

interface FavoritePdf {
  id: string
  title: string
  description: string | null
  download_count: number
  view_count: number
  created_at: string
}

interface Stats {
  totalQuizzes: number
  bestScore: number
  avgScore: number
  totalFavorites: number
}

interface ProfileData {
  user: {
    id: string
    email: string
    name: string
    createdAt: string
    avatarUrl: string | null
  }
  stats: Stats
  quizResults: QuizResult[]
  favoritePdfs: FavoritePdf[]
}

type Tab = "history" | "saved" | "recent" | "settings"

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function ScoreBadge({ pct }: { pct: number }) {
  const n = Number(pct)
  if (n >= 90) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">{n.toFixed(1)}%</span>
  if (n >= 75) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">{n.toFixed(1)}%</span>
  if (n >= 50) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">{n.toFixed(1)}%</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">{n.toFixed(1)}%</span>
}

export default function ProfilePage() {
  const { user: authUser, loading: authLoading, signOut } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>("history")

  // Name edit state
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [recentItems, setRecentItems] = useState<RecentlyViewedItem[]>([])

  // Credits state
  const [credits, setCredits] = useState<{ credits: number; is_premium: boolean; referral_code: string; referred_by?: string } | null>(null)
  const [referralInput, setReferralInput] = useState("")
  const [referralMsg, setReferralMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [applyingReferral, setApplyingReferral] = useState(false)

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/credits")
      const data = await res.json()
      if (data.credits) setCredits(data.credits)
    } catch {}
  }, [])

  const applyReferral = async () => {
    if (!referralInput.trim()) return
    setApplyingReferral(true)
    setReferralMsg(null)
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "referral", code: referralInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setReferralMsg({ type: "error", text: data.error || "Invalid code" })
      } else {
        setReferralMsg({ type: "success", text: `+${data.bonusEarned} credits added! Both you and the referrer earned bonus credits.` })
        setCredits(data.credits)
        setReferralInput("")
      }
    } catch {
      setReferralMsg({ type: "error", text: "Network error. Try again." })
    } finally {
      setApplyingReferral(false)
    }
  }

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/profile")
      if (res.status === 401) {
        router.replace("/login?redirect=/profile")
        return
      }
      if (!res.ok) throw new Error("Failed to load profile")
      const json = await res.json()
      setData(json)
      setNewName(json.user.name)
    } catch {
      setError("Could not load your profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace("/login?redirect=/profile")
      return
    }
    if (!authLoading && authUser) {
      fetchProfile()
      fetchCredits()
      setRecentItems(getRecentlyViewed())
    }
  }, [authLoading, authUser, fetchProfile, fetchCredits, router])

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === data?.user.name) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    setNameMsg(null)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update name")
      setData(prev => prev ? { ...prev, user: { ...prev.user, name: json.name } } : prev)
      setNameMsg({ type: "success", text: "Name updated successfully!" })
      setEditingName(false)
    } catch (e: any) {
      setNameMsg({ type: "error", text: e.message || "Failed to update name" })
    } finally {
      setSavingName(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading your profile…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={fetchProfile} className="gap-2">
            <RefreshCw className="h-4 w-4" />Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { user, stats, quizResults, favoritePdfs } = data
  const initial = user.name.charAt(0).toUpperCase()
  const memberSince = formatDate(user.createdAt)

  const statCards = [
    {
      label: "Quizzes Taken",
      value: stats.totalQuizzes,
      icon: <Trophy className="h-5 w-5" />,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      suffix: "",
    },
    {
      label: "Best Score",
      value: stats.bestScore,
      icon: <Award className="h-5 w-5" />,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      suffix: "%",
    },
    {
      label: "Avg Score",
      value: stats.avgScore,
      icon: <Target className="h-5 w-5" />,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      suffix: "%",
    },
    {
      label: "Saved PDFs",
      value: stats.totalFavorites,
      icon: <Star className="h-5 w-5" />,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      suffix: "",
    },
  ]

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "history", label: "Quiz History", icon: <Trophy className="h-4 w-4" />, count: stats.totalQuizzes },
    { id: "saved", label: "Saved PDFs", icon: <Star className="h-4 w-4" />, count: stats.totalFavorites },
    { id: "recent", label: "Recently Viewed", icon: <Clock className="h-4 w-4" />, count: recentItems.length || undefined },
    { id: "settings", label: "Settings", icon: <Edit2 className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Back nav */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link href="/"><ArrowLeft className="h-4 w-4" />Home</Link>
          </Button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium">My Profile</span>
        </div>

        {/* Hero card */}
        <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/5">
          <div className="h-24 bg-gradient-to-r from-primary via-accent to-primary" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
              {/* Avatar */}
              <div className="relative shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-24 w-24 rounded-2xl border-4 border-card object-cover shadow-lg"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-2xl border-4 border-card bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-extrabold text-white">{initial}</span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                  <CheckCircle className="h-3.5 w-3.5 text-white" />
                </div>
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0 mt-2 sm:mt-0 sm:mb-1">
                <h1 className="text-2xl font-extrabold truncate">{user.name}</h1>
                <p className="text-muted-foreground text-sm truncate">{user.email}</p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Member since {memberSince}</span>
                </div>
              </div>

              {/* Sign out */}
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="gap-1.5 text-muted-foreground border-border/60 shrink-0 sm:mb-1"
              >
                <LogOut className="h-3.5 w-3.5" />Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/50 bg-card/70 p-4 flex flex-col gap-3">
              <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-extrabold">{s.value}{s.suffix}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Credits & Referral Card */}
        {credits && (
          <div className="rounded-2xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-500/5 to-blue-500/5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-bold text-base">Mock Test Credits</p>
                  <p className="text-xs text-muted-foreground">Use credits to play mock tests</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {credits.is_premium ? (
                  <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full px-3 py-1 text-sm font-bold">
                    ⭐ Premium — Unlimited
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-violet-500/10 text-violet-600 border border-violet-500/20 rounded-full px-3 py-1 text-sm font-bold">
                    💳 {credits.credits} Credits Left
                  </span>
                )}
                <Link href="/test-series">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Mock Test
                  </Button>
                </Link>
              </div>
            </div>

            {/* Referral Section */}
            <div className="border-t border-violet-200/50 dark:border-violet-800/30 pt-4">
              <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-violet-600" /> Your Referral Code
              </p>
              <div className="flex items-center gap-2 mb-3">
                <code className="bg-background border rounded-lg px-3 py-1.5 text-sm font-mono font-bold tracking-widest text-violet-600">
                  {credits.referral_code}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(credits.referral_code)
                  }}
                >
                  Copy
                </Button>
                <span className="text-xs text-muted-foreground">Share this to earn +5 credits per referral</span>
              </div>

              {!credits.referred_by && (
                <div>
                  <p className="text-sm font-semibold mb-2">Have a friend's referral code?</p>
                  <div className="flex gap-2">
                    <Input
                      value={referralInput}
                      onChange={e => setReferralInput(e.target.value.toUpperCase())}
                      placeholder="Enter code e.g. AB12CD"
                      className="max-w-xs h-9 text-sm font-mono uppercase"
                      maxLength={12}
                    />
                    <Button
                      size="sm"
                      onClick={applyReferral}
                      disabled={applyingReferral || !referralInput.trim()}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {applyingReferral ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {referralMsg && (
                    <p className={`text-xs mt-1.5 ${referralMsg.type === "success" ? "text-green-600" : "text-destructive"}`}>
                      {referralMsg.text}
                    </p>
                  )}
                </div>
              )}

              {credits.referred_by && (
                <p className="text-xs text-muted-foreground">
                  ✅ You applied referral code <code className="font-mono">{credits.referred_by}</code>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden shadow-lg shadow-black/5">
          {/* Tab bar */}
          <div className="flex border-b border-border/50 overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">

            {/* QUIZ HISTORY */}
            {tab === "history" && (
              <div>
                {quizResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                      <Trophy className="h-7 w-7 text-amber-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">No quizzes yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Take your first quiz to see your history here</p>
                    </div>
                    <Button asChild className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      <Link href="/quiz"><Zap className="h-4 w-4" />Browse Quizzes</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quizResults.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-border/40 hover:border-border/70 hover:bg-muted/20 transition-all group"
                      >
                        {/* Score circle */}
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-xs font-extrabold ${
                          Number(r.percentage) >= 75 ? "bg-emerald-500/10 text-emerald-600" :
                          Number(r.percentage) >= 50 ? "bg-amber-500/10 text-amber-600" :
                          "bg-red-500/10 text-red-600"
                        }`}>
                          {Number(r.percentage).toFixed(0)}%
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{r.quiz_title || "Unknown Quiz"}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-emerald-500" />{r.correct} correct
                            </span>
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-red-500" />{r.wrong} wrong
                            </span>
                            {r.skipped > 0 && (
                              <span className="flex items-center gap-1">
                                <SkipForward className="h-3 w-3 text-muted-foreground" />{r.skipped} skipped
                              </span>
                            )}
                            <span className="flex items-center gap-1 hidden sm:flex">
                              <Clock className="h-3 w-3" />{formatTime(r.total_time)}
                            </span>
                          </div>
                        </div>

                        {/* Date + reattempt */}
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-muted-foreground">{formatDate(r.created_at)}</p>
                          {r.quiz_id && (
                            <Link
                              href={`/quiz/${r.quiz_id}`}
                              className="text-[11px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-0.5 mt-0.5"
                            >
                              Retry <ChevronRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SAVED PDFs */}
            {tab === "saved" && (
              <div>
                {favoritePdfs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                      <Star className="h-7 w-7 text-rose-500" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">No saved PDFs yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Tap the bookmark icon on any PDF to save it here</p>
                    </div>
                    <Button asChild className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      <Link href="/"><BookOpen className="h-4 w-4" />Browse PDFs</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {favoritePdfs.map((pdf) => (
                      <Link
                        key={pdf.id}
                        href={`/pdf/${pdf.id}`}
                        className="flex items-start gap-3 p-3.5 rounded-xl border border-border/40 hover:border-primary/40 hover:bg-primary/3 transition-all group"
                      >
                        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{pdf.title}</p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                            <span className="flex items-center gap-1">
                              <Download className="h-3 w-3" />{pdf.download_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />{pdf.view_count ?? 0} views
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RECENTLY VIEWED */}
            {tab === "recent" && (
              <div>
                {recentItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Nothing viewed yet</p>
                      <p className="text-sm text-muted-foreground mt-1">PDFs and quizzes you open will appear here</p>
                    </div>
                    <Button asChild className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      <Link href="/"><BookOpen className="h-4 w-4" />Browse Library</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentItems.map((item) => {
                      const isQuiz = item.type === "quiz"
                      const accent = isQuiz ? "#f59e0b" : (item.categoryColor || "#6366f1")
                      const href = isQuiz ? `/quiz/${item.id}` : `/pdf/${item.id}`
                      return (
                        <Link
                          key={`${item.type}-${item.id}`}
                          href={href}
                          className="flex items-center gap-3 p-3.5 rounded-xl border border-border/40 hover:border-border/70 hover:bg-muted/20 transition-all group"
                        >
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${accent}18` }}
                          >
                            {isQuiz
                              ? <Trophy className="h-5 w-5" style={{ color: accent }} />
                              : <FileText className="h-5 w-5" style={{ color: accent }} />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{item.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                                style={{ backgroundColor: `${accent}18`, color: accent }}
                              >
                                {isQuiz ? "Quiz" : "PDF"}
                              </span>
                              {!isQuiz && item.categoryName && (
                                <span className="text-[10px] text-muted-foreground">{item.categoryName}</span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {(() => {
                              const diff = Date.now() - new Date(item.viewedAt).getTime()
                              const mins = Math.floor(diff / 60000)
                              const hours = Math.floor(diff / 3600000)
                              const days = Math.floor(diff / 86400000)
                              if (mins < 1) return "Just now"
                              if (mins < 60) return `${mins}m ago`
                              if (hours < 24) return `${hours}h ago`
                              return `${days}d ago`
                            })()}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SETTINGS */}
            {tab === "settings" && (
              <div className="max-w-md space-y-6">
                <div>
                  <h3 className="text-base font-bold mb-1">Display Name</h3>
                  <p className="text-sm text-muted-foreground mb-3">This name appears on the leaderboard when you complete quizzes.</p>

                  {editingName ? (
                    <div className="space-y-3">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Your display name"
                        className="font-medium"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveName()
                          if (e.key === "Escape") setEditingName(false)
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleSaveName} disabled={savingName || !newName.trim()} className="gap-2 flex-1">
                          {savingName ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {savingName ? "Saving…" : "Save"}
                        </Button>
                        <Button variant="outline" onClick={() => { setEditingName(false); setNewName(data.user.name) }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-muted/30">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-white">{initial}</span>
                      </div>
                      <span className="flex-1 font-semibold">{user.name}</span>
                      <Button variant="ghost" size="sm" onClick={() => setEditingName(true)} className="gap-1.5 h-8 px-3">
                        <Edit2 className="h-3.5 w-3.5" />Edit
                      </Button>
                    </div>
                  )}

                  {nameMsg && (
                    <p className={`mt-2 text-sm font-medium flex items-center gap-1.5 ${nameMsg.type === "success" ? "text-emerald-600" : "text-destructive"}`}>
                      {nameMsg.type === "success" ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      {nameMsg.text}
                    </p>
                  )}
                </div>

                {/* Account info */}
                <div>
                  <h3 className="text-base font-bold mb-3">Account Info</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Email", value: user.email, icon: <User className="h-4 w-4" /> },
                      { label: "Member Since", value: memberSince, icon: <Calendar className="h-4 w-4" /> },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/20">
                        <div className="text-muted-foreground">{item.icon}</div>
                        <div>
                          <p className="text-[11px] text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-medium">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sign out */}
                <div className="pt-2 border-t border-border/50">
                  <Button variant="outline" onClick={signOut} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                    <LogOut className="h-4 w-4" />Sign Out
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
