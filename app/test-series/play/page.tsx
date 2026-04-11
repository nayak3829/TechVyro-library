"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { QuizPlayer } from "@/components/quiz/quiz-player"
import { AuthModal } from "@/components/auth-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import {
  Loader2, AlertCircle, ArrowLeft, Lock, Trophy,
  Clock, FileText, CheckCircle2, Maximize2, Minimize2,
  RefreshCw, Shield, Play
} from "lucide-react"

interface Question {
  qid: string
  question: string
  options: string[]
  correct: number
  marks: number
  explanation: string
}

const ATTEMPT_KEY = "techvyro_test_attempts"

function recordAttempt(testId: string) {
  try {
    const all = JSON.parse(localStorage.getItem(ATTEMPT_KEY) || "{}")
    const prev = all[testId] || { count: 0, lastAt: "" }
    all[testId] = { ...prev, count: prev.count + 1, lastAt: new Date().toISOString() }
    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(all))
  } catch {}
}

function cleanTitle(title: string): string {
  const patterns = [
    /\s*by\s+\w+\s*(academy|classes|institute|coaching)?/gi,
    /\s*-\s*\w+\s*(academy|classes|institute)?$/gi,
    /^\w+\s*(academy|classes|institute)?\s*-\s*/gi,
    /\(\w+\s*(app|academy|classes)?\)/gi,
  ]
  let cleaned = title
  for (const p of patterns) cleaned = cleaned.replace(p, "")
  return cleaned.trim() || title
}

function PlayContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [localUser, setLocalUser] = useState(user)

  // Update local user state when auth changes
  useEffect(() => {
    setLocalUser(user)
  }, [user])

  const testId = searchParams.get("testId") || ""
  const apiBase = searchParams.get("apiBase") || ""
  const rawTitle = searchParams.get("title") || "Practice Test"
  const title = cleanTitle(rawTitle)
  const platformName = searchParams.get("platform") || searchParams.get("seriesTitle") || "TechVyro Mock Test"
  const duration = parseInt(searchParams.get("duration") || "60")

  const isSample = apiBase.startsWith("sample:")

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [started, setStarted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!testId && !apiBase) router.replace("/test-series")
  }, [testId, apiBase, router])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const fetchQuestions = async () => {
    setLoading(true)
    setError("")
    try {
      const p = new URLSearchParams({ testId, apiBase })
      const res = await fetch(`/api/extract/questions?${p}`)
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error || "Could not load questions"); return }
      if (!data.questions || data.questions.length === 0) { setError("No questions found. This test may be empty or under maintenance."); return }
      setQuestions(data.questions)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async () => {
    if (!localUser && !isSample) { setShowAuthModal(true); return }
    recordAttempt(testId)
    await fetchQuestions()
    setStarted(true)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const userName = localUser
    ? (localUser.user_metadata?.full_name as string | undefined)
      || (localUser.user_metadata?.name as string | undefined)
      || localUser.email?.split("@")[0] || ""
    : "Guest"

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (started && loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <div className="text-center">
          <p className="font-semibold text-lg">Loading Questions...</p>
          <p className="text-sm text-muted-foreground mt-1">Fetching from {platformName}</p>
        </div>
      </div>
    )
  }

  if (started && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Could Not Load Test</h2>
          <p className="text-muted-foreground mb-6 text-sm">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setStarted(false); setError("") }} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
            <Button onClick={() => { setError(""); handleStart() }} className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 gap-2">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (started && questions.length > 0) {
    return (
      <div ref={containerRef} className="min-h-screen">
        <div className="sticky top-0 z-50 bg-background border-b border-border/60 shadow-sm">
          <div className="container mx-auto px-4 h-12 flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStarted(false); setQuestions([]) }}
              className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0 h-8"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{title}</p>
            </div>
            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30 hidden sm:flex gap-1">
              <Shield className="h-2.5 w-2.5" /> TechVyro
            </Badge>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8 shrink-0">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <QuizPlayer
          title={title}
          questions={questions}
          timeLimit={duration}
          userName={userName}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showAuthModal && (
        <AuthModal onClose={() => {
          setShowAuthModal(false)
          // Force refresh auth state
          router.refresh()
        }} />
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background border-b border-border/60 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{platformName}</p>
          </div>
          <Badge variant="outline" className="text-xs gap-1 hidden sm:flex">
            <Clock className="h-3 w-3" /> {duration} min
          </Badge>
        </div>
      </div>

      {/* Pre-start screen */}
      <div className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-lg">
          {/* Hero */}
          <div className="bg-gradient-to-br from-primary via-primary/90 to-accent rounded-2xl p-8 text-white text-center mb-6 shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold mb-2 leading-snug">{title}</h1>
              <p className="text-white/80 text-sm mb-5">{platformName}</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-sm">
                  <Clock className="h-4 w-4" /> {duration} min
                </div>
                <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-sm">
                  <FileText className="h-4 w-4" /> MCQ Format
                </div>
                <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Auto Graded
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 mb-5 space-y-2">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" /> Instructions
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
              <li>Read each question carefully before answering</li>
              <li>Timer starts immediately when you click &quot;Start Test&quot;</li>
              <li>Do not refresh the page during the test</li>
              <li>Results and score shown automatically at the end</li>
            </ul>
          </div>

          {/* Start Test Button - same UI for logged in and logged out */}
          <Button
            onClick={handleStart}
            disabled={loading}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 gap-2 shadow-lg"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
            {loading ? "Loading Questions..." : "Start Test Now"}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            All tests run inside TechVyro - no external websites
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PlayContent />
    </Suspense>
  )
}
