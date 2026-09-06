"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Clock, FileText, Play, Trophy, Users, Target, 
  ArrowRight, Zap, Crown, Medal, Star
} from "lucide-react"
import type { HomepageQuiz } from "@/lib/types"

interface LeaderboardEntry {
  id: string
  name: string
  score: number
  percentage: number
  quiz_id: string
  quiz_title: string
  created_at: string
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  const createdAt = typeof entry.created_at === "string" ? Date.parse(entry.created_at) : NaN
  return typeof entry.id === "string" && typeof entry.name === "string" && entry.name.trim().length > 0
    && typeof entry.quiz_title === "string" && typeof entry.score === "number" && Number.isFinite(entry.score)
    && typeof entry.percentage === "number" && Number.isFinite(entry.percentage) && entry.percentage >= 0 && entry.percentage <= 100
    && Number.isFinite(createdAt)
}

const categoryColors: Record<string, string> = {
  Mathematics: "bg-[#355b8c]",
  Physics: "bg-[#596b9b]",
  Chemistry: "bg-[#557e78]",
  Biology: "bg-[#5f8066]",
  English: "bg-[#b27d32]",
  General: "bg-[#617080]",
  NDA: "bg-[#9b514a]",
  SSC: "bg-[#a66b3b]"
}

export function QuizSection({ initialQuizzes }: { initialQuizzes: HomepageQuiz[] }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [leaderboardError, setLeaderboardError] = useState(false)
  const quizzes = initialQuizzes.slice(0, 4)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/quiz-results", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Leaderboard request failed")
        return response.json() as Promise<unknown>
      })
      .then(payload => {
      const results = payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)
        ? (payload as { results: unknown[] }).results.filter(isLeaderboardEntry) : []
      const uniqueUsers = new Map<string, LeaderboardEntry>()
      results
        .sort((a, b) => b.percentage - a.percentage)
        .forEach(entry => {
          if (!uniqueUsers.has(entry.name)) {
            uniqueUsers.set(entry.name, entry)
          }
        })
      setLeaderboard(Array.from(uniqueUsers.values()).slice(0, 5))
      setLeaderboardError(false)
      })
      .catch(error => { if ((error as Error).name !== "AbortError") setLeaderboardError(true) })
    return () => controller.abort()
  }, [])

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Crown className="h-5 w-5 text-yellow-500" />
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 2) return <Medal className="h-5 w-5 text-amber-700" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank + 1}</span>
  }

  const getRankBg = (rank: number) => {
    if (rank === 0) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30"
    if (rank === 1) return "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/30"
    if (rank === 2) return "bg-gradient-to-r from-amber-700/20 to-amber-800/20 border-amber-700/30"
    return "bg-card border-border/50"
  }
  const quizMinutes = (seconds: number) => seconds > 0 ? Math.max(1, Math.floor(seconds / 60)) : null

  return (
    <section className="relative overflow-hidden bg-muted/25 py-14 sm:py-18 lg:py-22">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/15" />
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-3 sm:mb-4 bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Practice Tests
          </Badge>
          <h2 className="study-display mb-2 text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
            Test Your Knowledge
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md sm:max-w-xl mx-auto px-2">
            Pick a focused practice set, see the format upfront, and begin when you are ready.
          </p>
        </div>

        {/* Empty State - when no quizzes */}
        {quizzes.length === 0 && (
          <div className="max-w-md mx-auto text-center py-6 sm:py-8">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
              <Target className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg mb-2">Quizzes Coming Soon</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              We're preparing exciting practice tests for you. Check back soon!
            </p>
            <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm">
              <Link href="/quiz">
                <Zap className="h-3 w-3 mr-1.5" />
                Explore Quiz Section
              </Link>
            </Button>
          </div>
        )}

        {/* Quiz Content - when quizzes exist */}
        {quizzes.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Quizzes Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Available Quizzes
                </h3>
                <Link 
                  href="/quiz" 
                  className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {quizzes.map(quiz => (
                  <Card 
                    key={quiz.id}
                    className="group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/50 hover:border-primary/40 flex flex-col"
                  >
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                        <h4 className="font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {quiz.title}
                        </h4>
                        <Badge className={`shrink-0 text-[9px] sm:text-[10px] text-white py-0.5 px-1.5 ${categoryColors[quiz.category] || "bg-primary"}`}>{quiz.category || "General"}</Badge>
                      </div>
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {quiz.section && <span className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">{quiz.section}</span>}
                        <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold capitalize text-primary">{quiz.difficulty || "Practice"}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{quiz.question_count} Qs</span>
                        </div>
                        {quizMinutes(quiz.time_limit) && <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{quizMinutes(quiz.time_limit)} min</span>
                        </div>}
                      </div>
                      
                      <Button asChild size="sm" className="w-full h-8 sm:h-9 text-[11px] sm:text-xs mt-auto">
                        <Link href={`/quiz/${quiz.id}`}>
                          <Play className="h-3 w-3 mr-1" />
                          Start Quiz
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {quizzes.length >= 4 && (
                <div className="text-center pt-2">
                  <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm">
                    <Link href="/quiz">
                      Browse All Quizzes
                      <ArrowRight className="h-3 w-3 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Leaderboard */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden border-border/50">
                <div className="bg-primary/[0.06] p-3 sm:p-4 border-b border-border/50">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="truncate">Leaderboard</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Top performers</p>
                </div>

                <div className="p-3 sm:p-4">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50 mb-2 sm:mb-3" />
                      <p className="text-xs sm:text-sm text-muted-foreground">{leaderboardError ? "Leaderboard unavailable" : "No scores yet"}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{leaderboardError ? "Please try again later." : "Complete a quiz to appear here."}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 sm:space-y-2">
                      {leaderboard.map((entry, index) => (
                        <div 
                          key={entry.id}
                          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border transition-all hover:scale-[1.02] ${getRankBg(index)}`}
                        >
                          <div className="shrink-0 w-5 sm:w-6">
                            {getRankIcon(index)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[11px] sm:text-sm truncate">{entry.name}</p>
                            <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{entry.quiz_title}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-[11px] sm:text-sm text-primary">{entry.percentage}%</p>
                            <div className="flex items-center gap-0.5 justify-end">
                              <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500 fill-amber-500" />
                              <span className="text-[9px] sm:text-xs text-muted-foreground">{Number(entry.score).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/50">
                    <Link 
                      href="/quiz/leaderboard"
                      className="text-[11px] sm:text-sm text-primary hover:underline flex items-center justify-center gap-1"
                    >
                      View Full Leaderboard <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
