"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Clock, ChevronLeft, ChevronRight, Star, Trash2, Send, 
  Moon, Sun, CheckCircle, XCircle, Eye, FileText, RotateCcw
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
  questions: Question[]
  timeLimit: number // in seconds
  onComplete?: (result: QuizResult) => void
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

export function QuizPlayer({ title, questions, timeLimit, onComplete }: QuizPlayerProps) {
  const [started, setStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [marked, setMarked] = useState<boolean[]>(new Array(questions.length).fill(false))
  const [visited, setVisited] = useState<boolean[]>(new Array(questions.length).fill(false))
  const [questionTimes, setQuestionTimes] = useState<number[]>(new Array(questions.length).fill(0))
  const [questionStart, setQuestionStart] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(timeLimit)
  const [submitted, setSubmitted] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  // Timer
  useEffect(() => {
    if (!started || submitted) return
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [started, submitted])

  // Question timer
  useEffect(() => {
    if (!started || submitted || reviewMode) return
    setQuestionStart(Date.now())
    
    return () => {
      if (questionStart) {
        const elapsed = Math.floor((Date.now() - questionStart) / 1000)
        setQuestionTimes(prev => {
          const updated = [...prev]
          updated[currentIndex] += elapsed
          return updated
        })
      }
    }
  }, [currentIndex, started, submitted, reviewMode])

  // Keyboard navigation
  useEffect(() => {
    if (!started) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev()
      else if (e.key === "ArrowRight") handleNext()
      else if (e.key === "m" || e.key === "M") handleMark()
      else if (e.key >= "1" && e.key <= "5") {
        const optIndex = parseInt(e.key)
        if (optIndex <= questions[currentIndex].options.length) {
          handleAnswer(optIndex)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [started, currentIndex])

  // Theme persistence
  useEffect(() => {
    const savedTheme = localStorage.getItem("quiz-theme")
    if (savedTheme === "dark") setDarkMode(true)
  }, [])

  const toggleTheme = () => {
    setDarkMode(prev => {
      localStorage.setItem("quiz-theme", !prev ? "dark" : "light")
      return !prev
    })
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleStart = () => {
    setStarted(true)
    setVisited(prev => {
      const updated = [...prev]
      updated[0] = true
      return updated
    })
  }

  const handleAnswer = (optionIndex: number) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [currentIndex]: optionIndex }))
  }

  const handleClearResponse = () => {
    if (submitted) return
    setAnswers(prev => {
      const updated = { ...prev }
      delete updated[currentIndex]
      return updated
    })
  }

  const handleMark = () => {
    if (submitted) return
    setMarked(prev => {
      const updated = [...prev]
      updated[currentIndex] = !updated[currentIndex]
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
    // Save current question time
    if (questionStart && !reviewMode) {
      const elapsed = Math.floor((Date.now() - questionStart) / 1000)
      setQuestionTimes(prev => {
        const updated = [...prev]
        updated[currentIndex] += elapsed
        return updated
      })
    }
    
    setCurrentIndex(index)
    setVisited(prev => {
      const updated = [...prev]
      updated[index] = true
      return updated
    })
  }

  const handleSubmit = useCallback((auto = false) => {
    if (submitted) return
    
    const unanswered = questions.length - Object.keys(answers).length
    if (!auto && unanswered > 0 && timeRemaining > 0) {
      if (!confirm(`${unanswered} questions unanswered. Submit anyway?`)) return
    }

    // Save final question time
    if (questionStart) {
      const elapsed = Math.floor((Date.now() - questionStart) / 1000)
      setQuestionTimes(prev => {
        const updated = [...prev]
        updated[currentIndex] += elapsed
        return updated
      })
    }

    setSubmitted(true)

    // Calculate results
    let correct = 0, wrong = 0, skipped = 0
    questions.forEach((q, i) => {
      if (!answers[i]) skipped++
      else if (answers[i] === q.correct) correct++
      else wrong++
    })

    const score = correct - (wrong * 0.25) // Negative marking
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
  }, [submitted, questions, answers, timeRemaining, questionStart, currentIndex, timeLimit, questionTimes, onComplete])

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
    setQuestionStart(null)
  }

  // Stats
  const answeredCount = Object.keys(answers).length
  const notAnsweredCount = questions.length - answeredCount
  const notVisitedCount = visited.filter(v => !v).length
  const markedCount = marked.filter(Boolean).length

  const currentQuestion = questions[currentIndex]

  // Start Screen
  if (!started) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5"}`}>
        <Card className={`max-w-xl w-full p-8 text-center ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
              <span className="text-red-500">Tech</span>
              <span className={darkMode ? "text-white" : "text-foreground"}>Vyro</span>
            </Link>
            <p className="text-sm text-muted-foreground mt-1">Quiz Platform</p>
          </div>
          
          <h1 className={`text-2xl font-bold mb-6 ${darkMode ? "text-white" : "text-foreground"}`}>
            {title}
          </h1>
          
          <div className={`p-6 rounded-xl mb-6 ${darkMode ? "bg-gray-700" : "bg-muted/50"}`}>
            <h2 className="text-lg font-semibold text-primary mb-4">Test Instructions</h2>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span>Total Questions: {questions.length}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <span>Time Limit: {Math.floor(timeLimit / 60)} minutes</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>+1 for correct answer</span>
              </div>
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <span>-0.25 for wrong answer</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
              <p>Keyboard: Arrow keys to navigate, 1-5 to select, M to mark</p>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full text-lg py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            onClick={handleStart}
          >
            Start Test
          </Button>
        </Card>
      </div>
    )
  }

  // Result Screen
  if (submitted && !reviewMode) {
    const correct = questions.filter((q, i) => answers[i] === q.correct).length
    const wrong = questions.filter((q, i) => answers[i] && answers[i] !== q.correct).length
    const skipped = questions.length - Object.keys(answers).length
    const score = correct - (wrong * 0.25)
    const accuracy = answeredCount > 0 ? ((correct / answeredCount) * 100).toFixed(1) : "0"
    const totalTime = timeLimit - timeRemaining

    return (
      <div className={`min-h-screen p-4 ${darkMode ? "bg-gray-900" : "bg-gradient-to-br from-primary/10 to-accent/10"}`}>
        <Card className={`max-w-2xl mx-auto p-8 ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold mb-4">
              <span className="text-red-500">Tech</span>
              <span className={darkMode ? "text-white" : "text-foreground"}>Vyro</span>
            </Link>
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : ""}`}>Performance Summary</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-xl text-center ${darkMode ? "bg-gray-700" : "bg-primary/10"}`}>
              <div className="text-3xl font-bold text-primary">{score.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Score</div>
            </div>
            <div className={`p-4 rounded-xl text-center ${darkMode ? "bg-gray-700" : "bg-green-500/10"}`}>
              <div className="text-3xl font-bold text-green-500">{correct}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className={`p-4 rounded-xl text-center ${darkMode ? "bg-gray-700" : "bg-red-500/10"}`}>
              <div className="text-3xl font-bold text-red-500">{wrong}</div>
              <div className="text-sm text-muted-foreground">Wrong</div>
            </div>
            <div className={`p-4 rounded-xl text-center ${darkMode ? "bg-gray-700" : "bg-amber-500/10"}`}>
              <div className="text-3xl font-bold text-amber-500">{skipped}</div>
              <div className="text-sm text-muted-foreground">Skipped</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-700" : "bg-muted/50"}`}>
              <div className="text-lg font-semibold">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
            <div className={`p-4 rounded-xl ${darkMode ? "bg-gray-700" : "bg-muted/50"}`}>
              <div className="text-lg font-semibold">{formatTime(totalTime)}</div>
              <div className="text-sm text-muted-foreground">Time Taken</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleReview}
            >
              <Eye className="h-4 w-4 mr-2" />
              Review Answers
            </Button>
            <Button 
              className="flex-1"
              onClick={handleRestart}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart Quiz
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Quiz Screen
  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-background"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 p-3 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-background/95 backdrop-blur border-border"}`}>
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="text-red-500">Tech</span>
            <span>Vyro</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTheme}
              className="px-3"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            {!reviewMode && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleSubmit(false)}
                className="bg-green-500 hover:bg-green-600"
              >
                <Send className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Submit</span>
              </Button>
            )}
            
            <div className={`px-4 py-2 rounded-full font-bold text-white ${
              timeRemaining <= 300 
                ? "bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" 
                : "bg-gradient-to-r from-primary to-accent"
            }`}>
              <Clock className="inline h-4 w-4 mr-1.5" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Question Panel */}
          <div className="flex-1">
            <Card className={`p-6 ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
              {/* Question Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-4 border-primary">
                <span className="text-lg font-bold text-primary">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <Badge className="bg-green-500 text-white">
                  {currentQuestion.marks} marks
                </Badge>
              </div>

              {/* Time spent on question */}
              {reviewMode && (
                <div className={`text-right mb-3 text-sm p-2 rounded ${darkMode ? "bg-gray-700" : "bg-primary/10"}`}>
                  Time: {formatTime(questionTimes[currentIndex])}
                </div>
              )}

              {/* Question Text */}
              <div 
                className={`p-4 rounded-lg mb-6 border-l-4 border-primary ${darkMode ? "bg-gray-700" : "bg-muted/50"}`}
                dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
              />

              {/* Options */}
              <div className="space-y-3">
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
                      className={`p-4 rounded-lg border-2 cursor-pointer flex items-center gap-3 transition-all ${
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
                      {!reviewMode && (
                        <input
                          type="radio"
                          name="answer"
                          checked={isSelected}
                          onChange={() => handleAnswer(optionNum)}
                          className="w-5 h-5"
                        />
                      )}
                      {reviewMode && (
                        <span className="w-6 h-6 flex items-center justify-center">
                          {showAsCorrect && <CheckCircle className="h-5 w-5 text-green-500" />}
                          {userAnsweredWrong && <XCircle className="h-5 w-5 text-red-500" />}
                        </span>
                      )}
                      <span 
                        className="flex-1"
                        dangerouslySetInnerHTML={{ __html: `${String.fromCharCode(65 + idx)}. ${option}` }}
                      />
                    </div>
                  )
                })}
              </div>

              {/* Solution in review mode */}
              {reviewMode && currentQuestion.explanation && (
                <details className={`mt-6 p-4 rounded-lg border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-muted/30 border-border"}`}>
                  <summary className="cursor-pointer font-bold text-primary">View Solution</summary>
                  <div 
                    className="mt-3 pt-3 border-t border-border"
                    dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                  />
                </details>
              )}
            </Card>
          </div>

          {/* Palette Panel */}
          <div className="lg:w-72">
            <Card className={`p-4 ${darkMode ? "bg-gray-800 border-gray-700" : ""}`}>
              {/* Status Legend */}
              <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg mb-4 ${darkMode ? "bg-gray-700" : "bg-muted/50"}`}>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-500">{answeredCount}</div>
                  <div className="text-xs text-muted-foreground">Answered</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-500">{notAnsweredCount}</div>
                  <div className="text-xs text-muted-foreground">Not Answered</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-500">{notVisitedCount}</div>
                  <div className="text-xs text-muted-foreground">Not Visited</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-amber-500">{markedCount}</div>
                  <div className="text-xs text-muted-foreground">Marked</div>
                </div>
              </div>

              <h3 className="font-bold text-center text-primary mb-3">Questions</h3>
              
              {/* Question Grid */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, idx) => {
                  const isAnswered = answers[idx] !== undefined
                  const isVisited = visited[idx]
                  const isMarked = marked[idx]
                  const isCurrent = idx === currentIndex

                  return (
                    <button
                      key={idx}
                      onClick={() => goToQuestion(idx)}
                      className={`aspect-square rounded-full font-bold text-sm flex items-center justify-center transition-all ${
                        isCurrent ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                      } ${
                        isMarked
                          ? "bg-amber-500 text-gray-900"
                          : isAnswered
                            ? "bg-green-500 text-gray-900"
                            : isVisited
                              ? "bg-blue-500 text-white"
                              : darkMode
                                ? "bg-gray-600 text-gray-300"
                                : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 p-3 border-t ${darkMode ? "bg-gray-800 border-gray-700" : "bg-background/95 backdrop-blur border-border"}`}>
        <div className="container mx-auto flex flex-wrap justify-center gap-2 max-w-2xl">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 sm:flex-none"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>
          
          {!reviewMode && (
            <>
              <Button
                variant="outline"
                onClick={handleClearResponse}
                className="flex-1 sm:flex-none border-red-500 text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
              
              <Button
                variant="outline"
                onClick={handleMark}
                className={`flex-1 sm:flex-none ${marked[currentIndex] ? "bg-amber-500 text-white border-amber-500" : ""}`}
              >
                <Star className="h-4 w-4 mr-1" />
                Mark
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className="flex-1 sm:flex-none"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
      
      {/* Bottom padding for fixed nav */}
      <div className="h-20" />
    </div>
  )
}
