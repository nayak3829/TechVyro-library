"use client"

import { useParams } from "next/navigation"
import { QuizPlayer } from "@/components/quiz/quiz-player"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, FileText } from "lucide-react"

interface Question {
  id: string
  question: string
  options: string[]
  correct: number
  marks: number
  explanation: string
}

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  time_limit: number
  questions: Question[]
  enabled: boolean
  created_at: string
}

export default function QuizPage() {
  const params = useParams()
  const id = params.id as string
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/quizzes/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error || !data.quiz) {
          setError("Quiz not found")
          return
        }
        const q: Quiz = data.quiz
        if (!q.enabled) {
          setError("This quiz is currently disabled")
        } else if (!q.questions || q.questions.length === 0) {
          setError("This quiz has no questions yet")
        } else {
          setQuiz(q)
        }
      })
      .catch(() => setError("Failed to load quiz"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
              <span className="text-red-500">Tech</span>
              <span>Vyro</span>
            </Link>
          </div>
          
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">{error || "Quiz Not Found"}</h1>
          <p className="text-muted-foreground mb-6">
            The quiz you're looking for doesn't exist or is not available.
          </p>
          
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  const transformedQuestions = quiz.questions.map(q => ({
    qid: q.id,
    question: q.question,
    options: q.options,
    correct: q.correct,
    marks: q.marks,
    explanation: q.explanation
  }))

  return (
    <QuizPlayer
      title={quiz.title}
      quizId={quiz.id}
      questions={transformedQuestions}
      timeLimit={quiz.time_limit}
    />
  )
}
