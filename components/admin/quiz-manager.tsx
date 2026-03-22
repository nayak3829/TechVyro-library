"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Plus, Trash2, Edit, ChevronDown, ChevronRight, Clock, FileText,
  CheckCircle, Save, Upload, Copy, ExternalLink, FileUp, Loader2,
  Trophy, Users, Crown, Tag, Eye, EyeOff, Globe, Lock, Link2,
  FolderOpen, Zap, X, Settings2, Files, AlertCircle, CheckSquare,
  Square, MoveRight, ChevronUp, ArrowUp, ArrowDown, Search, Filter,
  Download, BarChart2, Shuffle, Minus, RefreshCw
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { InlineStructureEditor } from "./inline-structure-editor"
import { StructureSelector } from "./structure-selector"

// ── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "mcq" | "truefalse" | "multiselect"
type VisibilityType = "public" | "unlisted" | "private"

interface Question {
  id: string
  type: QuestionType
  question: string
  options: string[]
  correct: number          // for mcq/truefalse: 1-based index
  correctOptions: number[] // for multiselect: 1-based indices
  marks: number
  negativeMarks: number    // per-question negative marks override (0 = use quiz default)
  explanation: string
  timeLimit: number        // per-question time in seconds (0 = use quiz total)
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
  tags?: string[]
  visibility?: VisibilityType
  section?: string
  difficulty?: "easy" | "medium" | "hard"
  structureLocation?: { folderId: string; categoryId: string; sectionId: string }
  negativeMarking?: number    // marks deducted per wrong answer (e.g., 0.25)
  passingPercentage?: number  // pass threshold (e.g., 40)
  shuffleQuestions?: boolean
  shuffleOptions?: boolean
}

