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

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  timeLimit: number
  questions: { id: string }[]
  enabled: boolean
}

interface LeaderboardEntry {
  id: string
  name: string
  score: number
  percentage: number
  quizId: string
  quizTitle: string
  timestamp: string
}

const QUIZ_STORAGE_KEY = "techvyro-quizzes"
const LEADERBOARD_KEY = "techvyro-leaderboard"

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

export function QuizSection() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load quizzes
    try {
      const savedQuizzes = localStorage.getItem(QUIZ_STORAGE_KEY)
      if (savedQuizzes) {
        const allQuizzes: Quiz[] = JSON.parse(savedQuizzes)
        setQuizzes(allQuizzes.filter(q => q.enabled && q.questions.length > 0).slice(0, 4))
      }
    } catch (e) {
      // Silent fail
    }

    // Load leaderboard
    try {
      const savedLeaderboard = localStorage.getItem(LEADERBOARD_KEY)
      if (savedLeaderboard) {
        const entries: LeaderboardEntry[] = JSON.parse(savedLeaderboard)
        // Get top 5 unique users by highest score
        const uniqueUsers = new Map<string, LeaderboardEntry>()
        entries.sort((a, b) => b.percentage - a.percentage).forEach(entry => {
          if (!uniqueUsers.has(entry.name)) {
            uniqueUsers.set(entry.name, entry)
          }
        })
        setLeaderboard(Array.from(uniqueUsers.values()).slice(0, 5))
      }
    } catch (e) {
      // Silent fail
    }

    setLoading(false)
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

  if (loading) {
    return (
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-muted rounded-xl"></div>
              <div className="h-64 bg-muted rounded-xl"></div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-3 sm:mb-4 bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Practice Tests
          </Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2 sm:mb-3">
            Test Your Knowledge
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md sm:max-w-xl mx-auto px-2">
            Challenge yourself with our curated quizzes and compete on the leaderboard
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
                        <Badge 
                          className={`shrink-0 text-[9px] sm:text-[10px] text-white py-0.5 px-1.5 ${categoryColors[quiz.category] || "bg-gray-500"}`}
                        >
                          {quiz.category}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{quiz.questions.length} Qs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{Math.floor(quiz.timeLimit / 60)} min</span>
                        </div>
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
              <Card className="overflow-hidden border-border/50 flex flex-col h-full">
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-3 sm:p-4 border-b border-border/50">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    <span className="truncate">Leaderboard</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">Top performers</p>
                </div>

                <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50 mb-2 sm:mb-3" />
                      <p className="text-xs sm:text-sm text-muted-foreground">No scores yet</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Be the first to take a quiz!</p>
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
                            <p className="text-[9px] sm:text-xs text-muted-foreground truncate">{entry.quizTitle}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-[11px] sm:text-sm text-primary">{entry.percentage}%</p>
                            <div className="flex items-center gap-0.5 justify-end">
                              <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500 fill-amber-500" />
                              <span className="text-[9px] sm:text-xs text-muted-foreground">{entry.score.toFixed(1)}</span>
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
