"use client"

import { useState, useEffect } from "react"
import { 
  Plus, Trash2, Edit, ChevronDown, ChevronRight, Clock, FileText,
  CheckCircle, Save, X, Upload, Eye, Copy, ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { toast } from "sonner"

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
  timeLimit: number
  questions: Question[]
  enabled: boolean
  createdAt: string
}

const STORAGE_KEY = "techvyro-quizzes"

const defaultQuiz: Omit<Quiz, "id" | "createdAt"> = {
  title: "",
  description: "",
  category: "Mathematics",
  timeLimit: 1200,
  questions: [],
  enabled: true
}

const defaultQuestion: Omit<Question, "id"> = {
  question: "",
  options: ["", "", "", ""],
  correct: 1,
  marks: 1,
  explanation: ""
}

export function QuizManager() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<{ quizId: string; question: Question } | null>(null)
  const [showQuizDialog, setShowQuizDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importHtml, setImportHtml] = useState("")
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set())

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setQuizzes(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse quizzes")
      }
    }
  }, [])

  const saveQuizzes = (updated: Quiz[]) => {
    setQuizzes(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const generateId = () => Math.random().toString(36).substr(2, 9)

  // Quiz CRUD
  const handleAddQuiz = () => {
    setEditingQuiz({
      ...defaultQuiz,
      id: generateId(),
      createdAt: new Date().toISOString()
    })
    setShowQuizDialog(true)
  }

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz({ ...quiz })
    setShowQuizDialog(true)
  }

  const handleSaveQuiz = () => {
    if (!editingQuiz) return
    
    if (!editingQuiz.title.trim()) {
      toast.error("Quiz title is required")
      return
    }

    const existing = quizzes.find(q => q.id === editingQuiz.id)
    let updated: Quiz[]
    
    if (existing) {
      updated = quizzes.map(q => q.id === editingQuiz.id ? editingQuiz : q)
    } else {
      updated = [...quizzes, editingQuiz]
    }

    saveQuizzes(updated)
    setShowQuizDialog(false)
    setEditingQuiz(null)
    toast.success(existing ? "Quiz updated" : "Quiz created")
  }

  const handleDeleteQuiz = (quizId: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return
    saveQuizzes(quizzes.filter(q => q.id !== quizId))
    toast.success("Quiz deleted")
  }

  const handleToggleQuiz = (quizId: string) => {
    saveQuizzes(quizzes.map(q => 
      q.id === quizId ? { ...q, enabled: !q.enabled } : q
    ))
  }

  // Question CRUD
  const handleAddQuestion = (quizId: string) => {
    setEditingQuestion({
      quizId,
      question: {
        ...defaultQuestion,
        id: generateId()
      }
    })
    setShowQuestionDialog(true)
  }

  const handleEditQuestion = (quizId: string, question: Question) => {
    setEditingQuestion({ quizId, question: { ...question } })
    setShowQuestionDialog(true)
  }

  const handleSaveQuestion = () => {
    if (!editingQuestion) return
    
    const { quizId, question } = editingQuestion

    if (!question.question.trim()) {
      toast.error("Question text is required")
      return
    }

    if (question.options.some(o => !o.trim())) {
      toast.error("All options must be filled")
      return
    }

    const quiz = quizzes.find(q => q.id === quizId)
    if (!quiz) return

    const existingIdx = quiz.questions.findIndex(q => q.id === question.id)
    let updatedQuestions: Question[]

    if (existingIdx >= 0) {
      updatedQuestions = quiz.questions.map(q => q.id === question.id ? question : q)
    } else {
      updatedQuestions = [...quiz.questions, question]
    }

    saveQuizzes(quizzes.map(q => 
      q.id === quizId ? { ...q, questions: updatedQuestions } : q
    ))

    setShowQuestionDialog(false)
    setEditingQuestion(null)
    toast.success(existingIdx >= 0 ? "Question updated" : "Question added")
  }

  const handleDeleteQuestion = (quizId: string, questionId: string) => {
    if (!confirm("Delete this question?")) return
    
    saveQuizzes(quizzes.map(q => 
      q.id === quizId 
        ? { ...q, questions: q.questions.filter(qq => qq.id !== questionId) }
        : q
    ))
    toast.success("Question deleted")
  }

  // Import from HTML
  const handleImportHtml = () => {
    try {
      // Parse the HTML to extract quiz data
      const parser = new DOMParser()
      const doc = parser.parseFromString(importHtml, "text/html")
      
      // Extract title
      const titleEl = doc.querySelector(".start-title")
      const title = titleEl?.textContent?.trim() || "Imported Quiz"

      // Try to extract questions from script
      const scripts = doc.querySelectorAll("script")
      let questionsData: any[] = []

      scripts.forEach(script => {
        const content = script.textContent || ""
        const match = content.match(/const Q = (\[[\s\S]*?\]);/)
        if (match) {
          try {
            questionsData = JSON.parse(match[1])
          } catch (e) {
            // Try eval as fallback (careful with this)
          }
        }
      })

      if (questionsData.length === 0) {
        toast.error("Could not parse questions from HTML")
        return
      }

      // Convert to our format
      const questions: Question[] = questionsData.map((q: any, idx: number) => ({
        id: generateId(),
        question: q.question || "",
        options: q.options || ["", "", "", ""],
        correct: q.correct || 1,
        marks: q.marks || 1,
        explanation: q.explanation || ""
      }))

      // Extract time
      const timeMatch = importHtml.match(/const TIME = (\d+);/)
      const timeLimit = timeMatch ? parseInt(timeMatch[1]) : 1200

      const newQuiz: Quiz = {
        id: generateId(),
        title: title.replace("Boss_Quiz_Robot", "TechVyro"),
        description: `Imported quiz with ${questions.length} questions`,
        category: "General",
        timeLimit,
        questions,
        enabled: true,
        createdAt: new Date().toISOString()
      }

      saveQuizzes([...quizzes, newQuiz])
      setShowImportDialog(false)
      setImportHtml("")
      toast.success(`Quiz imported with ${questions.length} questions`)

    } catch (e) {
      toast.error("Failed to import HTML")
    }
  }

  const toggleExpanded = (quizId: string) => {
    setExpandedQuizzes(prev => {
      const next = new Set(prev)
      if (next.has(quizId)) next.delete(quizId)
      else next.add(quizId)
      return next
    })
  }

  const copyQuizLink = (quizId: string) => {
    const url = `${window.location.origin}/quiz/${quizId}`
    navigator.clipboard.writeText(url)
    toast.success("Quiz link copied!")
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleAddQuiz}>
          <Plus className="h-4 w-4 mr-2" />
          Create Quiz
        </Button>
        <Button variant="outline" onClick={() => setShowImportDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import HTML
        </Button>
      </div>

      {/* Quiz List */}
      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Quizzes Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first quiz or import from HTML
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={handleAddQuiz}>Create Quiz</Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                Import HTML
              </Button>
            </div>
          </Card>
        ) : (
          quizzes.map(quiz => (
            <Collapsible 
              key={quiz.id}
              open={expandedQuizzes.has(quiz.id)}
              onOpenChange={() => toggleExpanded(quiz.id)}
            >
              <Card className={!quiz.enabled ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <CollapsibleTrigger className="flex items-center gap-2 text-left">
                      {expandedQuizzes.has(quiz.id) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>{quiz.description}</CardDescription>
                      </div>
                    </CollapsibleTrigger>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{quiz.category}</Badge>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {Math.floor(quiz.timeLimit / 60)}m
                      </Badge>
                      <Badge>
                        {quiz.questions.length} Q
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Switch 
                      checked={quiz.enabled}
                      onCheckedChange={() => handleToggleQuiz(quiz.id)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {quiz.enabled ? "Active" : "Disabled"}
                    </span>
                    
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => copyQuizLink(quiz.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/quiz/${quiz.id}`} target="_blank">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEditQuiz(quiz)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteQuiz(quiz.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Questions</h4>
                      <Button size="sm" onClick={() => handleAddQuestion(quiz.id)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Question
                      </Button>
                    </div>

                    {quiz.questions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No questions yet. Add your first question.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {quiz.questions.map((q, idx) => (
                          <div 
                            key={q.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <span className="font-bold text-primary w-8">
                              Q{idx + 1}
                            </span>
                            <div 
                              className="flex-1 text-sm line-clamp-1"
                              dangerouslySetInnerHTML={{ __html: q.question }}
                            />
                            <Badge variant="secondary">{q.marks} marks</Badge>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditQuestion(quiz.id, q)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteQuestion(quiz.id, q.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>

      {/* Quiz Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuiz?.createdAt && quizzes.some(q => q.id === editingQuiz.id) 
                ? "Edit Quiz" 
                : "Create Quiz"}
            </DialogTitle>
          </DialogHeader>

          {editingQuiz && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editingQuiz.title}
                  onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                  placeholder="Quiz title"
                />
              </div>
              
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingQuiz.description}
                  onChange={e => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                  placeholder="Quiz description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editingQuiz.category}
                    onValueChange={v => setEditingQuiz({ ...editingQuiz, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="NDA">NDA</SelectItem>
                      <SelectItem value="SSC">SSC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    value={editingQuiz.timeLimit / 60}
                    onChange={e => setEditingQuiz({ 
                      ...editingQuiz, 
                      timeLimit: parseInt(e.target.value) * 60 || 600 
                    })}
                    min={5}
                    max={180}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuizDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuiz}>
              <Save className="h-4 w-4 mr-2" />
              Save Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion && quizzes
                .find(q => q.id === editingQuestion.quizId)
                ?.questions.some(q => q.id === editingQuestion.question.id)
                ? "Edit Question"
                : "Add Question"}
            </DialogTitle>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4">
              <div>
                <Label>Question (HTML supported)</Label>
                <Textarea
                  value={editingQuestion.question.question}
                  onChange={e => setEditingQuestion({
                    ...editingQuestion,
                    question: { ...editingQuestion.question, question: e.target.value }
                  })}
                  placeholder="Enter question text..."
                  rows={4}
                />
              </div>

              <div className="space-y-3">
                <Label>Options</Label>
                {editingQuestion.question.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-8 font-bold text-primary">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <Input
                      value={opt}
                      onChange={e => {
                        const newOptions = [...editingQuestion.question.options]
                        newOptions[idx] = e.target.value
                        setEditingQuestion({
                          ...editingQuestion,
                          question: { ...editingQuestion.question, options: newOptions }
                        })
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    />
                    <input
                      type="radio"
                      name="correct"
                      checked={editingQuestion.question.correct === idx + 1}
                      onChange={() => setEditingQuestion({
                        ...editingQuestion,
                        question: { ...editingQuestion.question, correct: idx + 1 }
                      })}
                      className="w-5 h-5"
                      title="Mark as correct"
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Select the radio button next to the correct answer
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Marks</Label>
                  <Input
                    type="number"
                    value={editingQuestion.question.marks}
                    onChange={e => setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, marks: parseInt(e.target.value) || 1 }
                    })}
                    min={1}
                    max={10}
                  />
                </div>
              </div>

              <div>
                <Label>Explanation (HTML supported)</Label>
                <Textarea
                  value={editingQuestion.question.explanation}
                  onChange={e => setEditingQuestion({
                    ...editingQuestion,
                    question: { ...editingQuestion.question, explanation: e.target.value }
                  })}
                  placeholder="Solution explanation..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion}>
              <Save className="h-4 w-4 mr-2" />
              Save Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Quiz from HTML</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste the HTML code from your quiz file. The system will extract questions 
              and convert them to TechVyro format.
            </p>
            
            <Textarea
              value={importHtml}
              onChange={e => setImportHtml(e.target.value)}
              placeholder="Paste HTML code here..."
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportHtml} disabled={!importHtml.trim()}>
              <Upload className="h-4 w-4 mr-2" />
              Import Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
