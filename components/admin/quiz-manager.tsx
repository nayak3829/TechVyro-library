"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Plus, Trash2, Edit, ChevronDown, ChevronRight, Clock, FileText,
  CheckCircle, Save, Upload, Copy, ExternalLink, FileUp, Loader2,
  Trophy, Users, Crown, Tag, Eye, EyeOff, Globe, Lock, Link2,
  FolderOpen, Zap, X, Settings2, Files, AlertCircle
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
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
import { InlineStructureEditor } from "./inline-structure-editor"

interface Question {
  id: string
  question: string
  options: string[]
  correct: number
  marks: number
  explanation: string
}

type VisibilityType = "public" | "unlisted" | "private"

interface Quiz {
  id: string
  title: string
  description: string
  category: string
  timeLimit: number
  questions: Question[]
  enabled: boolean
  createdAt: string
  tags?: string[]
  visibility?: VisibilityType
  section?: string
  difficulty?: "easy" | "medium" | "hard"
}

const STORAGE_KEY = "techvyro-quizzes"
const LEADERBOARD_KEY = "techvyro-leaderboard"

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

const defaultQuiz: Omit<Quiz, "id" | "createdAt"> = {
  title: "",
  description: "",
  category: "Mathematics",
  timeLimit: 1200,
  questions: [],
  enabled: true,
  tags: [],
  visibility: "public",
  section: "General",
  difficulty: "medium"
}

const SECTIONS = ["General", "Competitive Exams", "School", "College", "Practice"]
const DIFFICULTIES = [
  { value: "easy", label: "Easy", color: "bg-green-500" },
  { value: "medium", label: "Medium", color: "bg-amber-500" },
  { value: "hard", label: "Hard", color: "bg-red-500" }
]

const defaultQuestion: Omit<Question, "id"> = {
  question: "",
  options: ["", "", "", ""],
  correct: 1,
  marks: 1,
  explanation: ""
}

