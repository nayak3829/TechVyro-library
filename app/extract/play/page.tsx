"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { QuizPlayer } from "@/components/quiz/quiz-player"
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

interface Question {
  qid: string
  question: string
  options: string[]
  correct: number
  marks: number
  explanation: string
}

function PlayContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const testId = searchParams.get("testId") || ""
  const apiBase = searchParams.get("apiBase") || ""
  const title = searchParams.get("title") || "Extracted Test"
  const duration = parseInt(searchParams.get("duration") || "60")

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const isSample = apiBase.startsWith("sample:")

  useEffect(() => {
    if (authLoading) return
    if (!testId || !apiBase) {
      router.replace("/extract")
      return
    }
    // Sample tests: allow without login
    // Live tests: require login
    if (!isSample && !user) {
      router.replace("/login?redirect=/extract")
      return
    }
    fetchQuestions()
  }, [authLoading, user, testId, apiBase])

  const fetchQuestions = async () => {
    setLoading(true)
    setError("")
    try {
      const params = new URLSearchParams({ testId, apiBase })
      const res = await fetch(`/api/extract/questions?${params}`)
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "Could not load questions for this test")
        return
      }

      if (!data.questions || data.questions.length === 0) {
        setError("No questions found. This test may be empty or require login on the source platform.")
        return
      }

      setQuestions(data.questions)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
        <p className="text-muted-foreground font-medium">Loading test questions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2">Could Not Load Test</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.back()} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Go Back
            </Button>
            <Button onClick={fetchQuestions} className="bg-violet-600 hover:bg-violet-700">
              Try Again
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Note: Some tests require authentication on the source website and cannot be extracted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <QuizPlayer
      title={title}
      questions={questions}
      timeLimit={duration}
      userName={user?.email?.split("@")[0] || "Student"}
    />
  )
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
      </div>
    }>
      <PlayContent />
    </Suspense>
  )
}
