"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Plus, Trash2, Edit, ChevronDown, ChevronRight, Clock, FileText,
  CheckCircle, Save, X, Upload, Eye, Copy, ExternalLink, FileUp, Loader2
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setQuizzes(JSON.parse(saved))
      } catch (e) {
        // Failed to parse
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

  // Parse HTML to extract quiz data
  const parseQuizHtml = (html: string): Quiz | null => {
    try {
      // Extract title from multiple possible patterns
      let title = ""
      
      // Try .start-title class
      const startTitleMatch = html.match(/<[^>]*class="[^"]*start-title[^"]*"[^>]*>([^<]*)</)
      if (startTitleMatch) {
        title = startTitleMatch[1].trim()
      }
      
      // Try h1 tag
      if (!title) {
        const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i)
        if (h1Match) {
          title = h1Match[1].trim()
        }
      }
      
      // Try title tag
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
        if (titleMatch) {
          title = titleMatch[1].trim()
        }
      }
      
      // Clean title - remove other branding
      title = title
        .replace(/Boss_Quiz_Robot/gi, "TechVyro")
        .replace(/LearnWithSumit/gi, "TechVyro")
        .replace(/Sumit\s*Raftaar/gi, "TechVyro")
        .replace(/Sumit/gi, "TechVyro")
        .replace(/\s+/g, " ")
        .trim() || "Imported Quiz"

      // Try to extract questions from script
      let questionsData: any[] = []
      let timeLimit = 1200

      // Find TIME constant
      const timeMatch = html.match(/const\s+TIME\s*=\s*(\d+)/i)
      if (timeMatch) {
        timeLimit = parseInt(timeMatch[1])
      }

      // Method 1: Try to find Q array with template literals
      const qArrayMatch = html.match(/const\s+Q\s*=\s*\[([\s\S]*?)\];/m)
      if (qArrayMatch) {
        const arrayContent = qArrayMatch[1]
        
        // Parse each question object using regex
        const questionRegex = /\{\s*question\s*:\s*[`'"]([\s\S]*?)[`'"]\s*,\s*options\s*:\s*\[([\s\S]*?)\]\s*,\s*correct\s*:\s*(\d+)/g
        let match
        
        while ((match = questionRegex.exec(arrayContent)) !== null) {
          const questionText = match[1].trim()
          const optionsStr = match[2]
          const correct = parseInt(match[3])
          
          // Parse options - handle backticks, single quotes, double quotes
          const optionMatches = optionsStr.match(/[`'"]([^`'"]*)[`'"]/g)
          const options = optionMatches 
            ? optionMatches.map(o => o.slice(1, -1).trim())
            : []
          
          if (options.length >= 2) {
            questionsData.push({
              question: questionText,
              options: options,
              correct: correct,
              marks: 1,
              explanation: ""
            })
          }
        }
      }

      // Method 2: If method 1 failed, try alternative parsing
      if (questionsData.length === 0) {
        // Try to find questions in different format
        const altQuestionRegex = /question\s*:\s*[`'"](.*?)[`'"]/gi
        const altOptionRegex = /options\s*:\s*\[(.*?)\]/gi
        const altCorrectRegex = /correct\s*:\s*(\d+)/gi
        
        const questions = [...html.matchAll(/question\s*:\s*[`'"]([\s\S]*?)[`'"]/gi)]
        const optionSets = [...html.matchAll(/options\s*:\s*\[([\s\S]*?)\]/gi)]
        const corrects = [...html.matchAll(/correct\s*:\s*(\d+)/gi)]
        
        for (let i = 0; i < questions.length; i++) {
          if (optionSets[i] && corrects[i]) {
            const optionsStr = optionSets[i][1]
            const optionMatches = optionsStr.match(/[`'"]([^`'"]+)[`'"]/g)
            const options = optionMatches 
              ? optionMatches.map(o => o.slice(1, -1).trim())
              : []
            
            if (options.length >= 2) {
              questionsData.push({
                question: questions[i][1].trim(),
                options: options,
                correct: parseInt(corrects[i][1]),
                marks: 1,
                explanation: ""
              })
            }
          }
        }
      }

      if (questionsData.length === 0) {
        return null
      }

      // Convert to our format
      const questions: Question[] = questionsData.map((q: any) => ({
        id: generateId(),
        question: String(q.question || "")
          .replace(/Boss_Quiz_Robot/gi, "TechVyro")
          .replace(/LearnWithSumit/gi, "TechVyro")
          .replace(/Sumit/gi, "TechVyro"),
        options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : ["", "", "", ""],
        correct: typeof q.correct === "number" ? q.correct : 1,
        marks: typeof q.marks === "number" ? q.marks : 1,
        explanation: String(q.explanation || "")
      }))

      // Detect category from title
      let category = "General"
      const lowerTitle = title.toLowerCase()
      if (lowerTitle.includes("math") || lowerTitle.includes("algebra") || lowerTitle.includes("geometry") || lowerTitle.includes("inverse")) {
        category = "Mathematics"
      } else if (lowerTitle.includes("physics")) {
        category = "Physics"
      } else if (lowerTitle.includes("chemistry")) {
        category = "Chemistry"
      } else if (lowerTitle.includes("biology")) {
        category = "Biology"
      } else if (lowerTitle.includes("english")) {
        category = "English"
      } else if (lowerTitle.includes("nda")) {
        category = "NDA"
      } else if (lowerTitle.includes("ssc")) {
        category = "SSC"
      }

      return {
        id: generateId(),
        title,
        description: `${questions.length} questions | ${Math.floor(timeLimit / 60)} minutes`,
        category,
        timeLimit,
        questions,
        enabled: true,
        createdAt: new Date().toISOString()
      }

    } catch (e) {
      return null
    }
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      toast.error("Please upload an HTML file")
      return
    }

    setIsUploading(true)
    setUploadedFileName(file.name)

    try {
      const text = await file.text()
      setImportHtml(text)
      
      // Auto-parse and show preview
      const quiz = parseQuizHtml(text)
      if (quiz) {
        toast.success(`Detected: "${quiz.title}" with ${quiz.questions.length} questions`)
      }
    } catch (e) {
      toast.error("Failed to read file")
    } finally {
      setIsUploading(false)
    }
  }

  // Handle import
  const handleImportHtml = () => {
    const quiz = parseQuizHtml(importHtml)
    
    if (!quiz || quiz.questions.length === 0) {
      toast.error("Could not parse questions from HTML. Make sure it contains valid quiz data.")
      return
    }

    saveQuizzes([...quizzes, quiz])
    setShowImportDialog(false)
    setImportHtml("")
    setUploadedFileName("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    
    toast.success(`Quiz imported: "${quiz.title}" with ${quiz.questions.length} questions`)
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
              Create your first quiz or import from HTML file
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
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <CollapsibleTrigger className="flex items-center gap-2 text-left">
                      {expandedQuizzes.has(quiz.id) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        <CardDescription>{quiz.description}</CardDescription>
                      </div>
                    </CollapsibleTrigger>
                    
                    <div className="flex items-center gap-2 flex-wrap">
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

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
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
                            <span className="font-bold text-primary w-8 shrink-0">
                              Q{idx + 1}
                            </span>
                            <div 
                              className="flex-1 text-sm line-clamp-1"
                              dangerouslySetInnerHTML={{ __html: q.question }}
                            />
                            <Badge variant="secondary" className="shrink-0">{q.marks} marks</Badge>
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
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-muted-foreground">Correct</span>
                  </div>
                ))}
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
                <Label>Explanation (optional)</Label>
                <Textarea
                  value={editingQuestion.question.explanation}
                  onChange={e => setEditingQuestion({
                    ...editingQuestion,
                    question: { ...editingQuestion.question, explanation: e.target.value }
                  })}
                  placeholder="Explain the correct answer..."
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
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open)
        if (!open) {
          setImportHtml("")
          setUploadedFileName("")
          if (fileInputRef.current) fileInputRef.current.value = ""
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Import Quiz from HTML</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <FileUp className="h-4 w-4 mr-2" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="paste">
                <FileText className="h-4 w-4 mr-2" />
                Paste HTML
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="html-upload"
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Processing file...</p>
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <p className="font-medium">{uploadedFileName}</p>
                    <p className="text-sm text-muted-foreground">File loaded successfully</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="html-upload" className="cursor-pointer">
                    <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium mb-1">Click to upload HTML file</p>
                    <p className="text-sm text-muted-foreground">
                      or drag and drop your quiz HTML file here
                    </p>
                  </label>
                )}
              </div>

              {importHtml && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Preview</p>
                  <p className="text-sm text-muted-foreground">
                    {importHtml.length.toLocaleString()} characters loaded
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="paste" className="space-y-4 mt-4">
              <div>
                <Label>Paste HTML Code</Label>
                <Textarea
                  value={importHtml}
                  onChange={e => setImportHtml(e.target.value)}
                  placeholder="Paste your quiz HTML code here..."
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
              Auto-Detection Features
            </h4>
            <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
              <li>• Automatically extracts quiz title</li>
              <li>• Detects all questions and options</li>
              <li>• Identifies correct answers</li>
              <li>• Extracts time limit settings</li>
              <li>• Auto-categorizes based on title</li>
              <li>• Replaces external branding with TechVyro</li>
            </ul>
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