export function QuizManager() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<{ quizId: string; question: Question } | null>(null)
  const [showQuizDialog, setShowQuizDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showLeaderboardDialog, setShowLeaderboardDialog] = useState(false)
  const [importHtml, setImportHtml] = useState("")
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const [parsedPreview, setParsedPreview] = useState<{ title: string; count: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Multi-file upload state
  const [uploadEntries, setUploadEntries] = useState<{
    id: string
    file: File
    status: "pending" | "parsing" | "ready" | "error"
    quiz: Quiz | null
    error?: string
    settings: {
      category: string
      section: string
      difficulty: "easy" | "medium" | "hard"
      visibility: VisibilityType
      tags: string[]
    }
  }[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [globalSettings, setGlobalSettings] = useState({
    category: "Mathematics",
    section: "General",
    difficulty: "medium" as "easy" | "medium" | "hard",
    visibility: "public" as VisibilityType,
    tags: [] as string[]
  })
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setQuizzes(JSON.parse(saved))
      } catch (e) {
        // Silent fail
      }
    }
    
    const savedLeaderboard = localStorage.getItem(LEADERBOARD_KEY)
    if (savedLeaderboard) {
      try {
        setLeaderboard(JSON.parse(savedLeaderboard))
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

  const parseQuizHtml = (html: string): Quiz | null => {
    try {
      let title = ""
      
      const titlePatterns = [
        /<h1[^>]*class="[^"]*start-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
        /<div[^>]*class="[^"]*start-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<h1[^>]*>([\s\S]*?)<\/h1>/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i
      ]
      
      for (const pattern of titlePatterns) {
        const match = html.match(pattern)
        if (match) {
          title = match[1].replace(/<[^>]*>/g, '').trim()
          if (title) break
        }
      }
      
      title = title
        .replace(/Boss_Quiz_Robot/gi, "TechVyro")
        .replace(/LearnWithSumit/gi, "TechVyro")
        .replace(/Sumit\s*Raftaar/gi, "TechVyro")
        .replace(/Sumit/gi, "TechVyro")
        .replace(/\s+/g, " ")
        .trim() || "Imported Quiz"

      let questionsData: any[] = []
      let timeLimit = 1200

      const timeMatch = html.match(/const\s+TIME\s*=\s*(\d+)/i)
      if (timeMatch) {
        timeLimit = parseInt(timeMatch[1])
      }

      const jsonArrayMatch = html.match(/const\s+Q\s*=\s*(\[[\s\S]*?\]);/m)
      if (jsonArrayMatch) {
        try {
          questionsData = JSON.parse(jsonArrayMatch[1])
        } catch (e) {}
      }

      if (questionsData.length === 0) {
        const qArrayMatch = html.match(/const\s+Q\s*=\s*\[([\s\S]*?)\];/m)
        if (qArrayMatch) {
          const arrayContent = qArrayMatch[1]
          const questionRegex = /\{\s*question\s*:\s*[`'"]([\s\S]*?)[`'"]\s*,\s*options\s*:\s*\[([\s\S]*?)\]\s*,\s*correct\s*:\s*(\d+)/g
          let match
          
          while ((match = questionRegex.exec(arrayContent)) !== null) {
            const optionsStr = match[2]
            const optionMatches = optionsStr.match(/[`'"]([^`'"]*)[`'"]/g)
            const options = optionMatches ? optionMatches.map(o => o.slice(1, -1).trim()) : []
            
            if (options.length >= 2) {
              questionsData.push({
                question: match[1].trim(),
                options: options,
                correct: parseInt(match[3]),
                marks: 1,
                explanation: ""
              })
            }
          }
        }
      }

      if (questionsData.length === 0) {
        const questions = [...html.matchAll(/"question"\s*:\s*"((?:[^"\\]|\\.)*)"/gi)]
        const optionSets = [...html.matchAll(/"options"\s*:\s*\[([\s\S]*?)\]/gi)]
        const corrects = [...html.matchAll(/"correct"\s*:\s*(\d+)/gi)]
        
        for (let i = 0; i < questions.length; i++) {
          if (optionSets[i] && corrects[i]) {
            const optionsStr = optionSets[i][1]
            const optionMatches = optionsStr.match(/"((?:[^"\\]|\\.)*)"/g)
            const options = optionMatches ? optionMatches.map(o => o.slice(1, -1).trim()) : []
            
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

      if (questionsData.length === 0) return null

      const questions: Question[] = questionsData.map((q: any) => ({
        id: generateId(),
        question: String(q.question || "")
          .replace(/Boss_Quiz_Robot/gi, "TechVyro")
          .replace(/LearnWithSumit/gi, "TechVyro")
          .replace(/Sumit/gi, "TechVyro"),
        options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : ["", "", "", ""],
        correct: typeof q.correct === "number" ? q.correct : 1,
        marks: typeof q.marks === "number" ? q.marks : (q.mark ? parseInt(q.mark) : 1),
        explanation: String(q.explanation || q.solution || "")
      }))

      let category = "General"
      const lowerTitle = title.toLowerCase()
      if (lowerTitle.includes("math") || lowerTitle.includes("algebra") || lowerTitle.includes("geometry") || lowerTitle.includes("inverse") || lowerTitle.includes("trigonometric")) {
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

  // Multi-file handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.name.endsWith('.html') || f.name.endsWith('.htm')
    )
    if (files.length > 0) {
      processMultipleFiles(files)
    } else {
      toast.error("Please drop HTML files only")
    }
  }

  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      f => f.name.endsWith('.html') || f.name.endsWith('.htm')
    )
    if (files.length > 0) {
      processMultipleFiles(files)
    } else {
      toast.error("Please select HTML files")
    }
    if (e.target) e.target.value = ""
  }

  const processMultipleFiles = async (files: File[]) => {
    const newEntries = files.map(file => ({
      id: generateId(),
      file,
      status: "pending" as const,
      quiz: null as Quiz | null,
      settings: { ...globalSettings }
    }))
    
    setUploadEntries(prev => [...prev, ...newEntries])
    
    // Process each file
    for (const entry of newEntries) {
      setUploadEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, status: "parsing" as const } : e
      ))
      
      try {
        const text = await entry.file.text()
        const quiz = parseQuizHtml(text)
        
        if (quiz) {
          setUploadEntries(prev => prev.map(e => 
            e.id === entry.id ? { 
              ...e, 
              status: "ready" as const, 
              quiz: {
                ...quiz,
                category: e.settings.category,
                section: e.settings.section,
                difficulty: e.settings.difficulty,
                visibility: e.settings.visibility,
                tags: e.settings.tags
              }
            } : e
          ))
        } else {
          setUploadEntries(prev => prev.map(e => 
            e.id === entry.id ? { ...e, status: "error" as const, error: "Could not parse quiz" } : e
          ))
        }
      } catch (err) {
        setUploadEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, status: "error" as const, error: "Failed to read file" } : e
        ))
      }
    }
  }

  const removeUploadEntry = (id: string) => {
    setUploadEntries(prev => prev.filter(e => e.id !== id))
  }

  const updateEntrySettings = (id: string, key: string, value: any) => {
    setUploadEntries(prev => prev.map(e => {
      if (e.id !== id) return e
      const newSettings = { ...e.settings, [key]: value }
      return {
        ...e,
        settings: newSettings,
        quiz: e.quiz ? {
          ...e.quiz,
          [key]: value
        } : null
      }
    }))
  }

  const applyGlobalSettings = () => {
    setUploadEntries(prev => prev.map(e => ({
      ...e,
      settings: { ...globalSettings },
      quiz: e.quiz ? {
        ...e.quiz,
        category: globalSettings.category,
        section: globalSettings.section,
        difficulty: globalSettings.difficulty,
        visibility: globalSettings.visibility,
        tags: globalSettings.tags
      } : null
    })))
    toast.success("Global settings applied to all files")
  }

  const importAllReady = () => {
    const readyEntries = uploadEntries.filter(e => e.status === "ready" && e.quiz)
    if (readyEntries.length === 0) {
      toast.error("No valid quizzes to import")
      return
    }
    
    const newQuizzes = readyEntries.map(e => e.quiz!).filter(Boolean)
    saveQuizzes([...quizzes, ...newQuizzes])
    setUploadEntries([])
    setShowImportDialog(false)
    toast.success(`Imported ${newQuizzes.length} quizzes successfully!`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      toast.error("Please upload an HTML file")
      return
    }

    setIsUploading(true)
    setUploadedFileName(file.name)
    setParsedPreview(null)

    try {
      const text = await file.text()
      setImportHtml(text)
      
      const quiz = parseQuizHtml(text)
      if (quiz) {
        setParsedPreview({ title: quiz.title, count: quiz.questions.length })
        toast.success(`Detected ${quiz.questions.length} questions`)
      } else {
        toast.error("Could not detect questions in this file")
      }
    } catch (e) {
      toast.error("Failed to read file")
    } finally {
      setIsUploading(false)
    }
  }

  const handleImportHtml = () => {
    const quiz = parseQuizHtml(importHtml)
    
    if (!quiz || quiz.questions.length === 0) {
      toast.error("Could not parse questions from HTML")
      return
    }

    saveQuizzes([...quizzes, quiz])
    setShowImportDialog(false)
    setImportHtml("")
    setUploadedFileName("")
    setParsedPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    
    toast.success(`Quiz imported: "${quiz.title}" with ${quiz.questions.length} questions`)
  }

  const resetImportDialog = () => {
    setImportHtml("")
    setUploadEntries([])
    setUploadedFileName("")
    setParsedPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
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
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button onClick={handleAddQuiz} size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Create</span> Quiz
        </Button>
        <Button variant="outline" onClick={() => setShowImportDialog(true)} size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
          <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden xs:inline">Import</span> HTML
        </Button>
        <Button variant="outline" onClick={() => setShowLeaderboardDialog(true)} size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
          <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Leaderboard</span> ({leaderboard.length})
        </Button>
      </div>

      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <Card className="p-4 sm:p-8 text-center">
            <FileText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="font-semibold mb-2 text-sm sm:text-base">No Quizzes Yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              Create your first quiz or import from HTML file
            </p>
            <div className="flex flex-col xs:flex-row justify-center gap-2 sm:gap-3">
              <Button onClick={handleAddQuiz} size="sm" className="text-xs sm:text-sm">Create Quiz</Button>
              <Button variant="outline" onClick={() => setShowImportDialog(true)} size="sm" className="text-xs sm:text-sm">
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
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                    <CollapsibleTrigger className="flex items-start gap-2 text-left w-full sm:w-auto">
                      {expandedQuizzes.has(quiz.id) ? (
                        <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 mt-1" />
                      ) : (
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 mt-1" />
                      )}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-lg line-clamp-2">{quiz.title}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm line-clamp-1">{quiz.description}</CardDescription>
                      </div>
                    </CollapsibleTrigger>
                    
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap ml-6 sm:ml-0">
                      <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2">{quiz.category}</Badge>
                      <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                        {Math.floor(quiz.timeLimit / 60)}m
                      </Badge>
                      <Badge className="text-[10px] sm:text-xs px-1.5 sm:px-2">{quiz.questions.length} Q</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-3 flex-wrap">
                    <Switch 
                      checked={quiz.enabled}
                      onCheckedChange={() => handleToggleQuiz(quiz.id)}
                      className="scale-90 sm:scale-100"
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {quiz.enabled ? "Active" : "Disabled"}
                    </span>
                    
                    <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
                      <Button size="sm" variant="ghost" onClick={() => copyQuizLink(quiz.id)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                        <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                        <a href={`/quiz/${quiz.id}`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEditQuiz(quiz)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteQuiz(quiz.id)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="border-t pt-3 sm:pt-4 px-3 sm:px-6">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h4 className="font-semibold text-sm sm:text-base">Questions</h4>
                      <Button size="sm" onClick={() => handleAddQuestion(quiz.id)} className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3">
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden xs:inline">Add</span> Question
                      </Button>
                    </div>

                    {quiz.questions.length === 0 ? (
                      <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                        No questions yet. Add your first question.
                      </p>
                    ) : (
                      <div className="space-y-1.5 sm:space-y-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                        {quiz.questions.map((q, idx) => (
                          <div 
                            key={q.id}
                            className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg"
                          >
                            <span className="font-bold text-primary w-6 sm:w-8 shrink-0 text-xs sm:text-sm">
                              Q{idx + 1}
                            </span>
                            <div className="flex-1 text-xs sm:text-sm line-clamp-1 min-w-0">
                              {q.question.replace(/<[^>]*>/g, '')}
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs px-1 sm:px-2">{q.marks}m</Badge>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditQuestion(quiz.id, q)}
                              className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteQuestion(quiz.id, q.id)}
                              className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
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
        <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-sm sm:text-base">
              {editingQuiz?.createdAt && quizzes.some(q => q.id === editingQuiz.id) 
                ? "Edit Quiz" 
                : "Create Quiz"}
            </DialogTitle>
          </DialogHeader>

          {editingQuiz && (
            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 min-h-0 pr-1">
              <div>
                <Label className="text-xs sm:text-sm">Title</Label>
                <Input
                  value={editingQuiz.title}
                  onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                  placeholder="Quiz title"
                  className="text-sm"
                />
              </div>
              
              <div>
                <Label className="text-xs sm:text-sm">Description</Label>
                <Textarea
                  value={editingQuiz.description}
                  onChange={e => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                  placeholder="Quiz description"
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm flex items-center gap-1">
                    <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    Category
                  </Label>
                  <Select
                    value={editingQuiz.category}
                    onValueChange={v => setEditingQuiz({ ...editingQuiz, category: v })}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
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
                  <Label className="text-xs sm:text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    Time (min)
                  </Label>
                  <Input
                    type="number"
                    value={editingQuiz.timeLimit / 60}
                    onChange={e => setEditingQuiz({ 
                      ...editingQuiz, 
                      timeLimit: parseInt(e.target.value) * 60 || 600 
                    })}
                    min={5}
                    max={180}
                    className="text-sm h-8 sm:h-10"
                  />
                </div>
              </div>

              {/* Section & Difficulty */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm flex items-center gap-1">
                    <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    Section
                  </Label>
                  <Select
                    value={editingQuiz.section || "General"}
                    onValueChange={v => setEditingQuiz({ ...editingQuiz, section: v })}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs sm:text-sm flex items-center gap-1">
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    Difficulty
                  </Label>
                  <Select
                    value={editingQuiz.difficulty || "medium"}
                    onValueChange={v => setEditingQuiz({ ...editingQuiz, difficulty: v as "easy" | "medium" | "hard" })}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(d => (
                        <SelectItem key={d.value} value={d.value}>
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${d.color}`} />
                            {d.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <Label className="text-xs sm:text-sm flex items-center gap-1">
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  Visibility
                </Label>
                <Select
                  value={editingQuiz.visibility || "public"}
                  onValueChange={v => setEditingQuiz({ ...editingQuiz, visibility: v as VisibilityType })}
                >
                  <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <span className="flex items-center gap-2">
                        <Globe className="h-3 w-3" />
                        Public - Anyone can access
                      </span>
                    </SelectItem>
                    <SelectItem value="unlisted">
                      <span className="flex items-center gap-2">
                        <Link2 className="h-3 w-3" />
                        Unlisted - Only with link
                      </span>
                    </SelectItem>
                    <SelectItem value="private">
                      <span className="flex items-center gap-2">
                        <Lock className="h-3 w-3" />
                        Private - Admin only
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-xs sm:text-sm flex items-center gap-1">
                  <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-lg border border-border bg-background">
                  {(editingQuiz.tags || []).map((tag, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-[10px] sm:text-xs"
                      onClick={() => setEditingQuiz({
                        ...editingQuiz,
                        tags: (editingQuiz.tags || []).filter((_, idx) => idx !== i)
                      })}
                    >
                      #{tag}
                      <X className="h-2.5 w-2.5" />
                    </Badge>
                  ))}
                  <Input
                    placeholder="Add tag..."
                    className="flex-1 min-w-[80px] border-0 shadow-none h-6 px-1 focus-visible:ring-0 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault()
                        const val = (e.target as HTMLInputElement).value.trim().toLowerCase()
                        if (val && !(editingQuiz.tags || []).includes(val)) {
                          setEditingQuiz({
                            ...editingQuiz,
                            tags: [...(editingQuiz.tags || []), val]
                          })
                        }
                        ;(e.target as HTMLInputElement).value = ""
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Press Enter to add tags</p>
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 border-t pt-3 sm:pt-4 gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setShowQuizDialog(false)} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
              Cancel
            </Button>
            <Button onClick={handleSaveQuiz} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Save Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editingQuestion && quizzes
                .find(q => q.id === editingQuestion.quizId)
                ?.questions.some(q => q.id === editingQuestion.question.id)
                ? "Edit Question"
                : "Add Question"}
            </DialogTitle>
          </DialogHeader>

          {editingQuestion && (
            <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
              <div>
                <Label>Question</Label>
                <Textarea
                  value={editingQuestion.question.question}
                  onChange={e => setEditingQuestion({
                    ...editingQuestion,
                    question: { ...editingQuestion.question, question: e.target.value }
                  })}
                  placeholder="Enter question..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                {editingQuestion.question.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 font-bold text-primary text-sm">
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
                      className="flex-1"
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
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Select the correct answer</p>
              </div>

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
                  className="w-24"
                />
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
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 border-t pt-4 gap-2">
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog - Multi-File */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open)
        if (!open) resetImportDialog()
      }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Import Quizzes from HTML
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
            {/* Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-all duration-300 cursor-pointer group ${
                dragActive
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm"
                multiple
                onChange={handleMultiFileChange}
                className="hidden"
              />
              
              <div className="relative">
                <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <p className="font-semibold text-xs sm:text-sm text-foreground">Drop HTML files here or click to select</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Multiple files supported</p>
                
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 sm:mt-3">
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <Zap className="h-2.5 w-2.5" />
                    Fast
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-xs text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                    <Files className="h-2.5 w-2.5" />
                    Batch
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] sm:text-xs text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    <Settings2 className="h-2.5 w-2.5" />
                    Customize
                  </span>
                </div>
              </div>
            </div>

            {/* Global Settings */}
            {uploadEntries.length > 0 && (
              <Collapsible open={showGlobalSettings} onOpenChange={setShowGlobalSettings}>
                <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full flex items-center justify-between p-2 sm:p-3 h-auto hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Settings2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-foreground text-xs sm:text-sm">Global Settings</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Apply to all files</p>
                        </div>
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showGlobalSettings ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 sm:p-4 border-t border-border/50 space-y-3">
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div>
                          <Label className="text-[10px] sm:text-xs">Category</Label>
                          <Select value={globalSettings.category} onValueChange={v => setGlobalSettings(p => ({ ...p, category: v }))}>
                            <SelectTrigger className="h-8 text-xs">
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
                          <Label className="text-[10px] sm:text-xs">Section</Label>
                          <Select value={globalSettings.section} onValueChange={v => setGlobalSettings(p => ({ ...p, section: v }))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SECTIONS.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] sm:text-xs">Difficulty</Label>
                          <Select value={globalSettings.difficulty} onValueChange={v => setGlobalSettings(p => ({ ...p, difficulty: v as any }))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DIFFICULTIES.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] sm:text-xs">Visibility</Label>
                          <Select value={globalSettings.visibility} onValueChange={v => setGlobalSettings(p => ({ ...p, visibility: v as any }))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="public">Public</SelectItem>
                              <SelectItem value="unlisted">Unlisted</SelectItem>
                              <SelectItem value="private">Private</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button size="sm" onClick={applyGlobalSettings} className="w-full h-8 text-xs">
                        Apply to All Files
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Content Structure Editor */}
            {uploadEntries.length > 0 && (
              <Collapsible>
                <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full flex items-center justify-between p-2 sm:p-3 h-auto hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-accent/10">
                          <FolderOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-foreground text-[11px] sm:text-xs">Edit Content Structure</p>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Folders, categories, sections</p>
                        </div>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 transition-transform ui-expanded:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-2 sm:p-3 border-t border-border/50">
                      <InlineStructureEditor compact />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* File List */}
            {uploadEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-medium">{uploadEntries.length} file(s)</p>
                  <div className="flex gap-1.5">
                    <Badge variant="secondary" className="text-[10px] sm:text-xs bg-green-500/10 text-green-600">
                      {uploadEntries.filter(e => e.status === "ready").length} ready
                    </Badge>
                    {uploadEntries.some(e => e.status === "error") && (
                      <Badge variant="secondary" className="text-[10px] sm:text-xs bg-red-500/10 text-red-600">
                        {uploadEntries.filter(e => e.status === "error").length} failed
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                  {uploadEntries.map(entry => (
                    <div 
                      key={entry.id}
                      className={`p-2 sm:p-3 rounded-lg border transition-all ${
                        entry.status === "ready" 
                          ? "border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800" 
                          : entry.status === "error"
                            ? "border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800"
                            : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {entry.status === "parsing" && <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin text-primary shrink-0" />}
                          {entry.status === "ready" && <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 shrink-0" />}
                          {entry.status === "error" && <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[11px] sm:text-sm truncate">{entry.file.name}</p>
                            {entry.quiz && (
                              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                {entry.quiz.title} - {entry.quiz.questions.length} questions
                              </p>
                            )}
                            {entry.error && (
                              <p className="text-[10px] sm:text-xs text-red-500">{entry.error}</p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeUploadEntry(entry.id)}
                          className="h-6 w-6 sm:h-7 sm:w-7 p-0 shrink-0"
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                      
                      {entry.status === "ready" && (
                        <div className="grid grid-cols-2 gap-1.5 mt-2">
                          <Select 
                            value={entry.settings.category} 
                            onValueChange={v => updateEntrySettings(entry.id, "category", v)}
                          >
                            <SelectTrigger className="h-6 sm:h-7 text-[10px] sm:text-xs">
                              <SelectValue placeholder="Category" />
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
                          <Select 
                            value={entry.settings.difficulty} 
                            onValueChange={v => updateEntrySettings(entry.id, "difficulty", v)}
                          >
                            <SelectTrigger className="h-6 sm:h-7 text-[10px] sm:text-xs">
                              <SelectValue placeholder="Difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                              {DIFFICULTIES.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Single file paste option */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                  <FileText className="h-3 w-3 mr-1.5" />
                  Or paste HTML code directly
                  <ChevronDown className="h-3 w-3 ml-auto" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Textarea
                  value={importHtml}
                  onChange={e => {
                    setImportHtml(e.target.value)
                    if (e.target.value.length > 100) {
                      const quiz = parseQuizHtml(e.target.value)
                      if (quiz) {
                        setParsedPreview({ title: quiz.title, count: quiz.questions.length })
                      } else {
                        setParsedPreview(null)
                      }
                    }
                  }}
                  placeholder="Paste your quiz HTML code here..."
                  rows={4}
                  className="font-mono text-[10px] sm:text-xs"
                />
                {parsedPreview && (
                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs font-medium text-green-700 dark:text-green-400 truncate">
                          {parsedPreview.title}
                        </p>
                        <p className="text-[10px] text-green-600 dark:text-green-300">
                          {parsedPreview.count} questions detected
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter className="shrink-0 border-t pt-3 gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => { setShowImportDialog(false); resetImportDialog() }} size="sm" className="w-full sm:w-auto text-xs">
              Cancel
            </Button>
            {uploadEntries.filter(e => e.status === "ready").length > 0 ? (
              <Button onClick={importAllReady} size="sm" className="w-full sm:w-auto text-xs">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import {uploadEntries.filter(e => e.status === "ready").length} Quiz(es)
              </Button>
            ) : importHtml && parsedPreview ? (
              <Button onClick={handleImportHtml} size="sm" className="w-full sm:w-auto text-xs">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import Quiz
              </Button>
            ) : (
              <Button disabled size="sm" className="w-full sm:w-auto text-xs">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Management Dialog */}
      <Dialog open={showLeaderboardDialog} onOpenChange={setShowLeaderboardDialog}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Leaderboard Management
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No leaderboard entries yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div 
                    key={entry.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      index === 0 ? "bg-yellow-500/10 border-yellow-500/30" :
                      index === 1 ? "bg-gray-400/10 border-gray-400/30" :
                      index === 2 ? "bg-amber-700/10 border-amber-700/30" :
                      "bg-card border-border/50"
                    }`}
                  >
                    <div className="shrink-0 w-8 text-center">
                      {index === 0 ? <Crown className="h-5 w-5 text-yellow-500 mx-auto" /> :
                       <span className="font-bold text-muted-foreground">{index + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{entry.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{entry.quizTitle}</p>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <p className="font-bold text-primary">{entry.percentage}%</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const updated = leaderboard.filter(e => e.id !== entry.id)
                        setLeaderboard(updated)
                        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated))
                        toast.success("Entry deleted")
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t pt-4 gap-2 flex-col sm:flex-row">
            {leaderboard.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (confirm("Are you sure you want to clear all leaderboard entries? This cannot be undone.")) {
                    setLeaderboard([])
                    localStorage.removeItem(LEADERBOARD_KEY)
                    toast.success("Leaderboard cleared")
                  }
                }}
                className="w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowLeaderboardDialog(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
