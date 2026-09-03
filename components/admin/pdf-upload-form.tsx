"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { 
  Upload, FileText, X, CheckCircle, Loader2, AlertCircle, 
  Zap, Files, FolderPlus, Tag, Eye, Calendar, Clock, Lock, 
  Globe, Link2, FileCheck, Sparkles, ChevronDown, ChevronUp, Settings2,
  Hash, Download, Shield, RefreshCw, Type, Replace, ArrowRight, Code, Shuffle, Scissors
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "sonner"
import type { Category, ContentFolder } from "@/lib/types"
import { uploadFileToSignedStorage } from "@/lib/signed-storage-upload"
import { InlineStructureEditor } from "./inline-structure-editor"
import { StructureSelector } from "./structure-selector"
import { findStructureLocationByCategoryName } from "@/lib/structure-matching"
import { analyzePdfFile, type PdfAnalysisResult } from "@/lib/pdf-smart-analysis"
import { isUploadReady, normalizeRestoredQueueState, queueConcurrency, selectMeaningfulCategory, sourceBlobKey, thumbnailBlobKey } from "@/lib/pdf-upload-queue"

const MAX_FILE_SIZE = 100 * 1024 * 1024
const MAX_PARALLEL_UPLOADS = 6
const QUEUE_STORAGE_KEY = "techvyro:pdf-upload-queue:v2"
const DB_NAME = "techvyro-pdf-upload-queue"

type VisibilityType = "public" | "unlisted" | "private"

interface FileEntry {
  id: string
  file: File
  title: string
  description: string
  categoryId: string
  structureLocation: {
    folderId: string
    categoryId: string
    sectionId: string
  }
  tags: string[]
  visibility: VisibilityType
  scheduledAt: string | null
  allowDownload: boolean
  customSlug: string
  status: "pending" | "checking" | "uploading" | "done" | "error"
  progress: number
  error?: string
  showAdvanced: boolean
  isDuplicate?: boolean
  replaceExisting?: boolean
  speedKBps?: number   // upload speed in KB/s
  etaSecs?: number     // estimated seconds remaining
  analysis?: Omit<PdfAnalysisResult, "thumbnail"> & { thumbnail?: Blob | string }
  analysisStatus?: "queued" | "analyzing" | "complete" | "error"
  analysisMessage?: string
  notificationPreference?: "none" | "immediate" | "daily"
}

interface PDFUploadFormProps {
  categories: Category[]
  onSuccess: () => void
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function throwIfCancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Processing was cancelled", "AbortError")
}

function titleFromFilename(name: string): string {
  // 1. Strip extension
  let s = name.replace(/\.pdf$/i, "")

  // 2. Normalize common separators (dots, underscores, dashes) → space
  //    but NOT between digits and letters that form version/part numbers
  s = s.replace(/[_\-]+/g, " ")
  s = s.replace(/\.(?!\d)/g, " ")   // dots not followed by digit → space

  // 3. Split camelCase / PascalCase into words
  //    e.g. "ChemistryChapter01" → "Chemistry Chapter 01"
  s = s.replace(/([a-z])([A-Z])/g, "$1 $2")
  s = s.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")

  // 4. Insert space between letters and digits (and vice versa)
  //    e.g. "Chapter01" → "Chapter 01", "Unit5" → "Unit 5"
  s = s.replace(/([a-zA-Z])(\d)/g, "$1 $2")
  s = s.replace(/(\d)([a-zA-Z])/g, "$1 $2")

  // 5. Expand known academic abbreviations (case-insensitive)
  const abbrevMap: [RegExp, string][] = [
    [/\bch\b/gi,       "Chapter"],
    [/\bchap\b/gi,     "Chapter"],
    [/\bchapter\b/gi,  "Chapter"],
    [/\bpt\b/gi,       "Part"],
    [/\bpart\b/gi,     "Part"],
    [/\bvol\b/gi,      "Volume"],
    [/\bvolume\b/gi,   "Volume"],
    [/\blec\b/gi,      "Lecture"],
    [/\blect\b/gi,     "Lecture"],
    [/\blecture\b/gi,  "Lecture"],
    [/\bunit\b/gi,     "Unit"],
    [/\bsem\b/gi,      "Semester"],
    [/\bmod\b/gi,      "Module"],
    [/\bmodule\b/gi,   "Module"],
    [/\btopic\b/gi,    "Topic"],
    [/\bsec\b/gi,      "Section"],
    [/\bsection\b/gi,  "Section"],
    [/\bex\b/gi,       "Exercise"],
    [/\bexercise\b/gi, "Exercise"],
    [/\bqs\b/gi,       "Questions"],
    [/\bq\b/gi,        "Questions"],
    [/\bqna\b/gi,      "Q&A"],
    [/\bans\b/gi,      "Answers"],
    [/\bsoln\b/gi,     "Solutions"],
    [/\bsoln s\b/gi,   "Solutions"],
    [/\bnotes\b/gi,    "Notes"],
    [/\bnote\b/gi,     "Notes"],
    [/\brev\b/gi,      "Revision"],
    [/\brevision\b/gi, "Revision"],
    [/\bprac\b/gi,     "Practice"],
    [/\bpractice\b/gi, "Practice"],
    [/\bset\b/gi,      "Set"],
    [/\btest\b/gi,     "Test"],
    [/\bexam\b/gi,     "Exam"],
    [/\bpaper\b/gi,    "Paper"],
    [/\bpyq\b/gi,      "PYQ"],
    [/\bpyqs\b/gi,     "PYQs"],
    [/\bmcq\b/gi,      "MCQ"],
    [/\bmcqs\b/gi,     "MCQs"],
    [/\bneet\b/gi,     "NEET"],
    [/\bjee\b/gi,      "JEE"],
    [/\bcbse\b/gi,     "CBSE"],
    [/\bicse\b/gi,     "ICSE"],
    [/\bupsc\b/gi,     "UPSC"],
    [/\bssc\b/gi,      "SSC"],
    [/\bgate\b/gi,     "GATE"],
    [/\bcat\b/gi,      "CAT"],
    [/\bclass\b/gi,    "Class"],
    [/\bstd\b/gi,      "Standard"],
    [/\bgrade\b/gi,    "Grade"],
    [/\bphysics\b/gi,  "Physics"],
    [/\bchem\b/gi,     "Chemistry"],
    [/\bchemistry\b/gi,"Chemistry"],
    [/\bmath\b/gi,     "Mathematics"],
    [/\bmaths\b/gi,    "Mathematics"],
    [/\bbio\b/gi,      "Biology"],
    [/\bbiology\b/gi,  "Biology"],
    [/\beng\b/gi,      "English"],
    [/\benglish\b/gi,  "English"],
    [/\bhindi\b/gi,    "Hindi"],
    [/\bsc\b/gi,       "Science"],
    [/\bscience\b/gi,  "Science"],
    [/\bhist\b/gi,     "History"],
    [/\bhistory\b/gi,  "History"],
    [/\bgeo\b/gi,      "Geography"],
    [/\bgeography\b/gi,"Geography"],
    [/\becono\b/gi,    "Economics"],
    [/\beco\b/gi,      "Economics"],
    [/\bcs\b/gi,       "Computer Science"],
    [/\bcomp\b/gi,     "Computer"],
    [/\bict\b/gi,      "ICT"],
  ]
  for (const [pattern, replacement] of abbrevMap) {
    s = s.replace(pattern, replacement)
  }

  // 6. Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim()

  // 7. Title-case: capitalise first letter of each word,
  //    but preserve all-caps words (like NEET, JEE, MCQ, PDF, etc.)
  s = s.replace(/\b([a-z])([a-z]*)/g, (_, first, rest) => first.toUpperCase() + rest)

  return s
}

function isHtmlFile(_file?: File) {
  return false
}

function getFileContentType(_file?: File) {
  return "application/pdf"
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore("blobs")
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function putQueueBlob(id: string, file: Blob) {
  if (typeof indexedDB === "undefined") return
  const db = await openQueueDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("blobs", "readwrite")
    tx.objectStore("blobs").put(file, id)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
}
async function getQueueBlob(id: string): Promise<Blob | undefined> {
  if (typeof indexedDB === "undefined") return
  const db = await openQueueDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction("blobs").objectStore("blobs").get(id)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
}
async function deleteQueueBlob(id: string) {
  if (typeof indexedDB === "undefined") return
  const db = await openQueueDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("blobs", "readwrite")
    tx.objectStore("blobs").delete(id)
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error)
  })
}

