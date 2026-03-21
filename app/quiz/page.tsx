"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, FileText, Play, BookOpen, ArrowRight } from "lucide-react"

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  timeLimit: number
  questions: { id: string }[]
  enabled: boolean
  createdAt: string
}

const STORAGE_KEY = "techvyro-quizzes"

const categoryColors: Record<string, string> = {
  Mathematics: "bg-blue-500",
  Physics: "bg-purple-500",
  Chemistry: "bg-green-500",
  Biology: "bg-emerald-500",
  English: "bg-amber-500",
  General: "bg-gray-500",
  NDA: "bg-red-500",
  SSC: "bg-orange-500"
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const allQuizzes: Quiz[] = JSON.parse(saved)
        // Only show enabled quizzes with questions
        setQuizzes(allQuizzes.filter(q => q.enabled && q.questions.length > 0))
      }
    } catch (e) {
      // Failed to load quizzes
    }
    setLoading(false)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            Practice Tests
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            Test Your Knowledge
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Practice with our curated quizzes designed for NDA, SSC, and other competitive exams.
            Track your progress and improve your scores.
          </p>
        </div>

        {/* Quizzes Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Quizzes Available</h3>
            <p className="text-muted-foreground mb-6">
              Quizzes will appear here once they are created by the admin.
            </p>
            <Button asChild variant="outline">
              <Link href="/">
                Browse PDFs Instead
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map(quiz => (
              <Card 
                key={quiz.id} 
                className="group overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border/50 hover:border-primary/40"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {quiz.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {quiz.description}
                      </CardDescription>
                    </div>
                    <Badge 
                      className={`shrink-0 text-white ${categoryColors[quiz.category] || "bg-gray-500"}`}
                    >
                      {quiz.category}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {quiz.questions.length} Questions
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {Math.floor(quiz.timeLimit / 60)} min
                    </div>
                  </div>
                  
                  <Button asChild className="w-full group-hover:bg-primary">
                    <Link href={`/quiz/${quiz.id}`}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Quiz
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
