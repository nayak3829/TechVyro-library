"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { 
  Clock, ChevronLeft, ChevronRight, Star, Trash2, Send, 
  Moon, Sun, CheckCircle, XCircle, Eye, FileText, RotateCcw,
  AlertTriangle, Home, Trophy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

interface Question {
  qid: string
  question: string
  options: string[]
  correct: number
  marks: number
  explanation?: string
}

interface QuizPlayerProps {
  title: string
  quizId?: string
  questions: Question[]
  timeLimit: number
  onComplete?: (result: QuizResult) => void
}

const LEADERBOARD_KEY = "techvyro-leaderboard" // kept for theme only

interface LeaderboardEntry {
  id: string
  name: string
  score: number
  percentage: number
  correct: number
  wrong: number
  skipped: number
  totalTime: number
  quizId: string
  quizTitle: string
  timestamp: string
}

interface QuizResult {
  score: number
  correct: number
  wrong: number
  skipped: number
  totalTime: number
  answers: Record<number, number>
  questionTimes: number[]
}

export function QuizPlayer({ title, quizId, questions, timeLimit, onComplete }: QuizPlayerProps) {
  const [started, setStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [marked, setMarked] = useState<boolean[]>([])
  const [visited, setVisited] = useState<boolean[]>([])
  const [questionTimes, setQuestionTimes] = useState<number[]>([])
  const [timeRemaining, setTimeRemaining] = useState(timeLimit)
  const [submitted, setSubmitted] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [playerName, setPlayerName] = useState("")
  const [nameEntered, setNameEntered] = useState(false)
  const [savedToLeaderboard, setSavedToLeaderboard] = useState(false)
  const [topLeaderboard, setTopLeaderboard] = useState<LeaderboardEntry[]>([])
  
  const questionStartRef = useRef<number>(Date.now())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize arrays when questions change
  useEffect(() => {
    if (questions.length > 0) {
      setMarked(new Array(questions.length).fill(false))
      setVisited(new Array(questions.length).fill(false))
      setQuestionTimes(new Array(questions.length).fill(0))
    }
  }, [questions.length])

  // Timer
  useEffect(() => {
    if (!started || submitted) return
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleAutoSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [started, submitted])

  // Theme persistence and load leaderboard
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = sessionStorage.getItem("quiz-theme")
      if (savedTheme === "dark") setDarkMode(true)
      
      // Load top leaderboard entries for this quiz from API
      fetch("/api/quiz-results")
        .then(r => r.json())
        .then(data => {
          const all: LeaderboardEntry[] = (data.results || []).map((e: any) => ({
            id: e.id,
            name: e.name,
            score: e.score,
            percentage: Number(e.percentage),
            correct: e.correct,
            wrong: e.wrong,
            skipped: e.skipped,
            totalTime: e.total_time,
            quizId: e.quiz_id,
            quizTitle: e.quiz_title,
            timestamp: e.created_at,
          }))
          const forThisQuiz = all
            .filter(e => !quizId || e.quizId === quizId)
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 5)
          setTopLeaderboard(forThisQuiz)
        })
        .catch(() => {})
    }
  }, [quizId])

  // Keyboard navigation
  useEffect(() => {
    if (!started || submitted) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.key === "ArrowLeft") handlePrev()
      else if (e.key === "ArrowRight") handleNext()
      else if (e.key === "m" || e.key === "M") handleMark()
      else if (e.key >= "1" && e.key <= "5") {
        const optIndex = parseInt(e.key)
        if (questions[currentIndex] && optIndex <= questions[currentIndex].options.length) {
          handleAnswer(optIndex)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [started, submitted, currentIndex, questions])

  // Prevent leaving mid-quiz (back button + refresh/close)
  useEffect(() => {
    if (!started || submitted) return

    // Push a history state so back button triggers popstate
    window.history.pushState(null, "", window.location.href)

    const handlePopState = () => {
      // Push state back to prevent actual navigation
      window.history.pushState(null, "", window.location.href)
      setShowExitWarning(true)
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("popstate", handlePopState)
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("popstate", handlePopState)
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [started, submitted])

  const toggleTheme = () => {
    setDarkMode(prev => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("quiz-theme", !prev ? "dark" : "light")
      }
      return !prev
    })
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleNameSubmit = () => {
    if (!playerName.trim()) return
    setNameEntered(true)
  }

  const handleStart = () => {
    if (!nameEntered || !playerName.trim()) return
    setStarted(true)
    questionStartRef.current = Date.now()
    setVisited(prev => {
      const updated = [...prev]
      updated[0] = true
      return updated
    })
  }

  const handleAnswer = (optionIndex: number) => {
    if (submitted || reviewMode) return
    setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }))
  }

  const handleClearResponse = () => {
    if (submitted || reviewMode) return
    setAnswers(prev => {
      const updated = { ...prev }
      delete updated[currentIndex]
      return updated
    })
  }

  const handleMark = () => {
    if (submitted || reviewMode) return
    setMarked(prev => {
      const updated = [...prev]
      updated[currentIndex] = !updated[currentIndex]
      return updated
    })
  }

  const saveCurrentQuestionTime = () => {
    const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
    setQuestionTimes(prev => {
      const updated = [...prev]
      updated[currentIndex] = (updated[currentIndex] || 0) + elapsed
      return updated
    })
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1)
    }
  }

  const goToQuestion = (index: number) => {
    if (!reviewMode) {
      saveCurrentQuestionTime()
    }
    
    setCurrentIndex(index)
    questionStartRef.current = Date.now()
    
    if (!reviewMode) {
      setVisited(prev => {
        const updated = [...prev]
        updated[index] = true
        return updated
      })
    }
  }

  const calculateResults = useCallback(() => {
    let correct = 0, wrong = 0, skipped = 0
    questions.forEach((q, i) => {
      if (answers[i] === undefined) skipped++
      else if (answers[i] === q.correct) correct++
      else wrong++
    })

    const score = correct - (wrong * 0.25)
    return { score, correct, wrong, skipped }
  }, [questions, answers])

  const handleAutoSubmit = useCallback(() => {
    if (submitted) return
    if (timerRef.current) clearInterval(timerRef.current)
    saveCurrentQuestionTime()
    setSubmitted(true)
    
    const { score, correct, wrong, skipped } = calculateResults()
    const result: QuizResult = {
      score,
      correct,
      wrong,
      skipped,
      totalTime: timeLimit - timeRemaining,
      answers,
      questionTimes
    }
    onComplete?.(result)
    
    // Auto save to leaderboard
    if (playerName.trim()) {
      const percentage = Math.round((correct / questions.length) * 100)
      const totalTime = timeLimit - timeRemaining
      
      const entry: LeaderboardEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: playerName.trim(),
        score,
        percentage,
        correct,
        wrong,
        skipped,
        totalTime,
        quizId: quizId || "unknown",
        quizTitle: title,
        timestamp: new Date().toISOString()
      }
      
      fetch("/api/quiz-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          name: entry.name,
          score: entry.score,
          percentage: entry.percentage,
          correct: entry.correct,
          wrong: entry.wrong,
          skipped: entry.skipped,
          totalTime: entry.totalTime,
          quizId: entry.quizId,
          quizTitle: entry.quizTitle,
          timestamp: entry.timestamp,
        }),
      })
        .then(() => {
          setSavedToLeaderboard(true)
          setTopLeaderboard(prev => {
            const updated = [entry, ...prev].sort((a, b) => b.percentage - a.percentage).slice(0, 5)
            return updated
          })
        })
        .catch(() => {})
    }
  }, [submitted, timeLimit, timeRemaining, answers, questionTimes, calculateResults, onComplete, playerName, questions.length, quizId, title])

  const handleSubmit = () => {
    const unanswered = questions.length - Object.keys(answers).length
    if (unanswered > 0) {
      setShowConfirmSubmit(true)
      return
    }
    confirmSubmit()
  }

  const confirmSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    saveCurrentQuestionTime()
    setSubmitted(true)
    setShowConfirmSubmit(false)
    
    const { score, correct, wrong, skipped } = calculateResults()
    const result: QuizResult = {
      score,
      correct,
      wrong,
      skipped,
      totalTime: timeLimit - timeRemaining,
      answers,
      questionTimes
    }
    onComplete?.(result)
    
    // Auto save to leaderboard since we already have the name
    if (playerName.trim()) {
      const percentage = Math.round((correct / questions.length) * 100)
      const totalTime = timeLimit - timeRemaining
      
      const entry: LeaderboardEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: playerName.trim(),
        score,
        percentage,
        correct,
        wrong,
        skipped,
        totalTime,
        quizId: quizId || "unknown",
        quizTitle: title,
        timestamp: new Date().toISOString()
      }
      
      fetch("/api/quiz-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          name: entry.name,
          score: entry.score,
          percentage: entry.percentage,
          correct: entry.correct,
          wrong: entry.wrong,
          skipped: entry.skipped,
          totalTime: entry.totalTime,
          quizId: entry.quizId,
          quizTitle: entry.quizTitle,
          timestamp: entry.timestamp,
        }),
      })
        .then(() => {
          setSavedToLeaderboard(true)
          setTopLeaderboard(prev => {
            const updated = [entry, ...prev].sort((a, b) => b.percentage - a.percentage).slice(0, 5)
            return updated
          })
        })
        .catch(() => {})
    }
  }

  const handleReview = () => {
    setReviewMode(true)
    setCurrentIndex(0)
  }

  const handleRestart = () => {
    setStarted(false)
    setSubmitted(false)
    setReviewMode(false)
    setCurrentIndex(0)
    setAnswers({})
    setMarked(new Array(questions.length).fill(false))
    setVisited(new Array(questions.length).fill(false))
    setQuestionTimes(new Array(questions.length).fill(0))
    setTimeRemaining(timeLimit)
    setShowConfirmSubmit(false)
    setSavedToLeaderboard(false)
    // Keep the name for next attempt
  }

  // Stats
  const answeredCount = Object.keys(answers).length
  const notAnsweredCount = questions.length - answeredCount
  const notVisitedCount = visited.filter(v => !v).length
  const markedCount = marked.filter(Boolean).length

  const currentQuestion = questions[currentIndex]

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Quiz Error</h2>
          <p className="text-muted-foreground mb-4">No questions found in this quiz.</p>
          <Button asChild>
            <Link href="/quiz">Back to Quizzes</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Start Screen
  if (!started) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-primary/15 via-accent/8 to-background"}`}>
        {/* Decorative orbs */}
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full blur-3xl opacity-20 bg-primary" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl opacity-15 bg-accent" />

        <div className={`relative max-w-xl w-full rounded-3xl border shadow-2xl overflow-hidden ${darkMode ? "bg-gray-800 border-gray-700" : "bg-card/95 backdrop-blur-sm border-border/60"}`}>
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="p-6 sm:p-8 text-center">
            {/* Brand */}
            <div className="mb-5">
              <Link href="/" className="inline-flex items-center gap-1 text-2xl font-extrabold">
                <span className="text-primary">Tech</span>
                <span className={darkMode ? "text-white" : "text-foreground"}>Vyro</span>
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">Quiz Platform</p>
            </div>

            <h1 className={`text-lg sm:text-2xl font-extrabold mb-6 leading-snug ${darkMode ? "text-white" : "text-foreground"}`}>
              {title}
            </h1>

            {/* Name Input Section */}
            {!nameEntered ? (
              <div className={`p-5 rounded-2xl mb-5 ${darkMode ? "bg-gray-700/80 border border-gray-600" : "bg-primary/5 border border-primary/20"}`}>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-base font-bold">Enter Your Name</h2>
                </div>
                <p className={`text-xs mb-4 ${darkMode ? "text-gray-300" : "text-muted-foreground"}`}>
                  Your name will appear on the leaderboard after completing this quiz
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full px-4 py-3 rounded-xl border text-center text-base font-semibold ${
                      darkMode
                        ? "bg-gray-600 border-gray-500 text-white placeholder:text-gray-400"
                        : "bg-background border-border focus:border-primary"
                    } focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all`}
                    onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                    autoFocus
                  />
                  <Button
                    size="lg"
                    className="w-full font-bold py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20"
                    onClick={handleNameSubmit}
                    disabled={!playerName.trim()}
                  >
                    Continue →
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Welcome pill */}
                <div className={`inline-flex items-center justify-center gap-2 mb-5 px-4 py-2 rounded-full text-sm ${darkMode ? "bg-green-900/40 text-green-400 border border-green-800" : "bg-green-50 text-green-700 border border-green-200"}`}>
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-semibold">Welcome, {playerName}!</span>
                  <button onClick={() => setNameEntered(false)} className="text-xs opacity-60 hover:opacity-100 underline transition-opacity">Edit</button>
                </div>

                {/* Quick info chips */}
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {[
                    { icon: <FileText className="h-4 w-4 text-primary" />, label: `${questions.length} Questions`, bg: darkMode ? "bg-gray-700 border-gray-600" : "bg-primary/5 border-primary/15" },
                    { icon: <Clock className="h-4 w-4 text-accent" />, label: `${Math.floor(timeLimit / 60)} Minutes`, bg: darkMode ? "bg-gray-700 border-gray-600" : "bg-accent/5 border-accent/15" },
                    { icon: <CheckCircle className="h-4 w-4 text-green-500" />, label: "+1 Correct", bg: darkMode ? "bg-gray-700 border-gray-600" : "bg-green-500/5 border-green-500/15" },
                    { icon: <XCircle className="h-4 w-4 text-red-500" />, label: "−0.25 Wrong", bg: darkMode ? "bg-gray-700 border-gray-600" : "bg-red-500/5 border-red-500/15" },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-2.5 p-3 rounded-xl border text-left ${item.bg}`}>
                      {item.icon}
                      <span className={`text-xs font-semibold ${darkMode ? "text-gray-200" : "text-foreground"}`}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground mb-5">
                  Tip: Use arrow keys to navigate · 1–5 to select · M to mark for review
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="flex-1 font-bold py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20"
                    onClick={handleStart}
                  >
                    Start Test →
                  </Button>
                  <Button variant="outline" size="lg" asChild className="py-6">
                    <Link href="/quiz">
                      <Home className="h-4 w-4 mr-2" />
                      All Quizzes
                    </Link>
                  </Button>
                </div>
              </>
            )}

            {!nameEntered && (
              <div className="mt-4">
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                  <Link href="/quiz">
                    <Home className="h-4 w-4 mr-2" />
                    Back to All Quizzes
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Result Screen
  if (submitted && !reviewMode) {
    const { score, correct, wrong, skipped } = calculateResults()
    const accuracy = answeredCount > 0 ? ((correct / answeredCount) * 100).toFixed(1) : "0"
    const totalTime = timeLimit - timeRemaining
    const percentage = ((correct / questions.length) * 100).toFixed(0)
    const pct = parseFloat(percentage)
    const grade = pct >= 80 ? "Excellent!" : pct >= 60 ? "Good Job!" : pct >= 40 ? "Keep Practicing" : "Needs Improvement"
    const gradeColor = pct >= 70 ? "text-green-500" : pct >= 40 ? "text-amber-500" : "text-red-500"
    const ringColor = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444"

    return (
      <div className={`min-h-screen p-4 relative overflow-hidden ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-primary/10 via-accent/5 to-background"}`}>
        <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full blur-3xl opacity-15" style={{ backgroundColor: ringColor }} />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-3xl opacity-10 bg-primary" />

        <div className={`relative max-w-2xl mx-auto rounded-3xl border shadow-2xl overflow-hidden ${darkMode ? "bg-gray-800 border-gray-700" : "bg-card border-border/60"}`}>
          {/* Top bar */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${ringColor}, ${ringColor}88)` }} />

          <div className="p-5 sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <Link href="/" className="inline-flex items-center gap-1 text-xl font-extrabold mb-3">
                <span className="text-primary">Tech</span>
                <span className={darkMode ? "text-white" : "text-foreground"}>Vyro</span>
              </Link>
              <h2 className={`text-xl sm:text-2xl font-extrabold mb-1 ${darkMode ? "text-white" : "text-foreground"}`}>Performance Summary</h2>
              <p className="text-sm text-muted-foreground truncate">{title}</p>
            </div>

            {/* Score ring + grade */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="relative flex items-center justify-center rounded-full"
                style={{ width: 140, height: 140, background: `conic-gradient(${ringColor} ${pct * 3.6}deg, transparent 0deg)` }}
              >
                <div className={`absolute inset-2 rounded-full flex flex-col items-center justify-center ${darkMode ? "bg-gray-800" : "bg-card"}`}>
                  <span className={`text-3xl font-extrabold ${gradeColor}`}>{percentage}%</span>
                  <span className="text-[10px] text-muted-foreground">Score</span>
                </div>
              </div>
              <span className={`mt-2 text-base font-bold ${gradeColor}`}>{grade}</span>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
              {[
                { label: "Total Score", value: score.toFixed(1), color: "text-primary", bg: darkMode ? "bg-gray-700 border-gray-600" : "bg-primary/8 border-primary/20" },
                { label: "Correct", value: correct, color: "text-green-500", bg: darkMode ? "bg-gray-700 border-gray-600" : "bg-green-500/8 border-green-500/20" },
                { label: "Wrong", value: wrong, color: "text-red-500", bg: darkMode ? "bg-gray-700 border-gray-600" : "bg-red-500/8 border-red-500/20" },
                { label: "Skipped", value: skipped, color: "text-amber-500", bg: darkMode ? "bg-gray-700 border-gray-600" : "bg-amber-500/8 border-amber-500/20" },
              ].map(s => (
                <div key={s.label} className={`p-3 rounded-2xl border text-center ${s.bg}`}>
                  <div className={`text-2xl sm:text-3xl font-extrabold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Accuracy + time */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-gray-700 border-gray-600" : "bg-muted/40 border-border/50"}`}>
                <div className={`text-lg font-bold ${darkMode ? "text-white" : "text-foreground"}`}>{accuracy}%</div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${darkMode ? "bg-gray-700 border-gray-600" : "bg-muted/40 border-border/50"}`}>
                <div className={`text-lg font-bold ${darkMode ? "text-white" : "text-foreground"}`}>{formatTime(totalTime)}</div>
                <div className="text-xs text-muted-foreground">Time Taken</div>
              </div>
            </div>

            {/* Saved confirmation */}
            <div className={`flex items-center gap-2 p-3 rounded-xl mb-5 ${darkMode ? "bg-green-900/30 border border-green-800" : "bg-green-50 border border-green-200"}`}>
              <Trophy className="h-4 w-4 text-green-500 shrink-0" />
              <span className={`text-xs font-semibold ${darkMode ? "text-green-400" : "text-green-700"}`}>
                Score saved to leaderboard for: {playerName}
              </span>
            </div>

            {/* Mini Leaderboard */}
            {topLeaderboard.length > 0 && (
              <div className={`p-4 rounded-2xl border mb-5 ${darkMode ? "bg-gray-700 border-gray-600" : "bg-muted/30 border-border/50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h3 className={`text-sm font-bold ${darkMode ? "text-white" : "text-foreground"}`}>Top Performers</h3>
                </div>
                <div className="space-y-1.5">
                  {topLeaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs ${
                        index === 0 ? "bg-amber-500/15" :
                        index === 1 ? "bg-gray-400/15" :
                        index === 2 ? "bg-amber-700/15" :
                        darkMode ? "bg-gray-600/40" : "bg-background/60"
                      }`}
                    >
                      <span className={`font-extrabold w-5 text-center ${
                        index === 0 ? "text-amber-500" :
                        index === 1 ? "text-gray-400" :
                        index === 2 ? "text-amber-700" : "text-muted-foreground"
                      }`}>{index + 1}</span>
                      <span className={`flex-1 truncate font-medium ${darkMode ? "text-gray-200" : "text-foreground"}`}>{entry.name}</span>
                      <span className={`font-bold ${
                        entry.percentage >= 70 ? "text-green-500" :
                        entry.percentage >= 40 ? "text-amber-500" : "text-red-500"
                      }`}>{entry.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1" onClick={handleReview}>
                <Eye className="h-4 w-4 mr-2" />
                Review Answers
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={handleRestart}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <Link href="/quiz" className="hover:text-primary transition-colors">More Quizzes</Link>
              <span>•</span>
              <Link href="/quiz/leaderboard" className="hover:text-primary transition-colors">View Leaderboard</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quiz Screen
  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-background"}`}>
      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className={`max-w-md w-full p-6 ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
              <h3 className="text-lg font-bold mb-2">Confirm Submission</h3>
              <p className="text-muted-foreground mb-4">
                You have {questions.length - Object.keys(answers).length} unanswered questions.
                Are you sure you want to submit?
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowConfirmSubmit(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={confirmSubmit}
                >
                  Submit Anyway
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Exit Warning Modal — shown when user tries to go back mid-quiz */}
      {showExitWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className={`max-w-md w-full p-6 ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
            <div className="text-center">
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-1">Quiz In Progress!</h3>
              <p className={`text-sm mb-1 ${darkMode ? "text-gray-300" : "text-muted-foreground"}`}>
                Are you sure you want to leave?
              </p>
              <p className={`text-xs mb-5 ${darkMode ? "text-gray-400" : "text-muted-foreground/80"}`}>
                Please <strong>submit the quiz first</strong> to save your score on the leaderboard. If you leave now, your progress will be lost.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white order-first"
                  onClick={() => {
                    setShowExitWarning(false)
                    confirmSubmit()
                  }}
                >
                  <Send className="h-4 w-4 mr-1.5" />
                  Submit & Leave
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowExitWarning(false)}
                >
                  Continue Quiz
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className={`sticky top-0 z-40 p-2 sm:p-3 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-background/95 backdrop-blur border-border"}`}>
        <div className="container mx-auto flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-1 font-bold text-sm sm:text-base">
            <span className="text-red-500">Tech</span>
            <span>Vyro</span>
          </Link>
          
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </Button>
            
            {!reviewMode && (
              <Button 
                variant="default" 
                size="sm"
                onClick={handleSubmit}
                className="bg-green-500 hover:bg-green-600 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Submit</span>
              </Button>
            )}
            
            {reviewMode && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRestart}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Restart</span>
              </Button>
            )}
            
            <div className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full font-bold text-white text-xs sm:text-sm ${
              timeRemaining <= 300 
                ? "bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" 
                : "bg-gradient-to-r from-primary to-accent"
            }`}>
              <Clock className="inline h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-2 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          {/* Question Panel */}
          <div className="flex-1 order-2 lg:order-1">
            <Card className={`p-3 sm:p-6 ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
              {/* Question Header */}
              <div className="flex items-center justify-between border-b pb-2 sm:pb-4 mb-3 sm:mb-4 border-primary">
                <span className="text-sm sm:text-lg font-bold text-primary">
                  Q {currentIndex + 1} / {questions.length}
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {reviewMode && (
                    <Badge className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                      Time: {formatTime(questionTimes[currentIndex] || 0)}
                    </Badge>
                  )}
                  <Badge className="bg-green-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2">
                    {currentQuestion.marks} mark{currentQuestion.marks > 1 ? "s" : ""}
                  </Badge>
                </div>
              </div>

              {/* Question Text */}
              <div 
                className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 border-l-4 border-primary text-xs sm:text-base leading-relaxed ${darkMode ? "bg-gray-700" : "bg-muted/50"}`}
                dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
              />

              {/* Options */}
              <div className="space-y-2 sm:space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const optionNum = idx + 1
                  const isSelected = answers[currentIndex] === optionNum
                  const isCorrect = currentQuestion.correct === optionNum
                  const userAnsweredWrong = reviewMode && isSelected && !isCorrect
                  const showAsCorrect = reviewMode && isCorrect

                  return (
                    <div
                      key={idx}
                      onClick={() => !reviewMode && handleAnswer(optionNum)}
                      className={`p-2.5 sm:p-4 rounded-lg border-2 cursor-pointer flex items-center gap-2 sm:gap-3 transition-all text-xs sm:text-base ${
                        reviewMode
                          ? showAsCorrect
                            ? "bg-green-100 border-green-500 dark:bg-green-900/30"
                            : userAnsweredWrong
                              ? "bg-red-100 border-red-500 dark:bg-red-900/30"
                              : darkMode ? "bg-gray-700 border-gray-600" : "bg-muted/30 border-border"
                          : isSelected
                            ? "bg-primary/10 border-primary"
                            : darkMode 
                              ? "bg-gray-700 border-gray-600 hover:bg-gray-600" 
                              : "bg-muted/30 border-border hover:bg-primary/5 hover:border-primary"
                      }`}
                    >
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs sm:text-sm ${
                        reviewMode
                          ? showAsCorrect
                            ? "bg-green-500 text-white"
                            : userAnsweredWrong
                              ? "bg-red-500 text-white"
                              : "bg-muted text-muted-foreground"
                          : isSelected
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span 
                        className="flex-1 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: option }}
                      />
                      {reviewMode && showAsCorrect && (
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
                      )}
                      {reviewMode && userAnsweredWrong && (
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Solution in review mode */}
              {reviewMode && currentQuestion.explanation && (
                <details className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"}`}>
                  <summary className="cursor-pointer font-bold text-primary text-xs sm:text-sm">View Solution</summary>
                  <div 
                    className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border text-xs sm:text-sm"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                  />
                </details>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  size="sm"
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline ml-0.5">Prev</span>
                </Button>
                
                {!reviewMode && (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleClearResponse}
                      disabled={!answers[currentIndex]}
                      className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Clear</span>
                    </Button>
                    <Button 
                      variant={marked[currentIndex] ? "default" : "outline"}
                      size="sm"
                      onClick={handleMark}
                      className={`h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm ${marked[currentIndex] ? "bg-purple-500 hover:bg-purple-600" : ""}`}
                    >
                      <Star className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${marked[currentIndex] ? "fill-white" : ""}`} />
                      <span className="hidden sm:inline ml-1">Mark</span>
                    </Button>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                  size="sm"
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <span className="hidden xs:inline mr-0.5">Next</span>
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Palette Panel */}
          <div className="lg:w-72 order-1 lg:order-2">
            <Card className={`p-2 sm:p-4 ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
              {/* Status Legend */}
              {!reviewMode && (
                <div className={`grid grid-cols-2 gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 text-[10px] sm:text-xs ${darkMode ? "bg-gray-700" : "bg-muted/50"}`}>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-green-500 shrink-0"></div>
                    <span className="truncate">Answered ({answeredCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-500 shrink-0"></div>
                    <span className="truncate">Not Ans ({notAnsweredCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-gray-400 shrink-0"></div>
                    <span className="truncate">Not Visit ({notVisitedCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-purple-500 shrink-0"></div>
                    <span className="truncate">Marked ({markedCount})</span>
                  </div>
                </div>
              )}

              {/* Question Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-5 gap-1.5 sm:gap-2">
                {questions.map((_, idx) => {
                  const isAnswered = answers[idx] !== undefined
                  const isMarked = marked[idx]
                  const isVisited = visited[idx]
                  const isCurrent = idx === currentIndex
                  const isCorrect = reviewMode && answers[idx] === questions[idx].correct
                  const isWrong = reviewMode && answers[idx] !== undefined && answers[idx] !== questions[idx].correct

                  let bgColor = "bg-gray-300 dark:bg-gray-600"
                  if (reviewMode) {
                    if (isCorrect) bgColor = "bg-green-500"
                    else if (isWrong) bgColor = "bg-red-500"
                    else bgColor = "bg-amber-500"
                  } else {
                    if (isMarked) bgColor = "bg-purple-500"
                    else if (isAnswered) bgColor = "bg-green-500"
                    else if (isVisited) bgColor = "bg-red-500"
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => goToQuestion(idx)}
                      className={`w-full aspect-square rounded sm:rounded-lg flex items-center justify-center text-[10px] sm:text-sm font-bold transition-all ${bgColor} ${
                        isCurrent ? "ring-2 ring-primary ring-offset-1 sm:ring-offset-2" : ""
                      } ${!reviewMode && (isAnswered || isMarked) ? "text-white" : ""} ${
                        reviewMode ? "text-white" : ""
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              {/* Progress */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                <div className="flex justify-between text-[10px] sm:text-sm mb-1.5 sm:mb-2">
                  <span>Progress</span>
                  <span>{answeredCount}/{questions.length}</span>
                </div>
                <Progress value={(answeredCount / questions.length) * 100} className="h-1.5 sm:h-2" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