const visibilityOptions: { value: VisibilityType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "public", label: "Public", icon: <Globe className="h-3.5 w-3.5" />, description: "Anyone can view and search" },
  { value: "unlisted", label: "Unlisted", icon: <Link2 className="h-3.5 w-3.5" />, description: "Only with direct link" },
  { value: "private", label: "Private", icon: <Lock className="h-3.5 w-3.5" />, description: "Only admin can view" },
]

export function PDFUploadForm({ categories: initialCategories, onSuccess }: PDFUploadFormProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [categoriesList, setCategoriesList] = useState<Category[]>(initialCategories)
  const [globalCategory, setGlobalCategory] = useState<string>(() => initialCategories[0]?.id ?? "")
  const [globalVisibility, setGlobalVisibility] = useState<VisibilityType>("public")
  const [globalNotificationPreference, setGlobalNotificationPreference] = useState<"none" | "immediate" | "daily">("none")
  const [globalTags, setGlobalTags] = useState<string[]>([])
  const [globalTagInput, setGlobalTagInput] = useState("")
  const [globalStructureLocation, setGlobalStructureLocation] = useState<{ folderId: string; categoryId: string; sectionId: string }>({ folderId: "", categoryId: "", sectionId: "" })
  const [contentFolders, setContentFolders] = useState<ContentFolder[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)
  const [showBulkTitleEditor, setShowBulkTitleEditor] = useState(false)
  const [aiLoadingIds, setAiLoadingIds] = useState<Set<string>>(new Set())

  // Bulk title editor state
  const [bulkPrefix, setBulkPrefix] = useState("")
  const [bulkSuffix, setBulkSuffix] = useState("")
  const [bulkFind, setBulkFind] = useState("")
  const [bulkReplace, setBulkReplace] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceFileInputRef = useRef<HTMLInputElement>(null)
  const replaceTargetIdRef = useRef<string | null>(null)
  const completedEntriesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [queueRestored, setQueueRestored] = useState(false)
  const analyzingIdsRef = useRef(new Set<string>())
  const uploadingIdsRef = useRef(new Set<string>())
  const activeUploadCountRef = useRef(0)
  const analysisControllersRef = useRef(new Map<string, AbortController>())
  const uploadControllersRef = useRef(new Map<string, AbortController>())
  const splitControllerRef = useRef<AbortController | null>(null)
  const cancelledIdsRef = useRef(new Set<string>())
  const nonRetryableUploadIdsRef = useRef(new Set<string>())
  const uploadRunIdRef = useRef(0)

  useEffect(() => () => {
    if (completedEntriesTimeoutRef.current) clearTimeout(completedEntriesTimeoutRef.current)
    analysisControllersRef.current.forEach((controller) => controller.abort())
    uploadControllersRef.current.forEach((controller) => controller.abort())
    splitControllerRef.current?.abort()
  }, [])

  // The queue is deliberately split: small JSON metadata survives a refresh in
  // localStorage while the actual File/thumbnail bytes live in IndexedDB.
  useEffect(() => {
    let cancelled = false
    try {
      const saved = JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || "[]") as Array<{ id: string }>
       Promise.all(saved.filter((item) => (item as { status?: string }).status !== "done").map(async (item) => {
         const blob = await getQueueBlob(sourceBlobKey(item.id))
        if (!blob || cancelled) return null
         const thumbnail = await getQueueBlob(thumbnailBlobKey(item.id))
         const restored = normalizeRestoredQueueState(item as FileEntry)
         return { ...restored, file: new File([blob], (item as { fileName?: string }).fileName || "document.pdf", { type: blob.type || "application/pdf" }), analysis: restored.analysis ? { ...restored.analysis, thumbnail } : undefined } as FileEntry
      })).then((restored) => {
        if (!cancelled) {
          setEntries(restored.filter((x): x is FileEntry => Boolean(x)))
          setQueueRestored(true)
        }
      }).catch(() => { if (!cancelled) setQueueRestored(true) })
    } catch {
      setQueueRestored(true)
    }
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!queueRestored) return
    const metadata = entries.filter((entry) => entry.status !== "done").map(({ file, analysis, ...entry }) => ({
      ...entry, fileName: file.name, fileSize: file.size,
      // Blobs are intentionally not serialized into localStorage.
      analysis: analysis ? { ...analysis, thumbnail: undefined } : undefined,
    }))
    try { localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(metadata)) } catch { /* quota is non-fatal */ }
    entries.filter((entry) => entry.status !== "done").forEach((entry) => {
      putQueueBlob(sourceBlobKey(entry.id), entry.file).catch(() => undefined)
      if (entry.analysis?.thumbnail instanceof Blob) putQueueBlob(thumbnailBlobKey(entry.id), entry.analysis.thumbnail).catch(() => undefined)
    })
  }, [entries, queueRestored])

  // ── Self-fetch categories with auto-refresh ──────────────────────
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  
  useEffect(() => {
    let mounted = true
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories")
        if (!res.ok) {
          if (mounted) setCategoriesError("Could not load categories")
          return
        }
        const data = await res.json()
        if (mounted) {
          setCategoriesError(null)
          if (data.categories?.length > 0) {
            setCategoriesList(data.categories)
          } else {
            setCategoriesList([])
          }
        }
      } catch {
        if (mounted) setCategoriesError("Could not load categories")
      }
    }
    fetchCategories()
    const interval = setInterval(fetchCategories, 2 * 60 * 1000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  useEffect(() => {
    if (initialCategories.length > 0) setCategoriesList(initialCategories)
  }, [initialCategories])

  // Keep the upload default connected to the live database categories. New
  // files should never silently become uncategorized when a category exists.
  useEffect(() => {
    const validCategoryIds = new Set(categoriesList.map((category) => category.id))
    const defaultCategoryId = categoriesList[0]?.id ?? ""

    setGlobalCategory((current) =>
      current && validCategoryIds.has(current) ? current : defaultCategoryId
    )

    if (!defaultCategoryId) return
    setEntries((current) =>
      current.map((entry) => {
        if (
          (entry.status !== "pending" && entry.status !== "error") ||
          (entry.categoryId && validCategoryIds.has(entry.categoryId))
        ) {
          return entry
        }
        return { ...entry, categoryId: defaultCategoryId }
      })
    )
  }, [categoriesList])

  // Load the content tree used to keep relational database categories and
  // folder/category/section selections in sync.
  useEffect(() => {
    let active = true
    async function loadStructure() {
      try {
        const response = await fetch("/api/folders", { cache: "no-store" })
        if (!response.ok) return
        const data = await response.json()
        const folders = (Array.isArray(data?.folders) ? data.folders : []) as ContentFolder[]
        if (active) setContentFolders(folders)
      } catch {
        // The selector still allows manual choice and displays its own error.
      }
    }
    loadStructure()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!contentFolders.length || !categoriesList.length) return
    const categoryNameById = new Map(categoriesList.map((category) => [category.id, category.name]))
    const globalMatch = findStructureLocationByCategoryName(contentFolders, categoryNameById.get(globalCategory))
    if (globalMatch) setGlobalStructureLocation(globalMatch)
    setEntries((current) => current.map((entry) => {
      if (entry.status !== "pending" && entry.status !== "error") return entry
      const match = findStructureLocationByCategoryName(contentFolders, categoryNameById.get(entry.categoryId))
      return match ? { ...entry, structureLocation: match } : entry
    }))
  }, [categoriesList, contentFolders, globalCategory])

  function handleGlobalCategoryChange(categoryId: string) {
    setGlobalCategory(categoryId)
    const categoryName = categoriesList.find((category) => category.id === categoryId)?.name
    const match = findStructureLocationByCategoryName(contentFolders, categoryName)
    if (match) setGlobalStructureLocation(match)
  }

  // ── makeEntry helper ──────────────────────────────────────────────
  function makeEntry(file: File, overrides?: Partial<FileEntry>): FileEntry {
    const title = titleFromFilename(file.name)
    return {
      id: generateId(), file, title,
      description: "",
      categoryId: globalCategory,
      structureLocation: { ...globalStructureLocation },
      tags: [...globalTags],
      visibility: globalVisibility,
      notificationPreference: globalNotificationPreference,
      scheduledAt: null,
      allowDownload: true,
      customSlug: slugify(title),
      status: "pending",
      progress: 0,
      showAdvanced: false,
      isDuplicate: false,
      replaceExisting: false,
      analysisStatus: "queued",
      ...overrides,
    }
  }

  // ── PDF Splitter ───────────────────────────────────────────────────
  async function splitPdfFile(file: File, signal?: AbortSignal): Promise<File[]> {
    const { PDFDocument } = await import("pdf-lib")
    throwIfCancelled(signal)
    const arrayBuffer = await file.arrayBuffer()
    throwIfCancelled(signal)
    const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
    throwIfCancelled(signal)
    const totalPages = sourcePdf.getPageCount()

    if (totalPages === 0) throw new Error("PDF has no pages")
    if (totalPages === 1) {
      // Single-page PDF — can't split further, return as-is even if large
      return [file]
    }

    const TARGET = 40 * 1024 * 1024 // 40 MB target per part
    const numParts = Math.max(2, Math.ceil(file.size / TARGET))
    const pagesPerPart = Math.ceil(totalPages / numParts)
    const totalPartsActual = Math.ceil(totalPages / pagesPerPart)
    const baseName = titleFromFilename(file.name)
    const parts: File[] = []

    for (let i = 0; i < totalPages; i += pagesPerPart) {
      throwIfCancelled(signal)
      const endPage = Math.min(i + pagesPerPart, totalPages)
      const pageIndices = Array.from({ length: endPage - i }, (_, idx) => i + idx)
      const partNum = parts.length + 1

      const partDoc = await PDFDocument.create()
      const copiedPages = await partDoc.copyPages(sourcePdf, pageIndices)
      copiedPages.forEach(page => partDoc.addPage(page))

      const partBytes = await partDoc.save()
      throwIfCancelled(signal)
      const partBuffer = new ArrayBuffer(partBytes.byteLength)
      new Uint8Array(partBuffer).set(partBytes)
      const partName = `${baseName} - Part ${partNum} of ${totalPartsActual}.pdf`
      parts.push(new File([partBuffer], partName, { type: "application/pdf" }))
    }

    return parts
  }

  async function analyzeEntry(entry: FileEntry) {
    if (analyzingIdsRef.current.has(entry.id) || uploadingIdsRef.current.has(entry.id)) return
    cancelledIdsRef.current.delete(entry.id)
    analyzingIdsRef.current.add(entry.id)
    const controller = new AbortController()
    analysisControllersRef.current.set(entry.id, controller)
    try {
    if (isHtmlFile(entry.file)) {
      updateEntry(entry.id, { analysisStatus: "complete", analysisMessage: "HTML document · ready for metadata review", progress: 20 })
      return
    }
      try {
        updateEntry(entry.id, { analysisStatus: "analyzing", analysisMessage: "Inspecting document…" })
        const result = await analyzePdfFile(entry.file, {
          createThumbnail: true,
          signal: controller.signal,
          onProgress: ({ percent, message }) => updateEntry(entry.id, { progress: Math.min(18, Math.round(percent * .18)), analysisMessage: message }),
        })
        if (!result.valid) {
          updateEntry(entry.id, {
            status: "pending",
            progress: 0,
            analysis: result,
            analysisStatus: "complete",
            analysisMessage: "Analysis warning — review the findings before approving upload.",
            error: undefined,
          })
          return
        }
        const hashCheck = await fetch(
          `/api/pdfs/check-hash?hash=${encodeURIComponent(result.sha256)}&textFingerprint=${encodeURIComponent(result.textFingerprint)}`,
          { signal: controller.signal },
        )
        const hashData = await hashCheck.json().catch(() => ({}))
        if (hashCheck.ok && hashData.duplicate) {
          updateEntry(entry.id, { status: "error", isDuplicate: true, error: "This exact file already exists", analysis: result, analysisStatus: "complete", progress: 0 })
          return
        }
        if (hashCheck.ok && Array.isArray(hashData.nearDuplicate) && hashData.nearDuplicate.length > 0) {
          result.nearDuplicate = true
        }
        const matchedCategory = selectMeaningfulCategory(categoriesList, { category: result.category, title: result.title, keywords: result.keywords })
        updateEntry(entry.id, {
          title: result.title || entry.title,
          description: result.seoDescription || result.summary,
          tags: [...new Set([...entry.tags, ...result.tags])].slice(0, 20),
          categoryId: matchedCategory?.id || entry.categoryId,
          customSlug: result.seoSlug,
          analysis: result,
          analysisStatus: "complete",
          analysisMessage: `${result.pageCount} page${result.pageCount === 1 ? "" : "s"} · ${result.language.toUpperCase()}${result.ocrNeeded ? " · OCR" : ""}`,
          progress: 20,
        })
        return
      } catch (error) {
        if (isAbortError(error)) {
          updateEntry(entry.id, {
            status: "pending",
            progress: 0,
            analysisStatus: "queued",
            analysisMessage: "Analysis cancelled — ready to resume",
            error: undefined,
          })
          return
        }
        updateEntry(entry.id, {
          status: "pending",
          analysisStatus: "error",
          analysisMessage: "Analysis unavailable — review the warning and upload if you approve.",
          error: error instanceof Error ? error.message : "Analysis unavailable",
        })
      }
    } finally {
      analyzingIdsRef.current.delete(entry.id)
      if (analysisControllersRef.current.get(entry.id) === controller) {
        analysisControllersRef.current.delete(entry.id)
      }
    }
  }

  async function analyzeAdded(entriesToAnalyze: FileEntry[]) {
    let cursor = 0
    const worker = async () => {
      while (cursor < entriesToAnalyze.length) {
        const entry = entriesToAnalyze[cursor++]
        await analyzeEntry(entry)
      }
    }
    await Promise.all(Array.from({ length: queueConcurrency(entriesToAnalyze.length, MAX_PARALLEL_UPLOADS) }, worker))
  }

  // ── addFiles (async — handles split) ──────────────────────────────
  async function addFiles(files: FileList | File[]) {
    const allFiles = Array.from(files)
    const validTypes = allFiles.filter((f) =>
      f.type === "application/pdf" || isHtmlFile(f)
    )
    if (validTypes.length === 0) { toast.error("Only PDF or HTML files are allowed"); return }

    const normalFiles = validTypes.filter(f => f.size <= MAX_FILE_SIZE)
    const oversizedPdfs = validTypes.filter(f => f.size > MAX_FILE_SIZE && f.type === "application/pdf")
    const oversizedOthers = validTypes.filter(f => f.size > MAX_FILE_SIZE && !f.type.includes("pdf"))

    if (oversizedOthers.length > 0) {
      toast.error(`Files exceed 100MB and can't be split: ${oversizedOthers.map(f => f.name).join(", ")}`)
    }

    // Immediately add normal-size files
    if (normalFiles.length > 0) {
      const newEntries = normalFiles.map(f => makeEntry(f))
      setEntries(prev => [...prev, ...newEntries])
      void analyzeAdded(newEntries)
    }

    // Auto-split oversized PDFs
    if (oversizedPdfs.length > 0) {
      setIsSplitting(true)
      const splitController = new AbortController()
      splitControllerRef.current?.abort()
      splitControllerRef.current = splitController
      const toastId = toast.loading(
        oversizedPdfs.length === 1
          ? `Splitting "${titleFromFilename(oversizedPdfs[0].name)}" into parts…`
          : `Splitting ${oversizedPdfs.length} large files into parts…`
      )
      try {
        const splitEntries: FileEntry[] = []
        for (const bigFile of oversizedPdfs) {
          const parts = await splitPdfFile(bigFile, splitController.signal)
          splitEntries.push(...parts.map(p => makeEntry(p)))
        }
        setEntries(prev => [...prev, ...splitEntries])
        void analyzeAdded(splitEntries)
        toast.dismiss(toastId)
        if (oversizedPdfs.length === 1) {
          toast.success(
            splitEntries.length > 1
              ? `"${titleFromFilename(oversizedPdfs[0].name)}" split into ${splitEntries.length} parts — ready to upload`
              : `"${titleFromFilename(oversizedPdfs[0].name)}" added (single page, kept as-is)`
          )
        } else {
          toast.success(`${oversizedPdfs.length} files split into ${splitEntries.length} parts total`)
        }
      } catch (error) {
        toast.dismiss(toastId)
        if (isAbortError(error)) {
          toast.info("PDF splitting cancelled")
        } else {
          toast.error("Failed to split PDF — file may be encrypted or corrupted", {
            description: "Try compressing or decrypting it first.",
          })
        }
      } finally {
        if (splitControllerRef.current === splitController) splitControllerRef.current = null
        setIsSplitting(false)
      }
    }
  }

  async function replaceEntryFile(entryId: string, newFile: File) {
    if (newFile.type !== "application/pdf" && !isHtmlFile(newFile)) {
      toast.error("Only PDF or HTML files are allowed")
      return
    }

    // If file is within size limit — replace in place
    if (newFile.size <= MAX_FILE_SIZE) {
      const newTitle = titleFromFilename(newFile.name)
      updateEntry(entryId, {
        file: newFile,
        title: newTitle,
        customSlug: slugify(newTitle),
        status: "pending",
        error: undefined,
        isDuplicate: false,
        progress: 0,
        speedKBps: 0,
        etaSecs: 0,
        analysis: undefined,
        analysisStatus: "queued",
        analysisMessage: "Queued for analysis",
      })
      const replacement = { ...entries.find((entry) => entry.id === entryId), file: newFile, analysis: undefined, analysisStatus: "queued" } as FileEntry
      void analyzeEntry(replacement)
      toast.success(`File replaced: ${newFile.name}`)
      return
    }

    // Oversized PDF — split into parts, remove current entry, add all parts
    if (newFile.type === "application/pdf") {
      setIsSplitting(true)
      const splitController = new AbortController()
      splitControllerRef.current?.abort()
      splitControllerRef.current = splitController
      const toastId = toast.loading(`Splitting "${titleFromFilename(newFile.name)}" into parts…`)
      try {
        const parts = await splitPdfFile(newFile, splitController.signal)
        // Remove the current entry and add all parts
        setEntries(prev => {
          const without = prev.filter(e => e.id !== entryId)
          const insertIdx = prev.findIndex(e => e.id === entryId)
          const existing = prev.find(e => e.id === entryId)
          // Keep the entry's chosen metadata when one file becomes several parts.
          // Replacing must not silently discard category, tags, visibility, or settings.
          const newParts = parts.map(p => {
            const partTitle = titleFromFilename(p.name)
            return makeEntry(p, existing ? {
              description: existing.description,
              categoryId: existing.categoryId,
              structureLocation: { ...existing.structureLocation },
              tags: [...existing.tags],
              visibility: existing.visibility,
              scheduledAt: existing.scheduledAt,
              allowDownload: existing.allowDownload,
              showAdvanced: existing.showAdvanced,
              replaceExisting: existing.replaceExisting,
              title: partTitle,
              customSlug: slugify(partTitle),
            } : undefined)
          })
          if (insertIdx === -1) return [...without, ...newParts]
          return [...without.slice(0, insertIdx), ...newParts, ...without.slice(insertIdx)]
        })
        toast.dismiss(toastId)
        toast.success(
          parts.length > 1
            ? `Replaced with ${parts.length} parts — ready to upload`
            : `File replaced (kept as single part)`
        )
      } catch (error) {
        toast.dismiss(toastId)
        if (isAbortError(error)) toast.info("PDF splitting cancelled")
        else toast.error("Failed to split PDF — file may be encrypted or corrupted")
      } finally {
        if (splitControllerRef.current === splitController) splitControllerRef.current = null
        setIsSplitting(false)
      }
      return
    }

    // Oversized HTML or other — reject
    toast.error(`File exceeds 100MB limit and cannot be split: ${newFile.name}`)
  }

  function handleReplaceFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const targetId = replaceTargetIdRef.current
    if (file && targetId) {
      replaceEntryFile(targetId, file)
    }
    replaceTargetIdRef.current = null
    e.target.value = ""
  }

  function triggerReplaceFile(entryId: string) {
    replaceTargetIdRef.current = entryId
    replaceFileInputRef.current?.click()
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) { addFiles(e.target.files); e.target.value = "" }
  }

  function removeEntry(id: string) {
    const entry = entries.find((item) => item.id === id)
    if (entry && (entry.status === "uploading" || entry.status === "checking" || entry.status === "done")) {
      toast.error("This file cannot be removed while it has upload metadata")
      return
    }
    setEntries((prev) => prev.filter((e) => e.id !== id))
    void Promise.all([deleteQueueBlob(sourceBlobKey(id)), deleteQueueBlob(thumbnailBlobKey(id))])
  }

  function clearCompletedEntries() {
    setEntries((prev) => {
      prev.filter((entry) => entry.status === "done").forEach((entry) => void Promise.all([
        deleteQueueBlob(sourceBlobKey(entry.id)),
        deleteQueueBlob(thumbnailBlobKey(entry.id)),
      ]))
      return prev.filter((entry) => entry.status !== "done")
    })
  }

  function analyzeAgain(id: string) {
    const entry = entries.find((item) => item.id === id)
    if (!entry || entry.status === "uploading" || entry.status === "checking") return
    const retry = { ...entry, status: "pending" as const, progress: 0, error: undefined, isDuplicate: false, analysis: undefined, analysisStatus: "queued" as const, analysisMessage: "Queued for analysis" }
    updateEntry(id, retry)
    void analyzeEntry(retry)
  }

  function updateEntry(id: string, patch: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function cancelEntry(id: string) {
    cancelledIdsRef.current.add(id)
    analysisControllersRef.current.get(id)?.abort()
    uploadControllersRef.current.get(id)?.abort()
    setEntries((prev) => prev.map((entry) => {
      if (entry.id !== id) return entry
      if (entry.analysisStatus === "analyzing") {
        return {
          ...entry,
          status: "pending",
          progress: 0,
          analysisStatus: "queued",
          analysisMessage: "Analysis cancelled — ready to resume",
          error: undefined,
        }
      }
      if (entry.status === "checking" || entry.status === "uploading") {
        return {
          ...entry,
          status: "pending",
          progress: entry.analysis?.valid ? 20 : 0,
          speedKBps: 0,
          etaSecs: 0,
          error: undefined,
        }
      }
      return entry
    }))
  }

  function cancelAllProcessing() {
    uploadRunIdRef.current += 1
    analysisControllersRef.current.forEach((controller) => controller.abort())
    uploadControllersRef.current.forEach((controller) => controller.abort())
    splitControllerRef.current?.abort()
    splitControllerRef.current = null
    analyzingIdsRef.current.forEach((id) => cancelledIdsRef.current.add(id))
    uploadingIdsRef.current.forEach((id) => cancelledIdsRef.current.add(id))
    setIsUploading(false)
    setIsSplitting(false)
    setEntries((prev) => prev.map((entry) => {
      if (entry.analysisStatus === "analyzing") {
        return {
          ...entry,
          status: "pending",
          progress: 0,
          analysisStatus: "queued",
          analysisMessage: "Analysis cancelled — ready to resume",
          error: undefined,
        }
      }
      if (entry.status === "checking" || entry.status === "uploading") {
        return {
          ...entry,
          status: "pending",
          progress: entry.analysis?.valid ? 20 : 0,
          speedKBps: 0,
          etaSecs: 0,
          error: undefined,
        }
      }
      return entry
    }))
    toast.info("Processing cancelled. Files remain in the queue.")
  }

  // ── AI Summary Generation ─────────────────────────────────────────
  async function generateAiSummary(entryId: string) {
    const entry = entries.find(e => e.id === entryId)
    if (!entry) return

    setAiLoadingIds(prev => new Set(prev).add(entryId))
    try {
      const categoryName = categoriesList.find(c => c.id === entry.categoryId)?.name || ""
      const res = await fetch("/api/ai/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: entry.title, description: entry.description, category: categoryName }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "AI generation failed"); return }
      if (data.summary) {
        updateEntry(entryId, { description: data.summary })
        toast.success("AI summary generated!")
      }
    } catch {
      toast.error("Failed to generate summary")
    } finally {
      setAiLoadingIds(prev => { const s = new Set(prev); s.delete(entryId); return s })
    }
  }

  // ── Bulk Title Editor Actions ──────────────────────────────────────
  function applyBulkPrefix() {
    if (!bulkPrefix.trim()) return
    setEntries((prev) => prev.map((e) =>
      e.status === "pending"
        ? { ...e, title: bulkPrefix + e.title, customSlug: slugify(bulkPrefix + e.title) }
        : e
    ))
    toast.success(`Prefix "${bulkPrefix}" added to all pending titles`)
    setBulkPrefix("")
  }

  function applyBulkSuffix() {
    if (!bulkSuffix.trim()) return
    setEntries((prev) => prev.map((e) =>
      e.status === "pending"
        ? { ...e, title: e.title + bulkSuffix, customSlug: slugify(e.title + bulkSuffix) }
        : e
    ))
    toast.success(`Suffix "${bulkSuffix}" added to all pending titles`)
    setBulkSuffix("")
  }

  function applyBulkFindReplace() {
    if (!bulkFind.trim()) return
    let count = 0
    setEntries((prev) => prev.map((e) => {
      if (e.status !== "pending") return e
      if (!e.title.includes(bulkFind)) return e
      const newTitle = e.title.split(bulkFind).join(bulkReplace)
      count++
      return { ...e, title: newTitle, customSlug: slugify(newTitle) }
    }))
    toast.success(count > 0 ? `Replaced in ${count} title(s)` : `"${bulkFind}" not found in any title`)
    setBulkFind(""); setBulkReplace("")
  }

  // ── Global Settings ─────────────────────────────────────────────
  function applyGlobalSettings() {
    setEntries((prev) =>
      prev.map((e) => (e.status === "pending" ? {
        ...e,
        categoryId: globalCategory || e.categoryId,
        visibility: globalVisibility,
        notificationPreference: globalNotificationPreference,
        tags: [...new Set([...e.tags, ...globalTags])],
        structureLocation: globalStructureLocation.sectionId ? { ...globalStructureLocation } : e.structureLocation,
      } : e))
    )
    toast.success("Global settings applied to all pending files")
  }

  function addGlobalTag(tag: string) {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !globalTags.includes(trimmed)) setGlobalTags([...globalTags, trimmed])
    setGlobalTagInput("")
  }
  function removeGlobalTag(tag: string) { setGlobalTags(globalTags.filter(t => t !== tag)) }

  function addEntryTag(id: string, tag: string) {
    const entry = entries.find(e => e.id === id)
    if (entry) {
      const trimmed = tag.trim().toLowerCase()
      if (trimmed && !entry.tags.includes(trimmed)) updateEntry(id, { tags: [...entry.tags, trimmed] })
    }
  }
  function removeEntryTag(id: string, tag: string) {
    const entry = entries.find(e => e.id === id)
    if (entry) updateEntry(id, { tags: entry.tags.filter(t => t !== tag) })
  }

  // ── Upload Logic ────────────────────────────────────────────────
  const uploadEntry = useCallback(async (entry: FileEntry): Promise<boolean> => {
    if (!isUploadReady(entry) || uploadingIdsRef.current.has(entry.id) || analyzingIdsRef.current.has(entry.id)) {
      toast.error("This file is currently being analyzed or uploaded.")
      return false
    }
    if (activeUploadCountRef.current >= MAX_PARALLEL_UPLOADS) {
      toast.error(`${MAX_PARALLEL_UPLOADS} uploads are already in progress. This file will remain queued.`)
      return false
    }
    cancelledIdsRef.current.delete(entry.id)
    nonRetryableUploadIdsRef.current.delete(entry.id)
    uploadingIdsRef.current.add(entry.id)
    activeUploadCountRef.current += 1
    const controller = new AbortController()
    uploadControllersRef.current.set(entry.id, controller)
    const title = entry.title.trim() || titleFromFilename(entry.file.name)

    try {
      // Step 0: Pre-check for duplicate title (unless replace is already set)
      if (!entry.replaceExisting) {
        updateEntry(entry.id, { status: "checking", progress: 5, isDuplicate: false })
        try {
          const checkRes = await fetch(`/api/pdfs/check-title?title=${encodeURIComponent(title)}`, {
            signal: controller.signal,
          })
          const checkData = await checkRes.json().catch(() => null)
          if (!checkRes.ok) {
            throw new Error(
              checkData && typeof checkData.error === "string"
                ? `Could not check for duplicate titles: ${checkData.error}`
                : "Could not check for duplicate titles. Please try again."
            )
          }
          if (!checkData || typeof checkData.exists !== "boolean") {
            throw new Error("Could not verify whether this title already exists. Please try again.")
          }
          if (checkData.exists) {
            nonRetryableUploadIdsRef.current.add(entry.id)
            updateEntry(entry.id, {
              status: "error", progress: 0,
              error: "A PDF with this title already exists",
              isDuplicate: true,
            })
            return false
          }
        } catch (error) {
          throw error instanceof Error
            ? error
            : new Error("Could not check for duplicate titles. Please try again.")
        }
      }

      updateEntry(entry.id, { status: "uploading", progress: 10, isDuplicate: false })

      // Step 1: Get signed upload URL
      const urlRes = await fetch("/api/pdfs/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ filename: entry.file.name, contentType: getFileContentType(entry.file) }),
      })
      if (!urlRes.ok) {
        const d = await urlRes.json().catch(() => ({}))
        throw new Error(d.error || "Failed to get upload URL")
      }
      const uploadData: unknown = await urlRes.json().catch(() => null)
      if (
        !uploadData ||
        typeof uploadData !== "object" ||
        typeof (uploadData as { signedUrl?: unknown }).signedUrl !== "string" ||
        typeof (uploadData as { filePath?: unknown }).filePath !== "string" ||
        !(uploadData as { signedUrl: string }).signedUrl ||
        !(uploadData as { filePath: string }).filePath
      ) {
        throw new Error("Upload service returned an invalid upload URL. Please try again.")
      }
      const { signedUrl, filePath } = uploadData as { signedUrl: string; filePath: string }
      try {
        new URL(signedUrl)
      } catch {
        throw new Error("Upload service returned an invalid upload URL. Please try again.")
      }
      updateEntry(entry.id, { progress: 20 })

      // Step 2: Upload to storage with speed/ETA tracking
      const uploadStart = Date.now()
      let lastLoaded = 0
      let lastTime = uploadStart
      await uploadFileToSignedStorage({
        signedUrl,
        file: entry.file,
        signal: controller.signal,
        onProgress: (loaded, total) => {
          if (total <= 0) return
          const now = Date.now()
          const elapsed = (now - lastTime) / 1000
          const loadedDelta = loaded - lastLoaded
          const speedKBps = elapsed > 0 ? Math.round(loadedDelta / elapsed / 1024) : 0
          const remaining = total - loaded
          const etaSecs = speedKBps > 0 ? Math.round(remaining / (speedKBps * 1024)) : 0
          lastLoaded = loaded
          lastTime = now
          const prog = 20 + Math.round((loaded / total) * 60)
          updateEntry(entry.id, { progress: prog, speedKBps, etaSecs })
        },
      })

      updateEntry(entry.id, { progress: 85, speedKBps: 0, etaSecs: 0 })

      // Persist the generated preview as part of the smart-upload contract.
      let thumbnailPath: string | undefined
      const thumbnail = entry.analysis?.thumbnail
      if (thumbnail instanceof Blob) {
        const thumbRes = await fetch("/api/pdfs/get-upload-url", {
          method: "POST", headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ filename: `${slugify(title)}-thumbnail.jpg`, contentType: thumbnail.type || "image/jpeg", assetKind: "thumbnail" }),
        })
        const thumbData = await thumbRes.json().catch(() => ({}))
        if (!thumbRes.ok || typeof thumbData.signedUrl !== "string" || typeof thumbData.filePath !== "string") {
          throw new Error(typeof thumbData.error === "string" ? thumbData.error : "Failed to prepare automatic thumbnail upload")
        }
        await uploadFileToSignedStorage({
          signedUrl: thumbData.signedUrl,
          file: new File([thumbnail], `${slugify(title)}-thumbnail.jpg`, { type: thumbnail.type || "image/jpeg" }),
          signal: controller.signal,
        })
        thumbnailPath = thumbData.filePath
      }

      // Step 3: Save bounded analysis metadata; publishing remains an explicit
      // review action and is never implied by uploading.
      const metaRes = await fetch("/api/pdfs/save-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          title, description: entry.description, filePath,
          fileSize: entry.file.size, categoryId: entry.categoryId || null,
          structureLocation: entry.structureLocation?.folderId ? entry.structureLocation : null,
          tags: entry.tags, visibility: entry.visibility,
          scheduledAt: entry.scheduledAt, allowDownload: entry.allowDownload,
          customSlug: entry.customSlug || slugify(title),
          replace: entry.replaceExisting ?? false,
          publishStatus: "draft",
          notificationPreference: entry.notificationPreference || "none",
          thumbnailPath,
          analysis: entry.analysis ? {
            valid: entry.analysis.valid,
            contentHash: entry.analysis.sha256,
            pageCount: entry.analysis.pageCount,
            language: entry.analysis.language,
            metadata: entry.analysis.metadata,
            text: entry.analysis.text.slice(0, 2_000_000),
            textFingerprint: entry.analysis.textFingerprint,
            thumbnailPath,
            ocrStatus: entry.analysis.ocrNeeded ? (entry.analysis.ocr.some((page) => page.status === "complete") ? "completed" : "failed") : "not_required",
            ocrConfidence: (() => {
              const confidence = entry.analysis?.ocr.find((page) => typeof page.confidence === "number")?.confidence
              return typeof confidence === "number" ? Math.min(1, Math.max(0, confidence / 100)) : undefined
            })(),
            malwareStatus: entry.analysis.suspiciousMarkers.length ? "suspicious" : "clean",
            warnings: [
              ...(entry.analysis.nearDuplicate ? ["Possible near-duplicate content"] : []),
              ...entry.analysis.suspiciousMarkers,
              ...entry.analysis.piiWarnings,
              ...entry.analysis.copyrightMarkers,
              ...entry.analysis.errors,
            ].slice(0, 20),
            seoTitle: entry.analysis.seoTitle,
            seoDescription: entry.analysis.seoDescription,
            seoKeywords: entry.analysis.keywords.slice(0, 20),
          } : undefined,
        }),
      })

      if (!metaRes.ok) {
        const metaData = await metaRes.json().catch(() => ({}))
        if (metaData.duplicate || metaRes.status === 409) {
          nonRetryableUploadIdsRef.current.add(entry.id)
          updateEntry(entry.id, {
            status: "error", progress: 0,
            error: "A PDF with this title already exists",
            isDuplicate: true,
          })
          return false
        }
        throw new Error(metaData.error || "Failed to save PDF metadata")
      }

      const metaData = await metaRes.json().catch(() => ({}))
      if (typeof metaData.cleanupWarning === "string") {
        toast.warning("PDF replaced, but storage cleanup needs attention", {
          description: metaData.cleanupWarning,
          duration: 12_000,
        })
      }
      updateEntry(entry.id, { status: "done", progress: 100, speedKBps: 0, etaSecs: 0 })
      void Promise.all([deleteQueueBlob(sourceBlobKey(entry.id)), deleteQueueBlob(thumbnailBlobKey(entry.id))])
      return true
    } catch (err) {
      if (isAbortError(err)) {
        updateEntry(entry.id, {
          status: "pending",
          progress: entry.analysis?.valid ? 20 : 0,
          error: undefined,
          speedKBps: 0,
          etaSecs: 0,
        })
        return false
      }
      let errorMsg = "Upload failed"
      if (err instanceof Error) {
        if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          errorMsg = "Network error - check your connection"
        } else {
          errorMsg = err.message
        }
      }
      updateEntry(entry.id, { status: "error", progress: 0, error: errorMsg, isDuplicate: false, speedKBps: 0, etaSecs: 0 })
      toast.error(`${entry.file.name} failed to upload`, {
        description: errorMsg,
        duration: 12_000,
      })
      return false
    } finally {
      uploadingIdsRef.current.delete(entry.id)
      activeUploadCountRef.current = Math.max(0, activeUploadCountRef.current - 1)
      if (uploadControllersRef.current.get(entry.id) === controller) {
        uploadControllersRef.current.delete(entry.id)
      }
    }
  }, [])

  async function retryWithReplace(id: string) {
    const entry = entries.find(e => e.id === id)
    if (!entry) return
    const shouldReplace = entry.isDuplicate === true
    updateEntry(id, { replaceExisting: shouldReplace, isDuplicate: false })
    // Use the updated entry
    const updated = { ...entry, replaceExisting: shouldReplace, isDuplicate: false }
    const ok = await uploadEntry(updated)
    if (ok) {
      toast.success(shouldReplace ? "PDF replaced successfully!" : "PDF uploaded successfully!")
      onSuccess()
    }
  }

  async function handleUploadAll() {
    const pending = entries.filter(isUploadReady)
    if (pending.length === 0) { toast.error("No files to upload"); return }
    const runId = uploadRunIdRef.current + 1
    uploadRunIdRef.current = runId
    setIsUploading(true)
    let successCount = 0
    const results: boolean[] = []
    let cursor = 0
    const worker = async () => {
      while (uploadRunIdRef.current === runId && cursor < pending.length) {
        const entry = pending[cursor++]
        let result = false
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (uploadRunIdRef.current !== runId || cancelledIdsRef.current.has(entry.id)) break
          result = await uploadEntry(entry)
          if (
            result ||
            nonRetryableUploadIdsRef.current.has(entry.id) ||
            cancelledIdsRef.current.has(entry.id) ||
            attempt === 2
          ) break
          await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt))
          updateEntry(entry.id, { status: "pending", error: undefined })
        }
        results.push(result)
        if (result) successCount += 1
      }
    }
    await Promise.all(Array.from({ length: queueConcurrency(pending.length, MAX_PARALLEL_UPLOADS) }, worker))
    if (uploadRunIdRef.current !== runId) return
    setIsUploading(false)
    if (successCount > 0) {
      toast.success(`${successCount} PDF${successCount > 1 ? "s" : ""} uploaded successfully!`)
      onSuccess()
    }
    const failedCount = results.filter(r => !r).length
    if (failedCount > 0) toast.error(`${failedCount} file${failedCount > 1 ? "s" : ""} failed to upload`)
    if (completedEntriesTimeoutRef.current) clearTimeout(completedEntriesTimeoutRef.current)
    completedEntriesTimeoutRef.current = setTimeout(() => {
      completedEntriesTimeoutRef.current = null
      clearCompletedEntries()
    }, 2000)
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length
  const uploadReadyCount = entries.filter(isUploadReady).length
  const analyzingCount = entries.filter((e) => e.analysisStatus === "analyzing").length
  const inFlightCount = entries.filter((e) =>
    e.analysisStatus === "analyzing" || e.status === "checking" || e.status === "uploading"
  ).length + (isSplitting ? 1 : 0)

  return (
    <div className="space-y-5">
      {/* Splitting Banner */}
      {isSplitting && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-400/50 bg-blue-500/5 animate-pulse">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
            <Scissors className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Splitting large PDF into parts…</p>
            <p className="text-xs text-muted-foreground">This may take a moment. Parts will appear in the queue automatically.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={cancelAllProcessing}
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </Button>
        </div>
      )}

      {/* Setup Tip - Show when no categories exist */}
      {categoriesList.length === 0 && entries.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-400/50 bg-amber-500/5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Tip: Set up your content structure first</p>
            <p className="text-xs text-muted-foreground">Create folders, categories and sections to organize your PDFs better. You can still upload without them.</p>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-10 text-center transition-all duration-300 cursor-pointer group ${
          dragActive
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,80,200,0.05),transparent_70%)] rounded-xl sm:rounded-2xl pointer-events-none" />
        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" multiple onChange={handleFileChange} className="hidden" />
        <input ref={replaceFileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleReplaceFileChange} className="hidden" />
        <div className="relative">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
            <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <p className="font-semibold text-sm sm:text-lg text-foreground">Drop PDF or HTML files here or click to select</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Files over 100MB are auto-split into parts</p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-primary bg-primary/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Fast
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-green-600 bg-green-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Files className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Batch
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 bg-blue-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Scissors className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Auto-Split
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 bg-blue-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Tags
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-amber-600 bg-amber-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Schedule
            </span>
          </div>
        </div>
      </div>

      {/* Global Settings Panel */}
      {entries.length > 0 && (
        <Collapsible open={showGlobalSettings} onOpenChange={setShowGlobalSettings}>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-3 sm:p-4 h-auto hover:bg-muted/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Settings2 className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground text-xs sm:text-sm">Global Upload Settings</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Apply to all pending files</p>
                  </div>
                </div>
                {showGlobalSettings ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4 border-t border-border/50">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FolderPlus className="h-4 w-4 text-muted-foreground" /> Category
                    </Label>
                    <Select value={globalCategory} onValueChange={handleGlobalCategoryChange} disabled={categoriesList.length === 0}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={categoriesList.length === 0 ? "No categories available" : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriesList.length === 0 ? (
                          <div className="p-3 text-center text-xs text-muted-foreground">
                            No categories yet. Create them in the Structure section below.
                          </div>
                        ) : (
                          [...categoriesList].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                {cat.name}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {categoriesList.length === 0 && (
                      <p className="text-[10px] text-amber-600">Tip: Categories are optional but help organize your PDFs</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" /> Visibility
                    </Label>
                    <Select value={globalVisibility} onValueChange={(v) => setGlobalVisibility(v as VisibilityType)}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {visibilityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              {opt.icon} <span>{opt.label}</span>
                              <span className="text-xs text-muted-foreground">- {opt.description}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" /> Review notifications
                    </Label>
                    <Select value={globalNotificationPreference} onValueChange={(v) => setGlobalNotificationPreference(v as "none" | "immediate" | "daily")}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No notification</SelectItem>
                        <SelectItem value="immediate">Notify when published</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FolderPlus className="h-4 w-4 text-muted-foreground" /> Content Location
                  </Label>
                  <StructureSelector value={globalStructureLocation} onChange={setGlobalStructureLocation} placeholder="Select folder/category/section" className="w-full" />
                  <p className="text-xs text-muted-foreground">All new PDFs will be added to this location</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" /> Tags (for search &amp; filtering)
                  </Label>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-lg border border-border bg-background">
                    {globalTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20" onClick={() => removeGlobalTag(tag)}>
                        #{tag}<X className="h-3 w-3" />
                      </Badge>
                    ))}
                    <Input
                      value={globalTagInput}
                      onChange={(e) => setGlobalTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addGlobalTag(globalTagInput) } }}
                      onBlur={() => addGlobalTag(globalTagInput)}
                      placeholder="Type and press Enter..."
                      className="flex-1 min-w-[120px] border-0 shadow-none h-7 px-1 focus-visible:ring-0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Press Enter or comma to add tags</p>
                </div>
                <Button onClick={applyGlobalSettings} className="w-full gap-2" variant="outline">
                  <Sparkles className="h-4 w-4" /> Apply to All Pending Files
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* ── Bulk Title Editor ─────────────────────────────────────── */}
      {entries.filter(e => e.status === "pending").length > 1 && (
        <Collapsible open={showBulkTitleEditor} onOpenChange={setShowBulkTitleEditor}>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-3 sm:p-4 h-auto hover:bg-muted/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-blue-500/10">
                    <Type className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground text-xs sm:text-sm">Bulk Title Editor</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Add prefix/suffix or find &amp; replace in all titles</p>
                  </div>
                </div>
                {showBulkTitleEditor ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4 border-t border-border/50">

                {/* Prefix */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Prefix</Label>
                  <div className="flex gap-2">
                    <Input
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value)}
                      placeholder='e.g. "Chapter 1 - " or "[2024] "'
                      className="h-9 flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") applyBulkPrefix() }}
                    />
                    <Button
                      variant="outline"
                      className="h-9 gap-1.5 whitespace-nowrap"
                      onClick={applyBulkPrefix}
                      disabled={!bulkPrefix.trim()}
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> Add Prefix
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Prepends text to the start of every pending title</p>
                </div>

                {/* Suffix */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Suffix</Label>
                  <div className="flex gap-2">
                    <Input
                      value={bulkSuffix}
                      onChange={(e) => setBulkSuffix(e.target.value)}
                      placeholder='e.g. " v2" or " (Updated)"'
                      className="h-9 flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") applyBulkSuffix() }}
                    />
                    <Button
                      variant="outline"
                      className="h-9 gap-1.5 whitespace-nowrap"
                      onClick={applyBulkSuffix}
                      disabled={!bulkSuffix.trim()}
                    >
                      <ArrowRight className="h-3.5 w-3.5" /> Add Suffix
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Appends text to the end of every pending title</p>
                </div>

                {/* Find & Replace */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Find &amp; Replace</Label>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/70 select-none">FIND</span>
                      <Input
                        value={bulkFind}
                        onChange={(e) => setBulkFind(e.target.value)}
                        placeholder="Text to find..."
                        className="h-9 pl-10"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/70 select-none">WITH</span>
                      <Input
                        value={bulkReplace}
                        onChange={(e) => setBulkReplace(e.target.value)}
                        placeholder="Replace with..."
                        className="h-9 pl-10"
                        onKeyDown={(e) => { if (e.key === "Enter") applyBulkFindReplace() }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full h-9 gap-1.5"
                    onClick={applyBulkFindReplace}
                    disabled={!bulkFind.trim()}
                  >
                    <Replace className="h-3.5 w-3.5" /> Apply Find &amp; Replace
                  </Button>
                  <p className="text-[11px] text-muted-foreground">Replaces all occurrences in every pending title. Leave "Replace with" blank to delete the found text.</p>
                </div>

              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* Content Structure Editor */}
      {entries.length > 0 && (
        <Collapsible>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between p-3 sm:p-4 h-auto hover:bg-muted/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-accent/10">
                    <FolderPlus className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground text-xs sm:text-sm">Edit Content Structure</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Create folders, categories, sections</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 sm:p-4 border-t border-border/50">
                <InlineStructureEditor compact />
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* File List */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {/* List header with Clear done */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{entries.filter(e=>e.status==="pending").length} pending</span>
              {entries.filter(e=>e.status==="done").length > 0 && <span className="text-green-600">{entries.filter(e=>e.status==="done").length} done</span>}
              {entries.filter(e=>e.status==="error").length > 0 && <span className="text-destructive">{entries.filter(e=>e.status==="error").length} failed</span>}
            </div>
            {entries.some(e=>e.status==="done") && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground px-2 gap-1.5"
                onClick={clearCompletedEntries}>
                <X className="h-3 w-3" /> Clear done
              </Button>
            )}
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border bg-card transition-all duration-300 overflow-hidden ${
                entry.status === "done"
                  ? "border-green-500/50 bg-green-500/5"
                  : entry.status === "error"
                  ? entry.isDuplicate
                    ? "border-amber-400/60 bg-amber-500/5"
                    : "border-destructive/50 bg-destructive/5"
                  : entry.status === "uploading" || entry.status === "checking"
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {/* Main Row */}
              <div className="flex items-center gap-3 p-3.5">
                {/* Status Icon */}
                <div className="shrink-0">
                  {(entry.status === "uploading" || entry.status === "checking") && (
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      </div>
                    </div>
                  )}
                  {entry.status === "done" && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                  {entry.status === "error" && (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${entry.isDuplicate ? "bg-amber-500/20" : "bg-destructive/20"}`}>
                      {entry.isDuplicate
                        ? <AlertCircle className="h-5 w-5 text-amber-500" />
                        : <AlertCircle className="h-5 w-5 text-destructive" />
                      }
                    </div>
                  )}
                  {entry.status === "pending" && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {isHtmlFile(entry.file)
                        ? <Code className="h-5 w-5 text-blue-500" />
                        : <FileText className="h-5 w-5 text-muted-foreground" />
                      }
                    </div>
                  )}
                </div>

                {/* Title and Info */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={entry.title}
                    onChange={(e) => updateEntry(entry.id, { title: e.target.value, customSlug: slugify(e.target.value) })}
                    placeholder="PDF title"
                    disabled={entry.status !== "pending" && entry.status !== "error"}
                    className="h-9 text-sm font-medium"
                  />
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.file.name} &middot; {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {isHtmlFile(entry.file) && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-400 text-blue-600 gap-1">
                        <Code className="h-2.5 w-2.5" /> HTML
                      </Badge>
                    )}
                    {entry.tags.length > 0 && (
                      <div className="flex gap-1">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">#{tag}</Badge>
                        ))}
                        {entry.tags.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{entry.tags.length - 3}</Badge>
                        )}
                      </div>
                    )}
                    {entry.visibility !== "public" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                        {entry.visibility === "private" ? <Lock className="h-2.5 w-2.5" /> : <Link2 className="h-2.5 w-2.5" />}
                        {entry.visibility}
                      </Badge>
                    )}
                    {entry.scheduledAt && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                        <Clock className="h-2.5 w-2.5" /> Scheduled
                      </Badge>
                    )}
                    {entry.status === "checking" && (
                      <span className="text-xs text-muted-foreground animate-pulse">Checking for duplicates…</span>
                    )}
                    {entry.analysisStatus === "analyzing" && (
                      <span className="text-xs text-primary animate-pulse">{entry.analysisMessage || "Analyzing…"}</span>
                    )}
                    {entry.analysisStatus === "queued" && (
                      <span className="text-xs text-muted-foreground">{entry.analysisMessage || "Waiting to analyze before upload"}</span>
                    )}
                    {entry.analysisStatus === "complete" && entry.analysis && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {entry.analysis.pageCount} pages · {entry.analysis.language.toUpperCase()}
                        {entry.analysis.ocrNeeded ? " · OCR" : ""}
                      </Badge>
                    )}
                    {entry.status === "uploading" && (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {entry.progress}%
                      </span>
                    )}
                    {entry.status === "uploading" && (entry.speedKBps || 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {(entry.speedKBps || 0) >= 1024
                          ? `${((entry.speedKBps || 0) / 1024).toFixed(1)} MB/s`
                          : `${entry.speedKBps} KB/s`}
                        {(entry.etaSecs || 0) > 0 && ` · ${entry.etaSecs}s left`}
                      </span>
                    )}
                  </div>
                  {entry.analysisStatus === "complete" && entry.analysis && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{entry.analysis.textCharacters.toLocaleString()} characters</span>
                      {entry.analysis.suspiciousMarkers.length > 0 && <span className="text-amber-600">Security warning: {entry.analysis.suspiciousMarkers.join(", ")}</span>}
                      {entry.analysis.piiWarnings.length > 0 && <span className="text-amber-600">Review: {entry.analysis.piiWarnings.join(", ")}</span>}
                      {entry.analysis.errors.length > 0 && <span className="text-destructive">{entry.analysis.errors.length} scan warning{entry.analysis.errors.length === 1 ? "" : "s"}</span>}
                    </div>
                  )}

                  {/* Duplicate error with Replace button */}
                  {entry.status === "error" && entry.isDuplicate && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-amber-600 font-medium">{entry.error}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] px-2 gap-1 border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                        onClick={() => retryWithReplace(entry.id)}
                      >
                        <RefreshCw className="h-3 w-3" /> Replace existing
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] px-2 gap-1 text-muted-foreground"
                        onClick={() => updateEntry(entry.id, { status: "pending", isDuplicate: false, error: undefined })}
                      >
                        Edit title
                      </Button>
                    </div>
                  )}

                  {/* Generic error (non-duplicate) with Retry button */}
                  {entry.analysisStatus === "error" && (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-amber-600">{entry.analysisMessage || "Analysis unavailable — admin review required."}</span>
                      <Button size="sm" variant="outline" className="h-6 text-[11px] px-2 gap-1" onClick={() => analyzeAgain(entry.id)}>
                        <RefreshCw className="h-3 w-3" /> Analyze manually
                      </Button>
                    </div>
                  )}
                  {entry.status === "error" && !entry.isDuplicate && entry.error && entry.analysisStatus !== "error" && (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-destructive">{entry.error}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] px-2 gap-1"
                        onClick={() => {
                          updateEntry(entry.id, { status: "pending", error: undefined })
                        }}
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </Button>
                    </div>
                  )}

                  {(entry.status === "uploading" || entry.status === "checking") && (
                    <Progress value={entry.status === "checking" ? 5 : entry.progress} className="h-2 mt-2" />
                  )}
                </div>

                {/* Structure Location Selector */}
                {entry.status === "pending" && (
                  <StructureSelector
                    value={entry.structureLocation}
                    onChange={(location) => updateEntry(entry.id, { structureLocation: location })}
                    placeholder="Select location"
                    className="w-auto max-w-[200px] sm:max-w-[280px]"
                  />
                )}

                {/* Actions */}
                {entry.status === "pending" && entry.analysisStatus !== "analyzing" && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-9 w-9 hover:bg-blue-500/10 hover:text-blue-600"
                      title="Replace file"
                       aria-label={`Replace file for ${entry.title}`}
                      onClick={(e) => { e.stopPropagation(); triggerReplaceFile(entry.id) }}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10"
                      aria-label={`Toggle advanced options for ${entry.title}`}
                      onClick={() => updateEntry(entry.id, { showAdvanced: !entry.showAdvanced })}>
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${entry.title}`}
                      onClick={() => removeEntry(entry.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {(entry.analysisStatus === "analyzing" || entry.status === "checking" || entry.status === "uploading") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                    aria-label={`Cancel processing ${entry.title}`}
                    onClick={() => cancelEntry(entry.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                )}
                {(entry.status === "error") && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button" variant="ghost" size="icon"
                      className="h-9 w-9 hover:bg-blue-500/10 hover:text-blue-600"
                      title="Replace file"
                       aria-label={`Replace file for ${entry.title}`}
                      onClick={(e) => { e.stopPropagation(); triggerReplaceFile(entry.id) }}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive shrink-0"
                      aria-label={`Remove ${entry.title}`}
                      onClick={() => removeEntry(entry.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Advanced Options */}
              {entry.showAdvanced && entry.status === "pending" && (
                <div className="border-t border-border/50 p-4 space-y-4 bg-muted/20">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" /> Description
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1.5 text-violet-600 border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                        onClick={() => generateAiSummary(entry.id)}
                        disabled={aiLoadingIds.has(entry.id) || !entry.title.trim()}
                      >
                        {aiLoadingIds.has(entry.id) ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="h-3 w-3" /> AI Summary</>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                      placeholder="Add a description for this PDF (optional)..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" /> Tags
                    </Label>
                    <div className="flex flex-wrap gap-2 min-h-[36px] p-2 rounded-lg border border-border bg-background">
                      {entry.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                          onClick={() => removeEntryTag(entry.id, tag)}>
                          #{tag}<X className="h-3 w-3" />
                        </Badge>
                      ))}
                      <Input
                        placeholder="Add tag..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault()
                            addEntryTag(entry.id, e.currentTarget.value)
                            e.currentTarget.value = ""
                          }
                        }}
                        className="flex-1 min-w-[100px] border-0 shadow-none h-6 px-1 focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" /> Visibility
                      </Label>
                      <Select value={entry.visibility} onValueChange={(v) => updateEntry(entry.id, { visibility: v as VisibilityType })}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {visibilityOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-2">{opt.icon} {opt.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" /> Schedule Publish
                      </Label>
                      <Input
                        type="datetime-local"
                        value={entry.scheduledAt || ""}
                        onChange={(e) => updateEntry(entry.id, { scheduledAt: e.target.value || null })}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" /> Custom URL Slug
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">/pdf/</span>
                        <Input
                          value={entry.customSlug}
                          onChange={(e) => updateEntry(entry.id, { customSlug: slugify(e.target.value) })}
                          placeholder="custom-url-slug"
                          className="h-10 flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" /> Download
                      </Label>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Allow Download</span>
                        </div>
                        <Switch checked={entry.allowDownload} onCheckedChange={(checked) => updateEntry(entry.id, { allowDownload: checked })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          </div>
        </div>
      )}

      {/* Upload Summary & Button */}
      {entries.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <FileCheck className="h-3 w-3" /> {pendingCount} pending
            </Badge>
            {entries.filter(e => e.status === "uploading").length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {entries.filter(e => e.status === "uploading").length} uploading
              </Badge>
            )}
            {analyzingCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {analyzingCount} analyzing
              </Badge>
            )}
            {entries.filter(e => e.status === "done").length > 0 && (
              <Badge className="gap-1 bg-green-500">
                <CheckCircle className="h-3 w-3" />
                {entries.filter(e => e.status === "done").length} done
              </Badge>
            )}
            {entries.filter(e => e.status === "error" && e.isDuplicate).length > 0 && (
              <Badge variant="outline" className="gap-1 border-amber-400 text-amber-600">
                <AlertCircle className="h-3 w-3" />
                {entries.filter(e => e.status === "error" && e.isDuplicate).length} duplicate
              </Badge>
            )}
            {entries.filter(e => e.status === "error" && !e.isDuplicate).length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {entries.filter(e => e.status === "error" && !e.isDuplicate).length} failed
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleUploadAll}
              className="h-12 flex-1 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
              disabled={isUploading || uploadReadyCount === 0}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading up to {MAX_PARALLEL_UPLOADS} files in parallel...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {uploadReadyCount > 0 ? `Upload ${uploadReadyCount} file${uploadReadyCount !== 1 ? "s" : ""}` : "Waiting for valid analysis"}
                </span>
              )}
            </Button>
            {inFlightCount > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-12 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={cancelAllProcessing}
              >
                <X className="h-4 w-4" />
                Cancel All ({inFlightCount})
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