interface LeaderboardEntry {
  id: string; name: string; score: number; percentage: number
  correct: number; wrong: number; skipped: number; totalTime: number
  quizId: string; quizTitle: string; timestamp: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_CATEGORIES = ["Mathematics","Physics","Chemistry","Biology","English","General","NDA","SSC","History","Computer","Economics","Hindi","Sanskrit","Science"]
const SECTIONS = ["College","Competitive Exams","General","Practice","School"]
const DIFFICULTIES = [
  { value: "easy", label: "Easy", color: "bg-green-500" },
  { value: "medium", label: "Medium", color: "bg-amber-500" },
  { value: "hard", label: "Hard", color: "bg-red-500" },
]
const QUESTION_TYPES: { value: QuestionType; label: string; desc: string }[] = [
  { value: "mcq", label: "MCQ", desc: "Multiple choice — one correct answer" },
  { value: "truefalse", label: "True / False", desc: "Two options only" },
  { value: "multiselect", label: "Multi-select", desc: "Multiple correct answers" },
]

function generateId() { return Math.random().toString(36).slice(2, 11) }

function getAdminToken() {
  return typeof window !== "undefined" ? sessionStorage.getItem("admin_token") || "" : ""
}
function adminHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` }
}

function dbRowToQuiz(row: any): Quiz {
  return {
    id: row.id, title: row.title, description: row.description || "",
    category: row.category || "General", timeLimit: row.time_limit || 1200,
    questions: (row.questions || []).map((q: any) => ({
      id: q.id || generateId(),
      type: q.type || "mcq",
      question: q.question || "",
      options: q.options || ["","","",""],
      correct: q.correct || 1,
      correctOptions: q.correctOptions || [],
      marks: q.marks || 1,
      negativeMarks: q.negativeMarks ?? 0,
      explanation: q.explanation || "",
      timeLimit: q.timeLimit ?? 0,
    })),
    enabled: row.enabled ?? true, createdAt: row.created_at,
    tags: row.tags || [], visibility: row.visibility || "public",
    section: row.section || "General", difficulty: row.difficulty || "medium",
    structureLocation: row.structure_location || undefined,
    negativeMarking: row.negative_marking ?? 0,
    passingPercentage: row.passing_percentage ?? 0,
    shuffleQuestions: row.shuffle_questions ?? false,
    shuffleOptions: row.shuffle_options ?? false,
  }
}

const defaultQuestion: Question = {
  id: "", type: "mcq", question: "", options: ["","","",""],
  correct: 1, correctOptions: [], marks: 1, negativeMarks: 0, explanation: "", timeLimit: 0,
}

const defaultQuiz: Omit<Quiz, "id"|"createdAt"> = {
  title: "", description: "", category: "Mathematics", timeLimit: 1200, questions: [],
  enabled: true, tags: [], visibility: "public", section: "General", difficulty: "medium",
  negativeMarking: 0, passingPercentage: 0, shuffleQuestions: false, shuffleOptions: false,
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuizManager() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [extraCategories, setExtraCategories] = useState<string[]>([])
  const allCategories = [...BASE_CATEGORIES, ...extraCategories]
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<{ quizId: string; question: Question } | null>(null)
  const [showQuizDialog, setShowQuizDialog] = useState(false)
  const [showQuestionDialog, setShowQuestionDialog] = useState(false)
  const [mainTab, setMainTab] = useState<"quizzes" | "import" | "leaderboard">("quizzes")
  const [importHtml, setImportHtml] = useState("")
  const [expandedQuizzes, setExpandedQuizzes] = useState<Set<string>>(new Set())
  const [parsedPreview, setParsedPreview] = useState<{ title: string; count: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const jsonImportRef = useRef<HTMLInputElement>(null)

  // Multi-file HTML upload
  const [uploadEntries, setUploadEntries] = useState<{
    id: string; file: File | null; fileName: string
    status: "pending" | "parsing" | "ready" | "error"
    quiz: Quiz | null; error?: string
    included: boolean
    conflictId: string | null
    conflictAction: "skip" | "replace" | "copy"
    expanded: boolean
    editingTitle: boolean
    settings: { category: string; section: string; difficulty: "easy"|"medium"|"hard"; visibility: VisibilityType; tags: string[]; structureLocation: { folderId:string;categoryId:string;sectionId:string } }
  }[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [globalSettings, setGlobalSettings] = useState({
    category: "Mathematics", section: "General", difficulty: "medium" as "easy"|"medium"|"hard",
    visibility: "public" as VisibilityType, tags: [] as string[],
    structureLocation: { folderId: "", categoryId: "", sectionId: "" }
  })
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)
  const [importTab, setImportTab] = useState<"html"|"json">("html")
  const [showPasteHtml, setShowPasteHtml] = useState(false)

  // ── JSON Import state ──────────────────────────────────────────────────────
  type ConflictAction = "skip" | "replace" | "copy"
  interface JsonQuizItem {
    quiz: Quiz
    included: boolean
    conflictId: string | null
    conflictAction: ConflictAction
  }
  interface JsonFileEntry {
    id: string
    file: File | null
    fileName: string
    status: "pending" | "parsing" | "ready" | "error"
    quizzes: JsonQuizItem[]
    error?: string
    settings: { category: string; section: string; difficulty: "easy"|"medium"|"hard"; visibility: VisibilityType }
    expanded: boolean
  }
  const [jsonEntries, setJsonEntries] = useState<JsonFileEntry[]>([])
  const [jsonDragActive, setJsonDragActive] = useState(false)
  const [pasteJsonText, setPasteJsonText] = useState("")
  const [showPasteJson, setShowPasteJson] = useState(false)
  const [showJsonGlobalSettings, setShowJsonGlobalSettings] = useState(false)
  const [jsonGs, setJsonGs] = useState({ category: "Mathematics", section: "General", difficulty: "medium" as "easy"|"medium"|"hard", visibility: "public" as VisibilityType })

  // Bulk selection
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set())
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false)
  const [bulkMoveTarget, setBulkMoveTarget] = useState({
    category: "", section: "",
    structureLocation: { folderId: "", categoryId: "", sectionId: "" }
  })

  // Search/filter
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterDifficulty, setFilterDifficulty] = useState("all")
  const [filterEnabled, setFilterEnabled] = useState("all")

  useEffect(() => {
    fetch("/api/quizzes").then(r => r.json()).then(data => {
      if (data.quizzes) setQuizzes(data.quizzes.map(dbRowToQuiz))
    }).catch(() => {})
    fetch("/api/quiz-results").then(r => r.json()).then(data => {
      if (data.results) setLeaderboard(data.results.map((e: any) => ({
        id: e.id, name: e.name, score: e.score,
        percentage: Number(e.percentage), correct: e.correct, wrong: e.wrong,
        skipped: e.skipped, totalTime: e.total_time, quizId: e.quiz_id,
        quizTitle: e.quiz_title, timestamp: e.created_at,
      })))
    }).catch(() => {})
  }, [])

  // ── Quiz CRUD ──────────────────────────────────────────────────────────────

  const saveQuizzes = async (updated: Quiz[]) => {
    const prev = quizzes
    setQuizzes(updated)
    const prevMap = new Map(prev.map(q => [q.id, q]))
    const updatedMap = new Map(updated.map(q => [q.id, q]))
    const toCreate = updated.filter(q => !prevMap.has(q.id))
    const toDelete = prev.filter(q => !updatedMap.has(q.id))
    const toUpdate = updated.filter(q => {
      const old = prevMap.get(q.id)
      return old && JSON.stringify(old) !== JSON.stringify(q)
    })
    const headers = adminHeaders()
    await Promise.all([
      ...toCreate.map(q => fetch("/api/quizzes", { method: "POST", headers, body: JSON.stringify({ ...q, negativeMarking: q.negativeMarking, passingPercentage: q.passingPercentage, shuffleQuestions: q.shuffleQuestions, shuffleOptions: q.shuffleOptions }) }).catch(() => {})),
      ...toDelete.map(q => fetch(`/api/quizzes/${q.id}`, { method: "DELETE", headers }).catch(() => {})),
      ...toUpdate.map(q => fetch(`/api/quizzes/${q.id}`, { method: "PUT", headers, body: JSON.stringify({ ...q, negativeMarking: q.negativeMarking, passingPercentage: q.passingPercentage, shuffleQuestions: q.shuffleQuestions, shuffleOptions: q.shuffleOptions }) }).catch(() => {})),
    ])
  }

  const handleAddQuiz = () => {
    setEditingQuiz({ ...defaultQuiz, id: generateId(), createdAt: new Date().toISOString() })
    setShowQuizDialog(true)
  }
  const handleEditQuiz = (quiz: Quiz) => { setEditingQuiz({ ...quiz }); setShowQuizDialog(true) }
  const handleSaveQuiz = () => {
    if (!editingQuiz) return
    if (!editingQuiz.title.trim()) { toast.error("Quiz title is required"); return }
    const existing = quizzes.find(q => q.id === editingQuiz.id)
    const updated = existing ? quizzes.map(q => q.id === editingQuiz.id ? editingQuiz : q) : [...quizzes, editingQuiz]
    saveQuizzes(updated)
    setShowQuizDialog(false); setEditingQuiz(null)
    toast.success(existing ? "Quiz updated" : "Quiz created")
  }
  const handleDeleteQuiz = (quizId: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return
    saveQuizzes(quizzes.filter(q => q.id !== quizId))
    toast.success("Quiz deleted")
  }
  const handleToggleQuiz = (quizId: string) => {
    saveQuizzes(quizzes.map(q => q.id === quizId ? { ...q, enabled: !q.enabled } : q))
  }
  const handleDuplicateQuiz = (quiz: Quiz) => {
    const dup = { ...quiz, id: generateId(), title: `${quiz.title} (Copy)`, createdAt: new Date().toISOString() }
    saveQuizzes([...quizzes, dup])
    toast.success("Quiz duplicated")
  }

  // ── Bulk Ops ───────────────────────────────────────────────────────────────

  const toggleQuizSelection = (id: string) => {
    setSelectedQuizzes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleSelectAll = () => {
    setSelectedQuizzes(selectedQuizzes.size === filteredQuizzes.length ? new Set() : new Set(filteredQuizzes.map(q => q.id)))
  }
  const handleBulkDelete = () => {
    if (!selectedQuizzes.size || !confirm(`Delete ${selectedQuizzes.size} quizzes?`)) return
    saveQuizzes(quizzes.filter(q => !selectedQuizzes.has(q.id)))
    setSelectedQuizzes(new Set()); toast.success(`Deleted ${selectedQuizzes.size} quizzes`)
  }
  const handleBulkToggle = (enable: boolean) => {
    if (!selectedQuizzes.size) return
    saveQuizzes(quizzes.map(q => selectedQuizzes.has(q.id) ? { ...q, enabled: enable } : q))
    toast.success(`${enable ? "Enabled" : "Disabled"} ${selectedQuizzes.size} quizzes`)
  }
  const handleBulkMove = () => {
    if (!selectedQuizzes.size) return
    const hasLoc = bulkMoveTarget.structureLocation?.sectionId
    if (!bulkMoveTarget.category && !hasLoc) { toast.error("Please select a category or location"); return }
    saveQuizzes(quizzes.map(q =>
      selectedQuizzes.has(q.id) ? {
        ...q,
        ...(bulkMoveTarget.category && { category: bulkMoveTarget.category }),
        ...(bulkMoveTarget.section && { section: bulkMoveTarget.section }),
        ...(hasLoc && { structureLocation: bulkMoveTarget.structureLocation }),
      } : q
    ))
    const count = selectedQuizzes.size
    setSelectedQuizzes(new Set()); setShowBulkMoveDialog(false)
    setBulkMoveTarget({ category: "", section: "", structureLocation: { folderId:"",categoryId:"",sectionId:"" } })
    toast.success(`Moved ${count} quizzes`)
  }
  const handleBulkDuplicate = () => {
    if (!selectedQuizzes.size) return
    const dups = quizzes.filter(q => selectedQuizzes.has(q.id)).map(q => ({
      ...q, id: generateId(), title: `${q.title} (Copy)`, createdAt: new Date().toISOString()
    }))
    saveQuizzes([...quizzes, ...dups])
    setSelectedQuizzes(new Set()); toast.success(`Duplicated ${selectedQuizzes.size} quizzes`)
  }

  // ── Questions ──────────────────────────────────────────────────────────────

  const handleAddQuestion = (quizId: string) => {
    setEditingQuestion({ quizId, question: { ...defaultQuestion, id: generateId() } })
    setShowQuestionDialog(true)
  }
  const handleEditQuestion = (quizId: string, question: Question) => {
    setEditingQuestion({ quizId, question: { ...question } }); setShowQuestionDialog(true)
  }
  const handleSaveQuestion = () => {
    if (!editingQuestion) return
    const { quizId, question } = editingQuestion
    if (!question.question.trim()) { toast.error("Question text is required"); return }
    if (question.type === "mcq" && question.options.some(o => !o.trim())) {
      toast.error("All options must be filled"); return
    }
    if (question.type === "multiselect" && question.correctOptions.length < 1) {
      toast.error("Select at least one correct answer"); return
    }
    const quiz = quizzes.find(q => q.id === quizId)
    if (!quiz) return
    const idx = quiz.questions.findIndex(q => q.id === question.id)
    const updated = idx >= 0
      ? quiz.questions.map(q => q.id === question.id ? question : q)
      : [...quiz.questions, question]
    saveQuizzes(quizzes.map(q => q.id === quizId ? { ...q, questions: updated } : q))
    setShowQuestionDialog(false); setEditingQuestion(null)
    toast.success(idx >= 0 ? "Question updated" : "Question added")
  }
  const handleDeleteQuestion = (quizId: string, questionId: string) => {
    if (!confirm("Delete this question?")) return
    saveQuizzes(quizzes.map(q => q.id === quizId ? { ...q, questions: q.questions.filter(qq => qq.id !== questionId) } : q))
    toast.success("Question deleted")
  }
  const handleMoveQuestion = (quizId: string, idx: number, dir: -1 | 1) => {
    const quiz = quizzes.find(q => q.id === quizId)
    if (!quiz) return
    const qs = [...quiz.questions]
    const target = idx + dir
    if (target < 0 || target >= qs.length) return
    ;[qs[idx], qs[target]] = [qs[target], qs[idx]]
    saveQuizzes(quizzes.map(q => q.id === quizId ? { ...q, questions: qs } : q))
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  const exportQuizJson = (quiz: Quiz) => {
    const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`
    a.click(); URL.revokeObjectURL(url)
    toast.success("Quiz exported as JSON")
  }

  const importFromJson = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      // Accept single quiz or array of quizzes
      const items: any[] = Array.isArray(data) ? data : [data]
      const imported: Quiz[] = items.filter(q => q.title && Array.isArray(q.questions)).map(q => ({
        ...q, id: generateId(), createdAt: new Date().toISOString(),
        questions: (q.questions || []).map((qq: any) => ({ ...defaultQuestion, ...qq, id: generateId() })),
      }))
      if (!imported.length) { toast.error("No valid quizzes found in JSON file"); return }
      saveQuizzes([...quizzes, ...imported])
      setMainTab("quizzes"); resetImportDialog()
      toast.success(`Imported ${imported.length} quiz${imported.length > 1 ? "zes" : ""}`)
    } catch {
      toast.error("Invalid JSON file")
    }
  }

  // ── JSON Import Logic ──────────────────────────────────────────────────────

  const normalizeImportedQuiz = (q: any, settings?: JsonFileEntry["settings"]): Quiz => ({
    ...defaultQuiz,
    title: String(q.title || "").replace(/Boss_Quiz_Robot|LearnWithSumit|Sumit\s*Raftaar|Sumit/gi, "TechVyro").trim() || "Imported Quiz",
    description: q.description || "",
    category: settings?.category || q.category || "General",
    section: settings?.section || q.section || "General",
    difficulty: settings?.difficulty || q.difficulty || "medium",
    visibility: settings?.visibility || q.visibility || "public",
    timeLimit: q.timeLimit || q.time_limit || 1200,
    tags: q.tags || [],
    negativeMarking: q.negativeMarking ?? q.negative_marking ?? 0,
    passingPercentage: q.passingPercentage ?? q.passing_percentage ?? 0,
    shuffleQuestions: q.shuffleQuestions ?? q.shuffle_questions ?? false,
    shuffleOptions: q.shuffleOptions ?? q.shuffle_options ?? false,
    id: generateId(),
    createdAt: new Date().toISOString(),
    questions: (q.questions || []).map((qq: any) => ({
      ...defaultQuestion,
      id: generateId(),
      type: qq.type || "mcq",
      question: String(qq.question || ""),
      options: qq.options || ["","","",""],
      correct: qq.correct || 1,
      correctOptions: qq.correctOptions || [],
      marks: qq.marks || 1,
      negativeMarks: qq.negativeMarks ?? 0,
      explanation: qq.explanation || "",
      timeLimit: qq.timeLimit ?? 0,
    })),
    enabled: q.enabled ?? true,
    structureLocation: q.structureLocation || undefined,
  })

  const findConflict = (title: string): string | null => {
    const norm = title.toLowerCase().trim()
    return quizzes.find(q => q.title.toLowerCase().trim() === norm)?.id || null
  }

  const buildJsonItems = (items: any[], settings?: JsonFileEntry["settings"]): JsonQuizItem[] =>
    items.filter(q => q.title && Array.isArray(q.questions)).map(q => {
      const quiz = normalizeImportedQuiz(q, settings)
      const conflictId = findConflict(quiz.title)
      return { quiz, included: true, conflictId, conflictAction: "copy" as ConflictAction }
    })

  const processJsonFiles = async (files: File[]) => {
    const defaultSettings = { category: "Mathematics", section: "General", difficulty: "medium" as const, visibility: "public" as VisibilityType }
    const newEntries: JsonFileEntry[] = files.map(f => ({
      id: generateId(), file: f, fileName: f.name,
      status: "pending" as const, quizzes: [], settings: { ...defaultSettings }, expanded: true,
    }))
    setJsonEntries(prev => [...prev, ...newEntries])
    for (const entry of newEntries) {
      setJsonEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "parsing" as const } : e))
      try {
        const text = await entry.file!.text()
        const data = JSON.parse(text)
        const items: any[] = Array.isArray(data) ? data : [data]
        const quizItems = buildJsonItems(items, entry.settings)
        if (!quizItems.length) {
          setJsonEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "error" as const, error: "No valid quizzes found in this file" } : e))
        } else {
          setJsonEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "ready" as const, quizzes: quizItems } : e))
        }
      } catch {
        setJsonEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "error" as const, error: "Invalid JSON file" } : e))
      }
    }
  }

  const addPastedJsonEntry = () => {
    try {
      const data = JSON.parse(pasteJsonText.trim())
      const items: any[] = Array.isArray(data) ? data : [data]
      const quizItems = buildJsonItems(items)
      if (!quizItems.length) { toast.error("No valid quizzes found in pasted text"); return }
      setJsonEntries(prev => [...prev, {
        id: generateId(), file: null, fileName: "Pasted JSON",
        status: "ready" as const, quizzes: quizItems,
        settings: { category: "Mathematics", section: "General", difficulty: "medium" as const, visibility: "public" as VisibilityType },
        expanded: true,
      }])
      setPasteJsonText(""); setShowPasteJson(false)
      toast.success(`Parsed ${quizItems.length} quiz${quizItems.length !== 1 ? "zes" : ""} from pasted JSON`)
    } catch { toast.error("Invalid JSON — check formatting and try again") }
  }

  const toggleJsonQuiz = (fileId: string, idx: number) => {
    setJsonEntries(prev => prev.map(e => {
      if (e.id !== fileId) return e
      const quizzes = [...e.quizzes]
      quizzes[idx] = { ...quizzes[idx], included: !quizzes[idx].included }
      return { ...e, quizzes }
    }))
  }

  const setJsonConflictAction = (fileId: string, idx: number, action: ConflictAction) => {
    setJsonEntries(prev => prev.map(e => {
      if (e.id !== fileId) return e
      const quizzes = [...e.quizzes]
      quizzes[idx] = { ...quizzes[idx], conflictAction: action }
      return { ...e, quizzes }
    }))
  }

  const applyJsonFileSettings = (fileId: string, settings: JsonFileEntry["settings"]) => {
    setJsonEntries(prev => prev.map(e => {
      if (e.id !== fileId) return e
      return {
        ...e, settings,
        quizzes: e.quizzes.map(item => ({
          ...item,
          quiz: { ...item.quiz, category: settings.category, section: settings.section, difficulty: settings.difficulty, visibility: settings.visibility }
        }))
      }
    }))
  }

  const applyJsonGlobalSettings = (settings: JsonFileEntry["settings"]) => {
    setJsonEntries(prev => prev.map(e => ({
      ...e, settings,
      quizzes: e.quizzes.map(item => ({
        ...item,
        quiz: { ...item.quiz, category: settings.category, section: settings.section, difficulty: settings.difficulty, visibility: settings.visibility }
      }))
    })))
    toast.success("Global settings applied to all JSON files")
  }

  const importAllJsonQuizzes = () => {
    const toImport: Quiz[] = []
    const toReplace: Quiz[] = []
    for (const entry of jsonEntries) {
      if (entry.status !== "ready") continue
      for (const item of entry.quizzes) {
        if (!item.included) continue
        if (item.conflictId) {
          if (item.conflictAction === "skip") continue
          if (item.conflictAction === "replace") { toReplace.push({ ...item.quiz, id: item.conflictId }); continue }
          toImport.push({ ...item.quiz, title: `${item.quiz.title} (Copy)` })
        } else {
          toImport.push(item.quiz)
        }
      }
    }
    if (!toImport.length && !toReplace.length) { toast.error("No quizzes selected to import"); return }
    const updatedQuizzes = [
      ...quizzes.map(q => { const r = toReplace.find(rq => rq.id === q.id); return r || q }),
      ...toImport,
    ]
    saveQuizzes(updatedQuizzes)
    setMainTab("quizzes"); resetImportDialog()
    toast.success(`Imported ${toImport.length} quiz${toImport.length !== 1 ? "zes" : ""}${toReplace.length ? `, replaced ${toReplace.length}` : ""}`)
  }

  const jsonReadyCount = jsonEntries.flatMap(e => e.quizzes).filter(q => q.included).length
  const jsonConflictCount = jsonEntries.flatMap(e => e.quizzes).filter(q => q.included && q.conflictId && q.conflictAction !== "skip").length

  // ── HTML Parser ────────────────────────────────────────────────────────────

  /** Extract category from text using keyword maps. Returns null if no match. */
  const detectCategoryFromText = (text: string): string | null => {
    const t = text.toLowerCase()
    if (t.match(/\bmath(s|ematics)?\b|\balgebra\b|\bgeometry\b|\btrigono\b|\bcalculus\b|\barithmetic\b|\bquantitative\b/)) return "Mathematics"
    if (t.match(/\bphysics\b|\bmechanics\b|\boptics\b|\bthermodynamics\b|\belectromagn/)) return "Physics"
    if (t.match(/\bchemistry\b|\borganic\b|\binorganic\b|\bperiodic table\b|\bmole concept\b|\bbonding\b/)) return "Chemistry"
    if (t.match(/\bbiology\b|\bbotany\b|\bzoology\b|\becology\b|\bgenetics\b|\bcell\b|\bvirus\b|\bbacteria\b/)) return "Biology"
    if (t.match(/\benglish\b|\bgrammar\b|\bvocabulary\b|\bcomprehension\b|\bsynonym\b|\bantonym\b/)) return "English"
    if (t.match(/\bhistory\b|\bancient\b|\bmedieval\b|\bmodern history\b|\bcivilization\b|\bempire\b|\bhist\b/)) return "History"
    if (t.match(/\bcomputer\b|\bprogramming\b|\bsoftware\b|\bcoding\b|\balgorithm\b|\bdata structure\b|\bnetwork\b|\boperating system\b/)) return "Computer"
    if (t.match(/\beconomics\b|\bmicroeconomics\b|\bmacroeconomics\b|\bgdp\b|\binflation\b|\bmarket\b|\bdemand\b|\bsupply\b/)) return "Economics"
    if (t.match(/\bhindi\b|\bh[iī]nd[iī]\b/)) return "Hindi"
    if (t.match(/\bsanskrit\b|\bsanskrit\b/)) return "Sanskrit"
    if (t.match(/\bscience\b|\bgeneral science\b/)) return "Science"
    if (t.match(/\bnda\b|\bna(tional)?\s*defence\b|\bdefence (academy|exam)\b/)) return "NDA"
    if (t.match(/\bssc\b|\bstaff selection\b|\bcgl\b|\bchsl\b|\bmts\b/)) return "SSC"
    if (t.match(/\bgeo(graphy)?\b|\bcontinent\b|\bcapital\b|\briver\b|\bmountain\b|\bclimate\b/)) return "Geography"
    if (t.match(/\bpolity\b|\bconstitution\b|\bparliament\b|\bjudiciary\b|\bfundamental rights\b/)) return "Polity"
    if (t.match(/\bcurrent affairs?\b|\bnews\b|\beveryday science\b/)) return "Current Affairs"
    if (t.match(/\bgeneral knowledge\b|\bgk\b|\bgeneral awareness\b/)) return "GK"
    return null
  }

  /** Detect difficulty level from text */
  const detectDifficulty = (text: string): "easy" | "medium" | "hard" => {
    const t = text.toLowerCase()
    if (t.match(/\beasy\b|\bbasic\b|\bbeginner\b|\bsimple\b|\bclass [1-8]\b/)) return "easy"
    if (t.match(/\bhard\b|\badvanced\b|\bdifficult\b|\btough\b|\bexpert\b|\bhigh level\b/)) return "hard"
    return "medium"
  }

  /** Detect section from text */
  const detectSection = (text: string): string => {
    const t = text.toLowerCase()
    if (t.match(/\bcompetitive\b|\bupsc\b|\bnda\b|\bssc\b|\bjee\b|\bneet\b|\bibps\b|\bbank\b|\bexam\b|\bentr(ance|y)\b|\bpyq\b|\bprevious year\b/)) return "Competitive Exams"
    if (t.match(/\bcollege\b|\buniversity\b|\bbsc\b|\bba\b|\bba \b|\bbcom\b/)) return "College"
    if (t.match(/\bschool\b|\bclass [1-9]\b|\bclass 1[0-2]\b|\bcbse\b|\bncert\b|\bicse\b/)) return "School"
    if (t.match(/\bpractice\b|\btest\b|\bmock\b|\bquiz\b/)) return "Practice"
    return "General"
  }

  const parseQuizHtml = (html: string): Quiz | null => {
    try {
      let title = ""
      const titlePatterns = [
        /<h1[^>]*class="[^"]*start-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
        /<div[^>]*class="[^"]*start-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
        /<h1[^>]*>([\s\S]*?)<\/h1>/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i,
      ]
      for (const p of titlePatterns) {
        const m = html.match(p)
        if (m) { title = m[1].replace(/<[^>]*>/g, "").trim(); if (title) break }
      }
      title = title.replace(/Boss_Quiz_Robot|LearnWithSumit|Sumit\s*Raftaar|Sumit/gi, "TechVyro").replace(/\s+/g, " ").trim() || "Imported Quiz"

      let questionsData: any[] = []
      let timeLimit = 1200
      const timeMatch = html.match(/const\s+TIME\s*=\s*(\d+)/i)
      if (timeMatch) timeLimit = parseInt(timeMatch[1])

      const jsonArrayMatch = html.match(/const\s+Q\s*=\s*(\[[\s\S]*?\]);/m)
      if (jsonArrayMatch) { try { questionsData = JSON.parse(jsonArrayMatch[1]) } catch {} }

      if (!questionsData.length) {
        const qArrayMatch = html.match(/const\s+Q\s*=\s*\[([\s\S]*?)\];/m)
        if (qArrayMatch) {
          const content = qArrayMatch[1]
          const re = /\{\s*question\s*:\s*[`'"]([\s\S]*?)[`'"]\s*,\s*options\s*:\s*\[([\s\S]*?)\]\s*,\s*correct\s*:\s*(\d+)/g
          let m
          while ((m = re.exec(content)) !== null) {
            const optMatches = m[2].match(/[`'"]([^`'"]*)[`'"]/g)
            const options = optMatches ? optMatches.map((o: string) => o.slice(1, -1).trim()) : []
            if (options.length >= 2) questionsData.push({ question: m[1].trim(), options, correct: parseInt(m[3]), marks: 1, explanation: "" })
          }
        }
      }

      if (!questionsData.length) {
        const questions = [...html.matchAll(/"question"\s*:\s*"((?:[^"\\]|\\.)*)"/gi)]
        const optionSets = [...html.matchAll(/"options"\s*:\s*\[([\s\S]*?)\]/gi)]
        const corrects = [...html.matchAll(/"correct"\s*:\s*(\d+)/gi)]
        for (let i = 0; i < questions.length; i++) {
          if (optionSets[i] && corrects[i]) {
            const optMatches = optionSets[i][1].match(/"((?:[^"\\]|\\.)*)"/g)
            const options = optMatches ? optMatches.map((o: string) => o.slice(1, -1).trim()) : []
            if (options.length >= 2) questionsData.push({ question: questions[i][1].trim(), options, correct: parseInt(corrects[i][1]), marks: 1, explanation: "" })
          }
        }
      }

      if (!questionsData.length) return null

      const questions: Question[] = questionsData.map((q: any) => ({
        id: generateId(), type: "mcq" as QuestionType,
        question: String(q.question || "").replace(/Boss_Quiz_Robot|LearnWithSumit|Sumit/gi, "TechVyro"),
        options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : ["","","",""],
        correct: typeof q.correct === "number" ? q.correct : 1,
        correctOptions: [], marks: q.marks || 1, negativeMarks: 0,
        explanation: String(q.explanation || q.solution || ""), timeLimit: 0,
      }))

      // ── Auto-detect metadata ──────────────────────────────────────────────

      // 1. Try JS variable extraction first (most reliable)
      let detectedCategory: string | null = null
      const jsVarPatterns = [
        /(?:var|const|let)\s+(?:subject|SUBJECT|category|CATEGORY|topic|TOPIC|sub|SUB)\s*=\s*["'`]([^"'`]+)["'`]/i,
        /data-subject\s*=\s*["']([^"']+)["']/i,
        /data-category\s*=\s*["']([^"']+)["']/i,
        /<meta[^>]+name=["'](?:subject|category|topic)["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["'](?:subject|category|topic)["']/i,
      ]
      for (const p of jsVarPatterns) {
        const m = html.match(p)
        if (m && m[1].trim()) {
          const raw = m[1].trim()
          // Try to map it to a known category first, otherwise use it as-is
          detectedCategory = detectCategoryFromText(raw) || raw
          break
        }
      }

      // 2. Fall back to title-based detection
      if (!detectedCategory) {
        detectedCategory = detectCategoryFromText(title)
      }

      // 3. Scan first 5KB of HTML body for subject keywords
      if (!detectedCategory) {
        const bodySnippet = html.slice(0, 5000)
        detectedCategory = detectCategoryFromText(bodySnippet)
      }

      const category = detectedCategory || "General"

      // Detect difficulty and section from title
      const difficulty = detectDifficulty(title)
      const section = detectSection(title)

      return {
        id: generateId(), title,
        description: `${questions.length} questions | ${Math.floor(timeLimit/60)} minutes`,
        category, difficulty, section,
        timeLimit, questions, enabled: true,
        createdAt: new Date().toISOString(),
        negativeMarking: 0, passingPercentage: 0,
        shuffleQuestions: false, shuffleOptions: false,
      }
    } catch { return null }
  }

  /** Ensure a category exists — if not in allCategories, create it via API */
  const ensureCategoryExists = async (category: string) => {
    if (allCategories.includes(category)) return
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: category }),
      })
      if (res.ok || res.status === 400) {
        // 400 = already exists in DB (race condition) — still add to local state
        setExtraCategories(prev => prev.includes(category) ? prev : [...prev, category])
      }
    } catch {
      // Add locally even if API fails
      setExtraCategories(prev => prev.includes(category) ? prev : [...prev, category])
    }
  }

  // ── Multi-file HTML handlers ───────────────────────────────────────────────

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".html") || f.name.endsWith(".htm"))
    files.length ? processMultipleFiles(files) : toast.error("Please drop HTML files only")
  }
  const handleMultiFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.name.endsWith(".html") || f.name.endsWith(".htm"))
    files.length ? processMultipleFiles(files) : toast.error("Please select HTML files")
    if (e.target) e.target.value = ""
  }

  const makeHtmlEntry = (file: File | null, fileName: string) => ({
    id: generateId(), file, fileName,
    status: "pending" as const, quiz: null as Quiz | null,
    included: true, conflictId: null as string | null, conflictAction: "copy" as const,
    expanded: false, editingTitle: false,
    settings: { ...globalSettings },
  })

  const processMultipleFiles = async (files: File[]) => {
    const entries = files.map(f => makeHtmlEntry(f, f.name))
    setUploadEntries(prev => [...prev, ...entries])
    for (const entry of entries) {
      setUploadEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "parsing" as const } : e))
      try {
        const text = await entry.file!.text()
        const quiz = parseQuizHtml(text)
        if (quiz) {
          const conflictId = quizzes.find(q => q.title.toLowerCase().trim() === quiz.title.toLowerCase().trim())?.id || null
          // Auto-create category if new
          await ensureCategoryExists(quiz.category)
          // Detect difficulty, section from full HTML too (improve accuracy)
          const htmlDifficulty = detectDifficulty(text)
          const htmlSection = detectSection(text)
          const finalQuiz = {
            ...quiz,
            difficulty: quiz.difficulty !== "medium" ? quiz.difficulty : htmlDifficulty,
            section: quiz.section !== "General" ? quiz.section : htmlSection,
            visibility: entry.settings.visibility,
            tags: entry.settings.tags,
          }
          setUploadEntries(prev => prev.map(e => e.id === entry.id ? {
            ...e, status: "ready" as const, conflictId,
            quiz: finalQuiz,
            settings: { ...e.settings, category: finalQuiz.category, difficulty: finalQuiz.difficulty || "medium", section: finalQuiz.section || "General" },
          } : e))
        } else {
          setUploadEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "error" as const, error: "Could not parse quiz — format may not be supported" } : e))
        }
      } catch {
        setUploadEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: "error" as const, error: "Failed to read file" } : e))
      }
    }
  }

  const retryUploadEntry = async (id: string) => {
    const entry = uploadEntries.find(e => e.id === id)
    if (!entry?.file) return
    setUploadEntries(prev => prev.map(e => e.id === id ? { ...e, status: "parsing" as const, error: undefined } : e))
    try {
      const text = await entry.file.text()
      const quiz = parseQuizHtml(text)
      if (quiz) {
        const conflictId = quizzes.find(q => q.title.toLowerCase().trim() === quiz.title.toLowerCase().trim())?.id || null
        await ensureCategoryExists(quiz.category)
        const htmlDifficulty = detectDifficulty(text)
        const htmlSection = detectSection(text)
        const finalQuiz = {
          ...quiz,
          difficulty: quiz.difficulty !== "medium" ? quiz.difficulty : htmlDifficulty,
          section: quiz.section !== "General" ? quiz.section : htmlSection,
          visibility: entry.settings.visibility,
          tags: entry.settings.tags,
        }
        setUploadEntries(prev => prev.map(e => e.id === id ? {
          ...e, status: "ready" as const, conflictId,
          quiz: finalQuiz,
          settings: { ...e.settings, category: finalQuiz.category, difficulty: finalQuiz.difficulty || "medium", section: finalQuiz.section || "General" },
        } : e))
      } else {
        setUploadEntries(prev => prev.map(e => e.id === id ? { ...e, status: "error" as const, error: "Could not parse quiz — format may not be supported" } : e))
      }
    } catch {
      setUploadEntries(prev => prev.map(e => e.id === id ? { ...e, status: "error" as const, error: "Failed to read file" } : e))
    }
  }

  const addPastedHtmlEntry = async () => {
    if (!importHtml.trim()) return
    const quiz = parseQuizHtml(importHtml)
    if (!quiz) { toast.error("Could not parse quiz from pasted HTML"); return }
    await ensureCategoryExists(quiz.category)
    const conflictId = quizzes.find(q => q.title.toLowerCase().trim() === quiz.title.toLowerCase().trim())?.id || null
    const base = makeHtmlEntry(null, "Pasted HTML")
    const entry = {
      ...base,
      status: "ready" as const,
      conflictId,
      quiz,
      settings: { ...base.settings, category: quiz.category, difficulty: (quiz.difficulty || "medium") as "easy"|"medium"|"hard", section: quiz.section || "General" },
    }
    setUploadEntries(prev => [...prev, entry])
    setImportHtml(""); setParsedPreview(null); setShowPasteHtml(false)
    toast.success(`Parsed "${quiz.title}" — ${quiz.questions.length} questions`)
  }

  const removeUploadEntry = (id: string) => setUploadEntries(prev => prev.filter(e => e.id !== id))
  const toggleHtmlEntry = (id: string) => setUploadEntries(prev => prev.map(e => e.id === id ? { ...e, included: !e.included } : e))
  const setHtmlConflictAction = (id: string, action: "skip"|"replace"|"copy") => setUploadEntries(prev => prev.map(e => e.id === id ? { ...e, conflictAction: action } : e))
  const toggleHtmlExpanded = (id: string) => setUploadEntries(prev => prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e))
  const renameHtmlQuiz = (id: string, title: string) => setUploadEntries(prev => prev.map(e => e.id === id && e.quiz ? { ...e, quiz: { ...e.quiz, title } } : e))

  const updateEntrySettings = (id: string, key: string, value: any) => {
    setUploadEntries(prev => prev.map(e => {
      if (e.id !== id) return e
      return { ...e, settings: { ...e.settings, [key]: value }, quiz: e.quiz ? { ...e.quiz, [key]: value } : null }
    }))
  }
  const applyGlobalSettings = () => {
    setUploadEntries(prev => prev.map(e => ({
      ...e, settings: { ...globalSettings },
      quiz: e.quiz ? { ...e.quiz, category: globalSettings.category, section: globalSettings.section, difficulty: globalSettings.difficulty, visibility: globalSettings.visibility, tags: globalSettings.tags } : null
    })))
    toast.success("Global settings applied to all files")
  }
  const importAllReady = () => {
    const toImport: Quiz[] = []
    const toReplace: Quiz[] = []
    for (const e of uploadEntries) {
      if (!e.included || e.status !== "ready" || !e.quiz) continue
      if (e.conflictId) {
        if (e.conflictAction === "skip") continue
        if (e.conflictAction === "replace") { toReplace.push({ ...e.quiz, id: e.conflictId }); continue }
        toImport.push({ ...e.quiz, title: `${e.quiz.title} (Copy)` })
      } else {
        toImport.push(e.quiz)
      }
    }
    if (!toImport.length && !toReplace.length) { toast.error("No quizzes selected to import"); return }
    const updated = [
      ...quizzes.map(q => { const r = toReplace.find(rq => rq.id === q.id); return r || q }),
      ...toImport,
    ]
    saveQuizzes(updated)
    setUploadEntries([]); setMainTab("quizzes")
    toast.success(`Imported ${toImport.length} quiz${toImport.length !== 1 ? "zes" : ""}${toReplace.length ? `, replaced ${toReplace.length}` : ""}`)
  }

  const htmlReadyCount = uploadEntries.filter(e => e.included && e.status === "ready").length
  const htmlConflictCount = uploadEntries.filter(e => e.included && e.status === "ready" && e.conflictId && e.conflictAction !== "skip").length

  const resetImportDialog = () => {
    setImportHtml(""); setParsedPreview(null); setShowPasteHtml(false)
    setUploadEntries([])
    setJsonEntries([]); setPasteJsonText(""); setShowPasteJson(false); setShowJsonGlobalSettings(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (jsonImportRef.current) jsonImportRef.current.value = ""
  }

  const toggleExpanded = (id: string) => {
    setExpandedQuizzes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const copyQuizLink = (quizId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/quiz/${quizId}`)
    toast.success("Quiz link copied!")
  }

  // ── Filtered quiz list ─────────────────────────────────────────────────────

  const filteredQuizzes = quizzes.filter(q => {
    if (search && !q.title.toLowerCase().includes(search.toLowerCase()) && !q.category.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCategory !== "all" && q.category !== filterCategory) return false
    if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false
    if (filterEnabled === "active" && !q.enabled) return false
    if (filterEnabled === "disabled" && q.enabled) return false
    return true
  })

  const quizStats = (quizId: string) => {
    const entries = leaderboard.filter(e => e.quizId === quizId)
    if (!entries.length) return null
    const avg = Math.round(entries.reduce((sum, e) => sum + e.percentage, 0) / entries.length)
    return { attempts: entries.length, avgScore: avg }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* Sub-tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl w-fit border border-border/40">
        <button
          onClick={() => setMainTab("quizzes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mainTab === "quizzes"
              ? "bg-background text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          All Quizzes
          {quizzes.length > 0 && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              mainTab === "quizzes" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}>{quizzes.length}</span>
          )}
        </button>
        <button
          onClick={() => setMainTab("import")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mainTab === "import"
              ? "bg-background text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </button>
        <button
          onClick={() => setMainTab("leaderboard")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            mainTab === "leaderboard"
              ? "bg-background text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trophy className="h-3.5 w-3.5" />
          Leaderboard
          {leaderboard.length > 0 && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              mainTab === "leaderboard" ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"
            }`}>{leaderboard.length}</span>
          )}
        </button>
      </div>

      {/* ── All Quizzes Tab ────────────────────────────────────────────────── */}
      {mainTab === "quizzes" && (
      <div className="space-y-4">

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleAddQuiz} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Create Quiz
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMainTab("import")} className="h-8 sm:h-9 text-xs sm:text-sm gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Import
        </Button>
        {quizzes.length > 0 && (
          <Button variant="outline" size="sm" onClick={toggleSelectAll} className="ml-auto h-8 text-xs gap-1.5">
            {selectedQuizzes.size === filteredQuizzes.length && filteredQuizzes.length > 0
              ? <><CheckSquare className="h-3.5 w-3.5" /> Deselect All</>
              : <><Square className="h-3.5 w-3.5" /> Select All</>
            }
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      {quizzes.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..." className="pl-8 h-8 text-xs" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Difficulty" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEnabled} onValueChange={setFilterEnabled}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          {(search || filterCategory !== "all" || filterDifficulty !== "all" || filterEnabled !== "all") && (
            <Button variant="ghost" size="sm" className="h-8 text-xs px-2 text-muted-foreground"
              onClick={() => { setSearch(""); setFilterCategory("all"); setFilterDifficulty("all"); setFilterEnabled("all") }}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedQuizzes.size > 0 && (
        <div className="flex items-center gap-2 p-2 sm:p-3 bg-primary/5 border border-primary/20 rounded-lg flex-wrap">
          <Badge variant="secondary" className="text-xs">{selectedQuizzes.size} selected</Badge>
          <div className="flex items-center gap-1 sm:gap-2 ml-auto flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handleBulkToggle(true)} className="h-7 text-xs px-2"><Eye className="h-3 w-3 mr-1" />Enable</Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkToggle(false)} className="h-7 text-xs px-2"><EyeOff className="h-3 w-3 mr-1" />Disable</Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkMoveDialog(true)} className="h-7 text-xs px-2"><MoveRight className="h-3 w-3 mr-1" />Move</Button>
            <Button variant="outline" size="sm" onClick={handleBulkDuplicate} className="h-7 text-xs px-2"><Copy className="h-3 w-3 mr-1" />Duplicate</Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-7 text-xs px-2"><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedQuizzes(new Set())} className="h-7 w-7 p-0"><X className="h-3 w-3" /></Button>
          </div>
        </div>
      )}

      {/* Quiz list */}
      <div className="space-y-3 sm:space-y-4">
        {filteredQuizzes.length === 0 ? (
          <Card className="p-6 sm:p-10 text-center">
            {quizzes.length === 0 ? (
              <>
                <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-2">No Quizzes Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first quiz or import from HTML/JSON</p>
                <div className="flex justify-center gap-3">
                  <Button onClick={handleAddQuiz} size="sm">Create Quiz</Button>
                  <Button variant="outline" onClick={() => setMainTab("import")} size="sm">Import</Button>
                </div>
              </>
            ) : (
              <>
                <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-2">No quizzes match your filters</h3>
                <p className="text-sm text-muted-foreground">Try changing search or filter options</p>
              </>
            )}
          </Card>
        ) : (
          filteredQuizzes.map(quiz => {
            const stats = quizStats(quiz.id)
            const diffColor = quiz.difficulty === "easy" ? "bg-green-500" : quiz.difficulty === "hard" ? "bg-red-500" : "bg-amber-500"
            return (
              <Collapsible key={quiz.id} open={expandedQuizzes.has(quiz.id)} onOpenChange={() => toggleExpanded(quiz.id)}>
                <Card className={`transition-all ${!quiz.enabled ? "opacity-60" : ""} ${selectedQuizzes.has(quiz.id) ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}>
                  <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Checkbox checked={selectedQuizzes.has(quiz.id)} onCheckedChange={() => toggleQuizSelection(quiz.id)} className="mt-1.5 shrink-0" />
                        <CollapsibleTrigger className="flex items-start gap-2 text-left flex-1 min-w-0">
                          {expandedQuizzes.has(quiz.id)
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />}
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm sm:text-base line-clamp-2">{quiz.title}</CardTitle>
                            <CardDescription className="text-xs line-clamp-1">{quiz.description}</CardDescription>
                          </div>
                        </CollapsibleTrigger>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap ml-6 sm:ml-0 shrink-0">
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5">{quiz.category}</Badge>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />{Math.floor(quiz.timeLimit/60)}m
                        </Badge>
                        <Badge className="text-[10px] sm:text-xs px-1.5">{quiz.questions.length} Q</Badge>
                        {quiz.difficulty && <span className={`h-2 w-2 rounded-full shrink-0 ${diffColor}`} />}
                        {stats && (
                          <Badge variant="outline" className="text-[10px] px-1.5 gap-1 text-blue-600 border-blue-200">
                            <Users className="h-2.5 w-2.5" />{stats.attempts} | {stats.avgScore}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap ml-6 sm:ml-0">
                      <Switch checked={quiz.enabled} onCheckedChange={() => handleToggleQuiz(quiz.id)} className="scale-90" />
                      <span className="text-xs text-muted-foreground">{quiz.enabled ? "Active" : "Disabled"}</span>
                      {quiz.negativeMarking ? <Badge variant="outline" className="text-[10px] px-1.5 text-red-600 border-red-200">-{quiz.negativeMarking}/wrong</Badge> : null}
                      {quiz.passingPercentage ? <Badge variant="outline" className="text-[10px] px-1.5 text-green-600 border-green-200">Pass: {quiz.passingPercentage}%</Badge> : null}
                      {quiz.shuffleQuestions && <Badge variant="outline" className="text-[10px] px-1.5"><Shuffle className="h-2.5 w-2.5 mr-0.5" />Q</Badge>}

                      <div className="ml-auto flex items-center gap-0.5">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyQuizLink(quiz.id)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild><a href={`/quiz/${quiz.id}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" /></a></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEditQuiz(quiz)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => exportQuizJson(quiz)}><Download className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDuplicateQuiz(quiz)}><Copy className="h-3.5 w-3.5 text-primary" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteQuiz(quiz.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="border-t pt-3 sm:pt-4 px-3 sm:px-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm">{quiz.questions.length} Questions</h4>
                        <Button size="sm" onClick={() => handleAddQuestion(quiz.id)} className="h-7 text-xs px-2">
                          <Plus className="h-3 w-3 mr-1" /> Add Question
                        </Button>
                      </div>

                      {quiz.questions.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No questions yet. Add your first question.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                          {quiz.questions.map((q, idx) => (
                            <div key={q.id} className="flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg">
                              {/* Reorder */}
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => handleMoveQuestion(quiz.id, idx, -1)} disabled={idx === 0}>
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => handleMoveQuestion(quiz.id, idx, 1)} disabled={idx === quiz.questions.length - 1}>
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="font-bold text-primary w-6 shrink-0 text-xs">Q{idx+1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs sm:text-sm line-clamp-1">{q.question.replace(/<[^>]*>/g,"")}</div>
                                <div className="flex gap-1 mt-0.5">
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                    {q.type === "truefalse" ? "T/F" : q.type === "multiselect" ? "Multi" : "MCQ"}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0">{q.marks}m</Badge>
                                  {q.timeLimit > 0 && <Badge variant="outline" className="text-[9px] px-1 py-0">{q.timeLimit}s</Badge>}
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEditQuestion(quiz.id, q)}><Edit className="h-3 w-3" /></Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDeleteQuestion(quiz.id, q.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )
          })
        )}
      </div>

      {filteredQuizzes.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {filteredQuizzes.length} of {quizzes.length} quizzes
        </p>
      )}

      </div>
      )} {/* end mainTab === "quizzes" */}

      {/* ── Quiz Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-sm sm:text-base">
              {editingQuiz && quizzes.some(q => q.id === editingQuiz.id) ? "Edit Quiz" : "Create Quiz"}
            </DialogTitle>
          </DialogHeader>

          {editingQuiz && (
            <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
              <TabsList className="shrink-0 grid w-full grid-cols-2">
                <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
                <TabsTrigger value="advanced" className="text-xs sm:text-sm">Advanced</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                <TabsContent value="basic" className="mt-3 space-y-3 sm:space-y-4">
                  <div>
                    <Label className="text-xs sm:text-sm">Title</Label>
                    <Input value={editingQuiz.title} onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })} placeholder="Quiz title" className="text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Description</Label>
                    <Textarea value={editingQuiz.description} onChange={e => setEditingQuiz({ ...editingQuiz, description: e.target.value })} placeholder="Quiz description" rows={2} className="text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs sm:text-sm">Category</Label>
                      <Select value={editingQuiz.category} onValueChange={v => setEditingQuiz({ ...editingQuiz, category: v })}>
                        <SelectTrigger className="h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm flex items-center gap-1"><Clock className="h-3 w-3" /> Time (min)</Label>
                      <Input type="number" value={editingQuiz.timeLimit/60} onChange={e => setEditingQuiz({ ...editingQuiz, timeLimit: (parseInt(e.target.value)||10)*60 })} min={1} max={180} className="text-sm h-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs sm:text-sm">Section</Label>
                      <Select value={editingQuiz.section||"General"} onValueChange={v => setEditingQuiz({ ...editingQuiz, section: v })}>
                        <SelectTrigger className="h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Difficulty</Label>
                      <Select value={editingQuiz.difficulty||"medium"} onValueChange={v => setEditingQuiz({ ...editingQuiz, difficulty: v as any })}>
                        <SelectTrigger className="h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${d.color}`} />{d.label}</span></SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Visibility</Label>
                    <Select value={editingQuiz.visibility||"public"} onValueChange={v => setEditingQuiz({ ...editingQuiz, visibility: v as VisibilityType })}>
                      <SelectTrigger className="h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public"><span className="flex items-center gap-2"><Globe className="h-3 w-3" /> Public</span></SelectItem>
                        <SelectItem value="unlisted"><span className="flex items-center gap-2"><Link2 className="h-3 w-3" /> Unlisted</span></SelectItem>
                        <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="h-3 w-3" /> Private</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Content Location (optional)</Label>
                    <StructureSelector value={editingQuiz.structureLocation} onChange={location => setEditingQuiz({ ...editingQuiz, structureLocation: location })} placeholder="Select where to add this quiz" className="w-full" />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Tags</Label>
                    <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 rounded-lg border border-border bg-background">
                      {(editingQuiz.tags||[]).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-xs"
                          onClick={() => setEditingQuiz({ ...editingQuiz, tags: (editingQuiz.tags||[]).filter((_,idx)=>idx!==i) })}>
                          #{tag}<X className="h-2.5 w-2.5" />
                        </Badge>
                      ))}
                      <Input placeholder="Add tag..." className="flex-1 min-w-[80px] border-0 shadow-none h-6 px-1 focus-visible:ring-0 text-xs"
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault()
                            const val = (e.target as HTMLInputElement).value.trim().toLowerCase()
                            if (val && !(editingQuiz.tags||[]).includes(val)) setEditingQuiz({ ...editingQuiz, tags: [...(editingQuiz.tags||[]), val] })
                            ;(e.target as HTMLInputElement).value = ""
                          }
                        }} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="mt-3 space-y-4">
                  {/* Negative Marking */}
                  <div className="rounded-xl border border-border/60 p-4 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Minus className="h-4 w-4 text-red-500" /> Negative Marking</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">Enable negative marking</p>
                        <p className="text-xs text-muted-foreground">Deduct marks for wrong answers</p>
                      </div>
                      <Switch checked={(editingQuiz.negativeMarking||0) > 0} onCheckedChange={v => setEditingQuiz({ ...editingQuiz, negativeMarking: v ? 0.25 : 0 })} />
                    </div>
                    {(editingQuiz.negativeMarking||0) > 0 && (
                      <div className="flex items-center gap-3">
                        <Label className="text-xs whitespace-nowrap">Marks deducted per wrong answer</Label>
                        <Input type="number" step={0.25} min={0.25} max={5} value={editingQuiz.negativeMarking||0.25}
                          onChange={e => setEditingQuiz({ ...editingQuiz, negativeMarking: parseFloat(e.target.value)||0.25 })}
                          className="w-20 h-8 text-sm" />
                      </div>
                    )}
                  </div>

                  {/* Passing Marks */}
                  <div className="rounded-xl border border-border/60 p-4 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" /> Passing Threshold</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">Set passing percentage</p>
                        <p className="text-xs text-muted-foreground">Minimum score to pass this quiz</p>
                      </div>
                      <Switch checked={(editingQuiz.passingPercentage||0) > 0} onCheckedChange={v => setEditingQuiz({ ...editingQuiz, passingPercentage: v ? 40 : 0 })} />
                    </div>
                    {(editingQuiz.passingPercentage||0) > 0 && (
                      <div className="flex items-center gap-3">
                        <Label className="text-xs whitespace-nowrap">Passing %</Label>
                        <Input type="number" min={1} max={100} value={editingQuiz.passingPercentage||40}
                          onChange={e => setEditingQuiz({ ...editingQuiz, passingPercentage: parseInt(e.target.value)||40 })}
                          className="w-20 h-8 text-sm" />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                  </div>

                  {/* Shuffle */}
                  <div className="rounded-xl border border-border/60 p-4 space-y-3">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><Shuffle className="h-4 w-4 text-blue-500" /> Shuffle Settings</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">Shuffle questions</p>
                        <p className="text-xs text-muted-foreground">Randomize question order for each attempt</p>
                      </div>
                      <Switch checked={!!editingQuiz.shuffleQuestions} onCheckedChange={v => setEditingQuiz({ ...editingQuiz, shuffleQuestions: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">Shuffle options</p>
                        <p className="text-xs text-muted-foreground">Randomize answer options within each question</p>
                      </div>
                      <Switch checked={!!editingQuiz.shuffleOptions} onCheckedChange={v => setEditingQuiz({ ...editingQuiz, shuffleOptions: v })} />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}

          <DialogFooter className="shrink-0 border-t pt-3 gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setShowQuizDialog(false)} size="sm" className="w-full sm:w-auto text-xs sm:text-sm">Cancel</Button>
            <Button onClick={handleSaveQuiz} size="sm" className="w-full sm:w-auto text-xs sm:text-sm"><Save className="h-3.5 w-3.5 mr-1.5" /> Save Quiz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Question Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editingQuestion && quizzes.find(q=>q.id===editingQuestion.quizId)?.questions.some(q=>q.id===editingQuestion.question.id) ? "Edit Question" : "Add Question"}
            </DialogTitle>
          </DialogHeader>

          {editingQuestion && (
            <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">

              {/* Question Type */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Question Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {QUESTION_TYPES.map(t => (
                    <button key={t.value}
                      onClick={() => {
                        const q = editingQuestion.question
                        let newOptions = q.options
                        let newCorrect = q.correct
                        if (t.value === "truefalse") { newOptions = ["True","False"]; newCorrect = 1 }
                        else if (t.value === "mcq" && q.options.length < 4) { newOptions = ["","","",""] }
                        setEditingQuestion({ ...editingQuestion, question: { ...q, type: t.value, options: newOptions, correct: newCorrect, correctOptions: [] } })
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${editingQuestion.question.type === t.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                      <p className="font-semibold text-xs">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <Label>Question</Label>
                <Textarea value={editingQuestion.question.question}
                  onChange={e => setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, question: e.target.value } })}
                  placeholder="Enter question..." rows={3} />
              </div>

              {/* Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{editingQuestion.question.type === "truefalse" ? "Options (locked)" : "Options"}</Label>
                  {editingQuestion.question.type === "mcq" && editingQuestion.question.options.length < 6 && (
                    <Button variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, options: [...editingQuestion.question.options, ""] } })}>
                      <Plus className="h-3 w-3 mr-1" /> Add Option
                    </Button>
                  )}
                </div>

                {editingQuestion.question.type === "multiselect" && (
                  <p className="text-xs text-muted-foreground">Check all correct answers</p>
                )}
                {editingQuestion.question.type === "mcq" && (
                  <p className="text-xs text-muted-foreground">Select the correct answer (radio button)</p>
                )}

                {editingQuestion.question.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 font-bold text-primary text-sm shrink-0">{String.fromCharCode(65+idx)}.</span>
                    <Input
                      value={opt}
                      readOnly={editingQuestion.question.type === "truefalse"}
                      onChange={e => {
                        const opts = [...editingQuestion.question.options]
                        opts[idx] = e.target.value
                        setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, options: opts } })
                      }}
                      placeholder={`Option ${String.fromCharCode(65+idx)}`}
                      className={`flex-1 ${editingQuestion.question.type === "truefalse" ? "bg-muted" : ""}`}
                    />
                    {/* Correct selector */}
                    {editingQuestion.question.type === "multiselect" ? (
                      <Checkbox
                        checked={editingQuestion.question.correctOptions.includes(idx+1)}
                        onCheckedChange={checked => {
                          const co = checked
                            ? [...editingQuestion.question.correctOptions, idx+1]
                            : editingQuestion.question.correctOptions.filter(x => x !== idx+1)
                          setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, correctOptions: co } })
                        }}
                      />
                    ) : (
                      <input type="radio" name="correct" checked={editingQuestion.question.correct === idx+1}
                        onChange={() => setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, correct: idx+1 } })}
                        className="h-4 w-4" />
                    )}
                    {/* Remove option (MCQ only, min 2) */}
                    {editingQuestion.question.type === "mcq" && editingQuestion.question.options.length > 2 && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0"
                        onClick={() => {
                          const opts = editingQuestion.question.options.filter((_,i)=>i!==idx)
                          const newCorrect = editingQuestion.question.correct > opts.length ? opts.length : editingQuestion.question.correct
                          setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, options: opts, correct: newCorrect } })
                        }}>
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Marks & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Marks</Label>
                  <Input type="number" value={editingQuestion.question.marks}
                    onChange={e => setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, marks: parseInt(e.target.value)||1 } })}
                    min={1} max={10} className="h-9" />
                </div>
                <div>
                  <Label className="text-sm">Time limit (sec, 0=quiz default)</Label>
                  <Input type="number" value={editingQuestion.question.timeLimit}
                    onChange={e => setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, timeLimit: parseInt(e.target.value)||0 } })}
                    min={0} max={600} step={5} className="h-9" />
                </div>
              </div>

              {/* Explanation */}
              <div>
                <Label>Explanation (optional)</Label>
                <Textarea value={editingQuestion.question.explanation}
                  onChange={e => setEditingQuestion({ ...editingQuestion, question: { ...editingQuestion.question, explanation: e.target.value } })}
                  placeholder="Explain the correct answer..." rows={2} />
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0 border-t pt-4 gap-2">
            <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveQuestion}><Save className="h-4 w-4 mr-2" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Import Panel ─────────────────────────────────────────────────────── */}
      {mainTab === "import" && (
      <Card className="border-border/50">
        <CardHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Upload className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Import Quizzes</CardTitle>
                <CardDescription className="text-xs mt-0.5">HTML &amp; JSON supported · Per-file settings · Conflict resolution</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground hidden sm:flex"
              onClick={() => { setMainTab("quizzes"); resetImportDialog() }}>
              <FileText className="h-3.5 w-3.5" /> View All Quizzes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-4">
            <Tabs value={importTab} onValueChange={v => setImportTab(v as "html"|"json")}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="html" className="text-xs sm:text-sm">From HTML File</TabsTrigger>
                <TabsTrigger value="json" className="text-xs sm:text-sm">From JSON File</TabsTrigger>
              </TabsList>

              {/* HTML Tab */}
              <TabsContent value="html" className="space-y-4 mt-4">
                {/* Drop zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-all cursor-pointer group ${dragActive ? "border-primary bg-primary/10 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
                  onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept=".html,.htm" multiple onChange={handleMultiFileChange} className="hidden" />
                  <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-xs sm:text-sm">Drop HTML files here or click to select</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Multiple files — batch import with per-file control</p>
                </div>

                {/* Global Settings */}
                {uploadEntries.length > 0 && (
                  <Collapsible open={showGlobalSettings} onOpenChange={setShowGlobalSettings}>
                    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-primary" />
                            <span className="font-medium text-xs sm:text-sm">Global Settings (apply to all)</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${showGlobalSettings ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 border-t border-border/50 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Category</Label>
                              <Select value={globalSettings.category} onValueChange={v => setGlobalSettings(p => ({ ...p, category: v }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Difficulty</Label>
                              <Select value={globalSettings.difficulty} onValueChange={v => setGlobalSettings(p => ({ ...p, difficulty: v as any }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Section</Label>
                              <Select value={globalSettings.section} onValueChange={v => setGlobalSettings(p => ({ ...p, section: v }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Visibility</Label>
                              <Select value={globalSettings.visibility} onValueChange={v => setGlobalSettings(p => ({ ...p, visibility: v as any }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="unlisted">Unlisted</SelectItem>
                                  <SelectItem value="private">Private</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button size="sm" onClick={applyGlobalSettings} className="w-full h-8 text-xs">Apply to All Files</Button>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {/* File list */}
                {uploadEntries.length > 0 && (
                  <div className="space-y-2">
                    {/* List header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium">{uploadEntries.length} file{uploadEntries.length !== 1 ? "s" : ""}</p>
                        <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 h-5">{uploadEntries.filter(e=>e.status==="ready").length} ready</Badge>
                        {uploadEntries.some(e=>e.status==="error") && <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-600 h-5">{uploadEntries.filter(e=>e.status==="error").length} failed</Badge>}
                        {uploadEntries.some(e=>e.status==="parsing") && <Badge variant="secondary" className="text-[10px] h-5">parsing…</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                          onClick={() => setUploadEntries(prev => prev.map(e => ({ ...e, included: true })))}>All</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"
                          onClick={() => setUploadEntries(prev => prev.map(e => ({ ...e, included: false })))}>None</Button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
                      {uploadEntries.map(entry => {
                        const qCount = entry.quiz?.questions.length || 0
                        const mcqCount = entry.quiz?.questions.filter(q => q.type === "mcq").length || 0
                        const tfCount = entry.quiz?.questions.filter(q => q.type === "truefalse").length || 0
                        const msCount = entry.quiz?.questions.filter(q => q.type === "multiselect").length || 0
                        return (
                          <div key={entry.id} className={`rounded-lg border overflow-hidden transition-all ${
                            !entry.included ? "opacity-60 border-border bg-muted/20"
                            : entry.status === "ready" ? "border-green-200/70 bg-green-50/40 dark:bg-green-950/20 dark:border-green-800/60"
                            : entry.status === "error" ? "border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800"
                            : entry.status === "parsing" ? "border-primary/40 bg-primary/5"
                            : "border-border bg-muted/30"
                          }`}>
                            {/* Entry header row */}
                            <div className="flex items-center gap-2 p-2.5">
                              <Checkbox checked={entry.included} onCheckedChange={() => toggleHtmlEntry(entry.id)} className="shrink-0" />
                              {entry.status === "parsing" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                              {entry.status === "ready" && <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />}
                              {entry.status === "error" && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                              {entry.status === "pending" && <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}

                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleHtmlExpanded(entry.id)}>
                                <p className="font-medium text-xs truncate">{entry.fileName}</p>
                                {entry.quiz && (
                                  <>
                                    <p className="text-[10px] text-foreground/80 font-medium truncate mt-0.5">{entry.quiz.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      {/* Auto-detected tags */}
                                      <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0 rounded-full bg-primary/10 text-primary font-medium">
                                        <Zap className="h-2 w-2" />{entry.quiz.category}
                                      </span>
                                      {entry.quiz.difficulty && (
                                        <span className={`text-[9px] px-1.5 py-0 rounded-full font-medium ${entry.quiz.difficulty === "easy" ? "bg-green-100 text-green-700" : entry.quiz.difficulty === "hard" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                          {entry.quiz.difficulty}
                                        </span>
                                      )}
                                      {entry.quiz.section && entry.quiz.section !== "General" && (
                                        <span className="text-[9px] px-1.5 py-0 rounded-full bg-blue-100 text-blue-700 font-medium">{entry.quiz.section}</span>
                                      )}
                                      <span className="text-[10px] text-muted-foreground">{qCount} Q</span>
                                      {mcqCount > 0 && mcqCount < qCount && <span className="text-[10px] text-muted-foreground">{mcqCount} MCQ</span>}
                                      {tfCount > 0 && <span className="text-[10px] text-muted-foreground">{tfCount} T/F</span>}
                                      {msCount > 0 && <span className="text-[10px] text-muted-foreground">{msCount} Multi</span>}
                                      {entry.quiz.timeLimit > 0 && <span className="text-[10px] text-muted-foreground">{Math.floor(entry.quiz.timeLimit/60)}min</span>}
                                      {entry.conflictId && (
                                        <Badge variant="outline" className="text-[9px] px-1 h-4 border-amber-400 text-amber-600 gap-0.5">
                                          <AlertCircle className="h-2.5 w-2.5" /> Conflict
                                        </Badge>
                                      )}
                                    </div>
                                  </>
                                )}
                                {entry.error && <p className="text-[10px] text-red-500 mt-0.5">{entry.error}</p>}
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                {entry.status === "ready" && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                                    onClick={() => toggleHtmlExpanded(entry.id)}>
                                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${entry.expanded ? "rotate-180" : ""}`} />
                                  </Button>
                                )}
                                {entry.status === "error" && entry.file && (
                                  <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] gap-1 text-primary"
                                    onClick={() => retryUploadEntry(entry.id)}>
                                    <RefreshCw className="h-3 w-3" /> Retry
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-500"
                                  onClick={() => removeUploadEntry(entry.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Expanded detail */}
                            {entry.expanded && entry.status === "ready" && entry.quiz && (
                              <div className="border-t border-border/40">
                                {/* Editable title */}
                                <div className="px-2.5 pt-2 pb-1">
                                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Quiz Title</Label>
                                  <Input
                                    value={entry.quiz.title}
                                    onChange={e => renameHtmlQuiz(entry.id, e.target.value)}
                                    className="h-7 text-xs mt-0.5"
                                    placeholder="Quiz title"
                                  />
                                </div>

                                {/* Per-entry settings */}
                                <div className="px-2.5 pb-2 grid grid-cols-4 gap-1.5">
                                  <Select value={entry.settings.category} onValueChange={v => updateEntrySettings(entry.id,"category",v)}>
                                    <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={entry.settings.difficulty} onValueChange={v => updateEntrySettings(entry.id,"difficulty",v)}>
                                    <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={entry.settings.section} onValueChange={v => updateEntrySettings(entry.id,"section",v)}>
                                    <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                                  </Select>
                                  <Select value={entry.settings.visibility} onValueChange={v => updateEntrySettings(entry.id,"visibility",v)}>
                                    <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="public" className="text-xs">Public</SelectItem>
                                      <SelectItem value="unlisted" className="text-xs">Unlisted</SelectItem>
                                      <SelectItem value="private" className="text-xs">Private</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Conflict resolution */}
                                {entry.conflictId && entry.included && (
                                  <div className="mx-2.5 mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60">
                                    <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mb-1.5">A quiz with this title already exists:</p>
                                    <div className="flex gap-1">
                                      {(["skip", "replace", "copy"] as const).map(action => (
                                        <button key={action} onClick={() => setHtmlConflictAction(entry.id, action)}
                                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all font-medium ${entry.conflictAction === action ? action === "skip" ? "bg-muted border-muted-foreground/40 text-foreground" : action === "replace" ? "bg-red-500 border-red-500 text-white" : "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:bg-muted"}`}>
                                          {action === "skip" ? "Skip" : action === "replace" ? "Replace" : "Import as Copy"}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Collapsed conflict badge */}
                            {!entry.expanded && entry.conflictId && entry.included && entry.status === "ready" && (
                              <div className="px-2.5 pb-2">
                                <div className="flex items-center gap-1 p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60">
                                  <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                                  <p className="text-[10px] text-amber-700 dark:text-amber-400 flex-1">Conflict detected — expand to resolve</p>
                                  <button onClick={() => toggleHtmlExpanded(entry.id)} className="text-[10px] text-amber-600 underline">Expand</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Paste HTML */}
                <Collapsible open={showPasteHtml} onOpenChange={setShowPasteHtml}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 mr-1.5" /> Or paste HTML code directly <ChevronDown className="h-3 w-3 ml-auto" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-2">
                    <Textarea value={importHtml} onChange={e => {
                      setImportHtml(e.target.value)
                      if (e.target.value.length > 100) {
                        const quiz = parseQuizHtml(e.target.value)
                        setParsedPreview(quiz ? { title: quiz.title, count: quiz.questions.length } : null)
                      } else { setParsedPreview(null) }
                    }} placeholder="Paste quiz HTML code here..." rows={4} className="font-mono text-xs" />
                    {parsedPreview && (
                      <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium flex-1">{parsedPreview.title} — {parsedPreview.count} questions detected</p>
                      </div>
                    )}
                    {!parsedPreview && importHtml.length > 100 && (
                      <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        <p className="text-xs text-red-600">Could not detect a quiz in this HTML</p>
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={addPastedHtmlEntry} disabled={!parsedPreview}>
                      <CheckCircle className="h-3.5 w-3.5" /> Parse &amp; Add to List
                    </Button>
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>

              {/* JSON Tab */}
              <TabsContent value="json" className="space-y-4 mt-4">
                {/* Drop zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-all cursor-pointer group ${jsonDragActive ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-400/60 hover:bg-muted/30"}`}
                  onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setJsonDragActive(true) }}
                  onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setJsonDragActive(false) }}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setJsonDragActive(true) }}
                  onDrop={e => {
                    e.preventDefault(); e.stopPropagation(); setJsonDragActive(false)
                    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".json"))
                    files.length ? processJsonFiles(files) : toast.error("Please drop JSON files only")
                  }}
                  onClick={() => jsonImportRef.current?.click()}
                >
                  <input ref={jsonImportRef} type="file" accept=".json" multiple className="hidden"
                    onChange={e => {
                      const files = Array.from(e.target.files || []).filter(f => f.name.endsWith(".json"))
                      if (files.length) processJsonFiles(files)
                      if (e.target) e.target.value = ""
                    }} />
                  <div className="mx-auto w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                    <FileUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="font-semibold text-xs sm:text-sm">Drop JSON files here or click to select</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Multiple files — single quiz or array of quizzes per file</p>
                </div>

                {/* JSON Global Settings */}
                {jsonEntries.length > 0 && (
                  <Collapsible open={showJsonGlobalSettings} onOpenChange={setShowJsonGlobalSettings}>
                    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-blue-500" />
                            <span className="font-medium text-xs sm:text-sm">Global Settings (apply to all)</span>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${showJsonGlobalSettings ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 border-t border-border/50 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Category</Label>
                              <Select value={jsonGs.category} onValueChange={v => setJsonGs(p => ({ ...p, category: v }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Difficulty</Label>
                              <Select value={jsonGs.difficulty} onValueChange={v => setJsonGs(p => ({ ...p, difficulty: v as any }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Section</Label>
                              <Select value={jsonGs.section} onValueChange={v => setJsonGs(p => ({ ...p, section: v }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Visibility</Label>
                              <Select value={jsonGs.visibility} onValueChange={v => setJsonGs(p => ({ ...p, visibility: v as any }))}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="unlisted">Unlisted</SelectItem>
                                  <SelectItem value="private">Private</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => applyJsonGlobalSettings(jsonGs)} className="w-full h-8 text-xs bg-blue-500 hover:bg-blue-600">Apply to All Files</Button>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )}

                {/* File entries */}
                {jsonEntries.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">{jsonEntries.length} file{jsonEntries.length !== 1 ? "s" : ""} loaded</p>
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">{jsonReadyCount} selected</Badge>
                        {jsonConflictCount > 0 && <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">{jsonConflictCount} conflicts</Badge>}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                      {jsonEntries.map(entry => {
                        const includedCount = entry.quizzes.filter(q => q.included).length
                        const conflictCount = entry.quizzes.filter(q => q.included && q.conflictId).length
                        return (
                          <div key={entry.id} className={`rounded-lg border overflow-hidden transition-all ${entry.status === "ready" ? "border-blue-200/70 bg-blue-50/40 dark:bg-blue-950/20 dark:border-blue-800/60" : entry.status === "error" ? "border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800" : "border-border bg-muted/30"}`}>
                            {/* File header */}
                            <div className="flex items-center gap-2 p-2.5 cursor-pointer select-none"
                              onClick={() => setJsonEntries(prev => prev.map(e => e.id === entry.id ? { ...e, expanded: !e.expanded } : e))}>
                              {entry.status === "parsing" && <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />}
                              {entry.status === "ready" && <FileUp className="h-4 w-4 text-blue-500 shrink-0" />}
                              {entry.status === "error" && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs truncate">{entry.fileName}</p>
                                {entry.status === "ready" && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {entry.quizzes.length} quiz{entry.quizzes.length !== 1 ? "zes" : ""}
                                    {conflictCount > 0 && <span className="text-amber-600 ml-1">· {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}</span>}
                                  </p>
                                )}
                                {entry.error && <p className="text-[10px] text-red-500">{entry.error}</p>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {entry.status === "ready" && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-blue-600 border-blue-300">
                                    {includedCount}/{entry.quizzes.length}
                                  </Badge>
                                )}
                                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${entry.expanded ? "rotate-180" : ""}`} />
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-500"
                                  onClick={e => { e.stopPropagation(); setJsonEntries(prev => prev.filter(en => en.id !== entry.id)) }}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Expanded quiz list */}
                            {entry.expanded && entry.status === "ready" && (
                              <div className="border-t border-border/50">
                                {/* Per-file settings */}
                                <div className="p-2 border-b border-border/40 bg-muted/20">
                                  <div className="grid grid-cols-4 gap-1.5">
                                    <Select value={entry.settings.category} onValueChange={v => applyJsonFileSettings(entry.id, { ...entry.settings, category: v })}>
                                      <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={entry.settings.difficulty} onValueChange={v => applyJsonFileSettings(entry.id, { ...entry.settings, difficulty: v as any })}>
                                      <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={entry.settings.section} onValueChange={v => applyJsonFileSettings(entry.id, { ...entry.settings, section: v })}>
                                      <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={entry.settings.visibility} onValueChange={v => applyJsonFileSettings(entry.id, { ...entry.settings, visibility: v as any })}>
                                      <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="public" className="text-xs">Public</SelectItem>
                                        <SelectItem value="unlisted" className="text-xs">Unlisted</SelectItem>
                                        <SelectItem value="private" className="text-xs">Private</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="divide-y divide-border/30">
                                  {entry.quizzes.map((item, idx) => {
                                    const qCount = item.quiz.questions.length
                                    const mcqCount = item.quiz.questions.filter(q => q.type === "mcq").length
                                    const tfCount = item.quiz.questions.filter(q => q.type === "truefalse").length
                                    const msCount = item.quiz.questions.filter(q => q.type === "multiselect").length
                                    return (
                                      <div key={idx} className={`p-2.5 transition-colors ${!item.included ? "opacity-50" : ""}`}>
                                        <div className="flex items-start gap-2.5">
                                          <Checkbox
                                            checked={item.included}
                                            onCheckedChange={() => toggleJsonQuiz(entry.id, idx)}
                                            className="mt-0.5 shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <p className="font-medium text-xs truncate">{item.quiz.title}</p>
                                              {item.conflictId && (
                                                <Badge variant="outline" className="text-[9px] px-1 h-4 border-amber-400 text-amber-600 gap-0.5 shrink-0">
                                                  <AlertCircle className="h-2.5 w-2.5" /> Conflict
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                              <span className="text-[10px] text-muted-foreground">{qCount} Q</span>
                                              {mcqCount > 0 && <span className="text-[10px] text-blue-600">{mcqCount} MCQ</span>}
                                              {tfCount > 0 && <span className="text-[10px] text-green-600">{tfCount} T/F</span>}
                                              {msCount > 0 && <span className="text-[10px] text-purple-600">{msCount} Multi</span>}
                                              <span className="text-[10px] text-muted-foreground">{Math.floor(item.quiz.timeLimit / 60)} min</span>
                                              {item.quiz.negativeMarking && item.quiz.negativeMarking > 0 ? <span className="text-[10px] text-red-500">-{item.quiz.negativeMarking}✗</span> : null}
                                            </div>
                                            {/* Conflict resolution */}
                                            {item.conflictId && item.included && (
                                              <div className="mt-1.5 p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60">
                                                <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-1 font-medium">A quiz with this title already exists:</p>
                                                <div className="flex gap-1">
                                                  {(["skip", "replace", "copy"] as ConflictAction[]).map(action => (
                                                    <button key={action} onClick={() => setJsonConflictAction(entry.id, idx, action)}
                                                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-all font-medium ${item.conflictAction === action ? action === "skip" ? "bg-muted border-muted-foreground/40 text-foreground" : action === "replace" ? "bg-red-500 border-red-500 text-white" : "bg-blue-500 border-blue-500 text-white" : "border-border text-muted-foreground hover:bg-muted"}`}>
                                                      {action === "skip" ? "Skip" : action === "replace" ? "Replace" : "Import as Copy"}
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Paste JSON */}
                <Collapsible open={showPasteJson} onOpenChange={setShowPasteJson}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                      <FileText className="h-3 w-3 mr-1.5" /> Or paste JSON directly <ChevronDown className="h-3 w-3 ml-auto" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2 space-y-2">
                    <Textarea
                      value={pasteJsonText}
                      onChange={e => setPasteJsonText(e.target.value)}
                      placeholder={`Paste quiz JSON here...\n{\n  "title": "My Quiz",\n  "questions": [...]\n}`}
                      rows={5}
                      className="font-mono text-xs"
                    />
                    <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={addPastedJsonEntry} disabled={!pasteJsonText.trim()}>
                      <CheckCircle className="h-3.5 w-3.5" /> Parse & Add to List
                    </Button>
                  </CollapsibleContent>
                </Collapsible>

                {/* Format hint */}
                {jsonEntries.length === 0 && (
                  <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800/60 p-3 space-y-1">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Supported JSON Format</p>
                    <p className="text-xs text-muted-foreground">Single quiz object or an array of quizzes. Each must have <code className="bg-muted px-1 rounded">title</code> and <code className="bg-muted px-1 rounded">questions</code>. Use the ↓ export on any quiz card to get a ready-to-import file.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

            <div className="flex items-center gap-2 pt-4 border-t border-border/40 flex-wrap">
              <Button variant="outline" onClick={() => { setMainTab("quizzes"); resetImportDialog() }} size="sm" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Back to Quizzes
              </Button>
              <div className="ml-auto flex items-center gap-2">
                {importTab === "html" && htmlReadyCount > 0 ? (
                  <Button onClick={importAllReady} size="sm" className="text-xs">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Import {htmlReadyCount} Quiz{htmlReadyCount !== 1 ? "zes" : ""}
                    {htmlConflictCount > 0 && <span className="ml-1.5 text-[10px] opacity-80">({htmlConflictCount} conflict{htmlConflictCount !== 1 ? "s" : ""})</span>}
                  </Button>
                ) : importTab === "json" && jsonReadyCount > 0 ? (
                  <Button onClick={importAllJsonQuizzes} size="sm" className="text-xs bg-blue-500 hover:bg-blue-600">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Import {jsonReadyCount} Quiz{jsonReadyCount !== 1 ? "zes" : ""}
                    {jsonConflictCount > 0 && <span className="ml-1.5 text-[10px] opacity-80">({jsonConflictCount} conflict{jsonConflictCount !== 1 ? "s" : ""})</span>}
                  </Button>
                ) : (
                  <Button disabled size="sm" className="text-xs"><Upload className="h-3.5 w-3.5 mr-1.5" /> Import</Button>
                )}
              </div>
            </div>
        </CardContent>
      </Card>
      )} {/* end mainTab === "import" */}

      {/* ── Leaderboard Panel ─────────────────────────────────────────────────── */}
      {mainTab === "leaderboard" && (
      <Card className="border-border/50">
        <CardHeader className="pb-2 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Leaderboard</CardTitle>
                <CardDescription className="text-xs mt-0.5">{leaderboard.length} total entries · Top scores across all quizzes</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {leaderboard.length > 0 && (
                <Button variant="destructive" size="sm" className="gap-1.5 text-xs hidden sm:flex"
                  onClick={() => {
                    if (!confirm("Clear all leaderboard entries?")) return
                    fetch("/api/quiz-results", { method: "DELETE", headers: adminHeaders() }).then(r=>r.json()).then(d => { if (d.success) { setLeaderboard([]); toast.success("Leaderboard cleared") } else toast.error("Failed") }).catch(()=>toast.error("Failed"))
                  }}>
                  <Trash2 className="h-3.5 w-3.5" /> Clear All
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground hidden sm:flex"
                onClick={() => setMainTab("quizzes")}>
                <FileText className="h-3.5 w-3.5" /> View All Quizzes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-muted-foreground">No leaderboard entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">Entries appear here after users complete quizzes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => (
                <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-lg border ${idx===0?"bg-yellow-500/10 border-yellow-500/30":idx===1?"bg-gray-400/10 border-gray-400/30":idx===2?"bg-amber-700/10 border-amber-700/30":"bg-card border-border/50"}`}>
                  <div className="shrink-0 w-8 text-center">{idx===0 ? <Crown className="h-5 w-5 text-yellow-500 mx-auto" /> : <span className="font-bold text-muted-foreground text-sm">{idx+1}</span>}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{entry.quizTitle}</p>
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <p className="font-bold text-primary">{entry.percentage}%</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      fetch(`/api/quiz-results/${entry.id}`, { method: "DELETE", headers: adminHeaders() })
                        .then(r => r.json()).then(d => { if (d.success) { setLeaderboard(prev => prev.filter(e=>e.id!==entry.id)); toast.success("Entry deleted") } else toast.error("Failed") })
                        .catch(() => toast.error("Failed"))
                    }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )} {/* end mainTab === "leaderboard" */}

      {/* ── Bulk Move Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showBulkMoveDialog} onOpenChange={setShowBulkMoveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-sm sm:text-base"><MoveRight className="h-4 w-4 text-primary" /> Move {selectedQuizzes.size} Quizzes</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Content Structure Location</Label>
              <StructureSelector value={bulkMoveTarget.structureLocation} onChange={loc => setBulkMoveTarget(p=>({...p, structureLocation: loc}))} placeholder="Select folder/category/section" className="w-full" />
            </div>
            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div><div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">OR legacy categories</span></div></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={bulkMoveTarget.category} onValueChange={v => setBulkMoveTarget(p=>({...p,category:v}))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Section</Label>
                <Select value={bulkMoveTarget.section} onValueChange={v => setBulkMoveTarget(p=>({...p,section:v}))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Keep existing" /></SelectTrigger>
                  <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkMoveDialog(false)} size="sm">Cancel</Button>
            <Button onClick={handleBulkMove} disabled={!bulkMoveTarget.category && !bulkMoveTarget.structureLocation?.sectionId} size="sm"><MoveRight className="h-3.5 w-3.5 mr-1.5" /> Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
