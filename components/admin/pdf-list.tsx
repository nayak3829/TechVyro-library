"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { Trash2, ExternalLink, FileText, Pencil, Check, X, Eye, Loader2, Search, Filter, Download, FolderInput, FileDown, MoreHorizontal, UploadCloud, Globe, Lock, EyeOff, Tag, AlignLeft, RotateCcw, Send, Ban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import type { PDF, Category } from "@/lib/types"
import { StructureSelector } from "@/components/admin/structure-selector"

interface PDFListProps {
  pdfs: PDF[]
  categories: Category[]
  loading: boolean
  onDelete: () => void
  onUpdate: () => void
}

type WorkflowAction = "publish" | "reject" | "retry"

function formatFileSize(bytes: number | null): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return "Unknown"
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(dateString: unknown): string {
  const date = new Date(typeof dateString === "string" ? dateString : "")
  if (Number.isNaN(date.getTime())) return "Unknown date"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (data && typeof data === "object" && "error" in data && typeof data.error === "string") return data.error
  } catch {}
  return fallback
}

function normalizePdfs(data: unknown): PDF[] {
  if (!data || typeof data !== "object" || !Array.isArray((data as { pdfs?: unknown }).pdfs)) return []
  return (data as { pdfs: unknown[] }).pdfs.filter((pdf): pdf is PDF => !!pdf && typeof pdf === "object").map((pdf) => {
    const item = pdf as PDF
    return {
      ...item,
      title: text(item.title, "Untitled PDF"),
      description: text(item.description) || null,
      created_at: text(item.created_at),
      file_size: count(item.file_size) || null,
      view_count: count(item.view_count),
      download_count: count(item.download_count),
      review_count: count(item.review_count),
      average_rating: typeof item.average_rating === "number" && Number.isFinite(item.average_rating) ? item.average_rating : null,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : null,
    }
  })
}

function reconcilePdfs(
  incoming: PDF[],
  mutations: Map<string, { deleted?: boolean; category_id?: string | null; structure_location?: PDF["structure_location"] }>,
): PDF[] {
  const result = incoming
    .filter((pdf) => !mutations.get(pdf.id)?.deleted)
    .map((pdf) => {
      const mutation = mutations.get(pdf.id)
      if (!mutation) return pdf
      return {
        ...pdf,
        ...("category_id" in mutation ? { category_id: mutation.category_id ?? null } : {}),
        ...("structure_location" in mutation ? { structure_location: mutation.structure_location ?? null } : {}),
      }
    })
  // A deleted item can be discarded from the reconciliation map once the
  // server no longer returns it. Move entries are discarded once server state
  // agrees, keeping the map bounded during long admin sessions.
  for (const [id, mutation] of mutations) {
    const current = incoming.find((pdf) => pdf.id === id)
    // Keep deletion tombstones: a delayed parent prop can still contain the
    // old row after the refresh that confirmed its removal.
    const categoryMatches = !("category_id" in mutation) || current?.category_id === mutation.category_id
    const structureMatches = !("structure_location" in mutation)
      || JSON.stringify(current?.structure_location ?? null) === JSON.stringify(mutation.structure_location ?? null)
    if (!mutation.deleted && current && categoryMatches && structureMatches) mutations.delete(id)
  }
  return result
}

interface EditState {
  title: string
  category_id: string
  description: string
  tags: string
  visibility: string
  allow_download: boolean
}

export function PDFList({ pdfs: initialPdfs, categories, loading: initialLoading, onDelete, onUpdate }: PDFListProps) {
  const [internalPdfs, setInternalPdfs] = useState<PDF[]>(() => normalizePdfs({ pdfs: initialPdfs }))
  const [internalLoading, setInternalLoading] = useState(initialLoading)
  const [workflowBusy, setWorkflowBusy] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({
    title: "",
    category_id: "",
    description: "",
    tags: "",
    visibility: "public",
    allow_download: true,
  })
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkMoving, setBulkMoving] = useState(false)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const replaceFileInputRef = useRef<HTMLInputElement>(null)
  const replaceTargetIdRef = useRef<string | null>(null)
  // Keep optimistic admin mutations authoritative until the next listing
  // contains them. This prevents a parent refresh racing the mutation from
  // resurrecting deleted rows or reverting a moved row.
  const localReconciliation = useRef(new Map<string, {
    deleted?: boolean
    category_id?: string | null
    structure_location?: PDF["structure_location"]
  }>())

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "downloads" | "views">("newest")

  // ── Self-fetch PDFs with auto-refresh ──────────────────────────────
  const refreshPdfs = useCallback(async (showError = false) => {
    try {
      const res = await fetch("/api/pdfs", { credentials: "same-origin", cache: "no-store" })
      if (!res.ok) throw new Error(await responseError(res, "Failed to load PDFs"))
      const data: unknown = await res.json()
      setInternalPdfs(reconcilePdfs(normalizePdfs(data), localReconciliation.current))
      setFetchError(null)
    } catch (error) {
      if (showError) setFetchError(error instanceof Error ? error.message : "Failed to load PDFs")
    }
  }, [])

  useEffect(() => {
    let mounted = true
    async function initialFetch() {
      setInternalLoading(true)
      try {
        const res = await fetch("/api/pdfs", { credentials: "same-origin", cache: "no-store" })
        if (!res.ok) throw new Error(await responseError(res, "Failed to load PDFs"))
        const data: unknown = await res.json()
        if (mounted) {
          setInternalPdfs(reconcilePdfs(normalizePdfs(data), localReconciliation.current))
          setFetchError(null)
        }
      } catch (error) {
        if (mounted) setFetchError(error instanceof Error ? error.message : "Failed to load PDFs")
      } finally {
        if (mounted) setInternalLoading(false)
      }
    }
    initialFetch()
    const interval = setInterval(refreshPdfs, 2 * 60 * 1000)
    return () => { mounted = false; clearInterval(interval) }
  }, [refreshPdfs])

  // Sync when parent forces a refresh
  useEffect(() => {
    if (!initialLoading) setInternalPdfs(reconcilePdfs(normalizePdfs({ pdfs: initialPdfs }), localReconciliation.current))
  }, [initialPdfs, initialLoading])

  const pdfs = internalPdfs
  const loading = internalLoading

  // Filter and sort PDFs
  const filteredPdfs = useMemo(() => {
    let result = [...pdfs]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(pdf => 
        text(pdf.title).toLowerCase().includes(query) ||
        text(pdf.description).toLowerCase().includes(query)
      )
    }

    // Category filter
    if (filterCategory !== "all") {
      if (filterCategory === "uncategorized") {
        result = result.filter(pdf => !pdf.category_id)
      } else {
        result = result.filter(pdf => pdf.category_id === filterCategory)
      }
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => (new Date(text(b.created_at)).getTime() || 0) - (new Date(text(a.created_at)).getTime() || 0))
        break
      case "oldest":
        result.sort((a, b) => (new Date(text(a.created_at)).getTime() || 0) - (new Date(text(b.created_at)).getTime() || 0))
        break
      case "name":
        result.sort((a, b) => text(a.title).localeCompare(text(b.title)))
        break
      case "downloads":
        result.sort((a, b) => count(b.download_count) - count(a.download_count))
        break
      case "views":
        result.sort((a, b) => count(b.view_count) - count(a.view_count))
        break
    }

    return result
  }, [pdfs, searchQuery, filterCategory, sortBy])

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredPdfs.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredPdfs.map((p) => p.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} PDF${selectedIds.size > 1 ? "s" : ""}?`)) return

    setBulkDeleting(true)
    try {
      const response = await fetch("/api/pdfs/bulk-delete", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      if (!response.ok) {
        throw new Error(await responseError(response, "Failed to delete PDFs"))
      }

      const data = await response.json()
      const deleted = count(data?.deleted)
      const requested = selectedIds.size
      if (data?.warning) toast.warning(data.warning)
      else toast.success(`${deleted} PDF${deleted === 1 ? "" : "s"} deleted successfully!`)
      if (deleted > 0) {
        for (const id of selectedIds) localReconciliation.current.set(id, { deleted: true })
        setInternalPdfs((prev) => prev.filter((pdf) => !selectedIds.has(pdf.id)))
      }
      if (deleted > 0 && deleted === requested) setSelectedIds(new Set())
      onDelete()
      refreshPdfs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete PDFs")
    } finally {
      setBulkDeleting(false)
    }
  }

  async function handleBulkMove(categoryId: string | null) {
    if (selectedIds.size === 0) return

    setBulkMoving(true)
    try {
      const response = await fetch("/api/pdfs/bulk-move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ ids: Array.from(selectedIds), category_id: categoryId }),
      })

      if (!response.ok) {
        throw new Error(await responseError(response, "Failed to move PDFs"))
      }

      const data = await response.json()
      const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name : "Uncategorized"
      const updated = count(data?.updated)
      toast.success(`${updated} PDF${updated === 1 ? "" : "s"} moved to ${categoryName}!`)
      if (updated > 0 && updated === selectedIds.size) {
        for (const id of selectedIds) localReconciliation.current.set(id, { category_id: categoryId })
        setInternalPdfs((prev) => prev.map((pdf) => selectedIds.has(pdf.id) ? { ...pdf, category_id: categoryId ?? null } : pdf))
        setSelectedIds(new Set())
      }
      onUpdate()
      refreshPdfs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move PDFs")
    } finally {
      setBulkMoving(false)
    }
  }

  async function handleBulkStructureMove(location: { folderId: string; categoryId: string; sectionId: string }) {
    if (selectedIds.size === 0) return
    const structureLocation = location.sectionId ? location : null
    setBulkMoving(true)
    try {
      const response = await fetch("/api/pdfs/bulk-move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ids: Array.from(selectedIds), structure_location: structureLocation }),
      })
      if (!response.ok) throw new Error(await responseError(response, "Failed to move PDFs"))
      const data = await response.json()
      const updated = count(data?.updated)
      toast.success(`${updated} PDF${updated === 1 ? "" : "s"} moved in Content Structure`)
      if (updated > 0 && updated === selectedIds.size) {
        for (const id of selectedIds) localReconciliation.current.set(id, { structure_location: structureLocation })
        setInternalPdfs((prev) => prev.map((pdf) =>
          selectedIds.has(pdf.id) ? { ...pdf, structure_location: structureLocation } : pdf
        ))
        setSelectedIds(new Set())
      }
      onUpdate()
      refreshPdfs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move PDFs")
    } finally {
      setBulkMoving(false)
    }
  }

  function handleExportCSV() {
    const csvData = filteredPdfs.map(pdf => ({
      Title: pdf.title,
      Category: categories.find(c => c.id === pdf.category_id)?.name || "Uncategorized",
      Views: pdf.view_count || 0,
      Downloads: pdf.download_count,
      "File Size": formatFileSize(pdf.file_size),
      "Created At": formatDate(pdf.created_at),
      Rating: pdf.average_rating?.toFixed(1) || "N/A",
      Reviews: pdf.review_count || 0,
    }))

    const headers = Object.keys(csvData[0] || {}).join(",")
    const rows = csvData.map(row => Object.values(row).map(v => `"${v}"`).join(",")).join("\n")
    const csv = `${headers}\n${rows}`

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `techvyro-pdfs-export-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("PDF data exported to CSV!")
  }

  function handleExportJSON() {
    const jsonData = filteredPdfs.map(pdf => ({
      id: pdf.id,
      title: pdf.title,
      description: pdf.description,
      category: categories.find(c => c.id === pdf.category_id)?.name || null,
      views: pdf.view_count || 0,
      downloads: pdf.download_count,
      file_size: pdf.file_size,
      average_rating: pdf.average_rating,
      review_count: pdf.review_count,
      created_at: pdf.created_at,
    }))

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `techvyro-pdfs-export-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("PDF data exported to JSON!")
  }

  function startEdit(pdf: PDF) {
    setEditingId(pdf.id)
    setEditState({
      title: pdf.title,
      category_id: pdf.category_id || "none",
      description: pdf.description || "",
      tags: Array.isArray(pdf.tags) ? pdf.tags.join(", ") : "",
      visibility: pdf.visibility || "public",
      allow_download: pdf.allow_download !== false,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState({ title: "", category_id: "", description: "", tags: "", visibility: "public", allow_download: true })
  }

  async function quickToggleVisibility(pdf: PDF) {
    const next = pdf.visibility === "public" ? "private" : pdf.visibility === "private" ? "unlisted" : "public"
    try {
      const response = await fetch(`/api/pdfs/${pdf.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      })
      if (!response.ok) throw new Error(await responseError(response, "Failed to update visibility"))
      setInternalPdfs(prev => prev.map(p => p.id === pdf.id ? { ...p, visibility: next as PDF["visibility"] } : p))
      toast.success(`Visibility set to "${next}"`)
    } catch {
      toast.error("Failed to update visibility")
    }
  }

  async function saveEdit(id: string) {
    if (!editState.title.trim()) {
      toast.error("Title cannot be empty")
      return
    }

    setSaving(true)
    try {
      const tagsArray = editState.tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)

      const response = await fetch(`/api/pdfs/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editState.title.trim(),
          category_id: editState.category_id === "none" ? null : editState.category_id,
          description: editState.description.trim() || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          visibility: editState.visibility,
          allow_download: editState.allow_download,
        }),
      })

      if (!response.ok) {
        throw new Error(await responseError(response, "Failed to update PDF"))
      }

      toast.success("PDF updated!")
      setEditingId(null)
      onUpdate()
      refreshPdfs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update PDF")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    try {
      const response = await fetch(`/api/pdfs/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      })

      if (!response.ok) {
        throw new Error(await responseError(response, "Failed to delete PDF"))
      }

      const data = await response.json().catch(() => ({}))
      if (data?.warning) toast.warning(data.warning)
      else toast.success("PDF deleted successfully!")
      localReconciliation.current.set(id, { deleted: true })
      setInternalPdfs((prev) => prev.filter((pdf) => pdf.id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      onDelete()
      refreshPdfs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete PDF")
    }
  }

  async function workflowAction(pdf: PDF, action: WorkflowAction) {
    const warningCount = Array.isArray((pdf as PDF & { review_warnings?: unknown[] }).review_warnings)
      ? (pdf as PDF & { review_warnings?: unknown[] }).review_warnings?.length || 0 : 0
    if (action === "publish" && warningCount > 0 && !confirm(`This PDF has ${warningCount} review warning${warningCount === 1 ? "" : "s"}. Publish anyway?`)) return
    setWorkflowBusy(pdf.id)
    try {
      const response = await fetch(`/api/pdfs/${pdf.id}/publish`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, acknowledgeWarnings: action === "publish" }),
      })
      if (!response.ok) throw new Error(await responseError(response, `Failed to ${action} PDF`))
      toast.success(action === "publish" ? "PDF published" : action === "reject" ? "PDF sent back for revision" : "Processing restarted")
      onUpdate(); refreshPdfs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} PDF`)
    } finally { setWorkflowBusy(null) }
  }

  function triggerReplaceFile(pdfId: string) {
    replaceTargetIdRef.current = pdfId
    replaceFileInputRef.current?.click()
  }

  async function handleReplaceFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const targetId = replaceTargetIdRef.current
    replaceTargetIdRef.current = null
    e.target.value = ""

    if (!file || !targetId) return

    const MAX_FILE_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) { toast.error("File too large (max 50MB)"); return }
    if (file.type !== "application/pdf" && file.type !== "text/html" && !file.name.match(/\.(pdf|html?)$/i)) {
      toast.error("Only PDF or HTML files are allowed"); return
    }

    setReplacingId(targetId)
    const toastId = toast.loading("Replacing file...")

    try {
      // Step 1: Get signed upload URL
      const urlRes = await fetch("/api/pdfs/get-upload-url", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/pdf",
        }),
      })
      if (!urlRes.ok) throw new Error(await responseError(urlRes, "Failed to get upload URL"))
      const uploadData: unknown = await urlRes.json()
      const signedUrl = uploadData && typeof uploadData === "object" && "signedUrl" in uploadData
        ? uploadData.signedUrl
        : null
      const filePath = uploadData && typeof uploadData === "object" && "filePath" in uploadData
        ? uploadData.filePath
        : null
      if (typeof signedUrl !== "string" || !signedUrl || typeof filePath !== "string" || !filePath) {
        throw new Error("Upload service returned an invalid replacement destination")
      }

      // Step 2: Upload file via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.addEventListener("load", () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")))
        xhr.addEventListener("error", () => reject(new Error("Network error")))
        xhr.open("PUT", signedUrl)
        xhr.setRequestHeader("Content-Type", file.type || "application/pdf")
        xhr.send(file)
      })

      // Step 3: Point the DB at the new object. The route removes the old object
      // only after this succeeds, and removes the replacement if the update fails.
      const patchRes = await fetch(`/api/pdfs/${targetId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath, file_size: file.size }),
      })
      if (!patchRes.ok) throw new Error(await responseError(patchRes, "Failed to update PDF record"))
      const patchData: unknown = await patchRes.json()

      toast.dismiss(toastId)
      const cleanupWarning = patchData && typeof patchData === "object" && "warning" in patchData && typeof patchData.warning === "string"
        ? patchData.warning
        : null
      if (cleanupWarning) toast.warning(cleanupWarning)
      else toast.success("File replaced successfully!")
      onUpdate()
      refreshPdfs()
    } catch (error) {
      toast.dismiss(toastId)
      toast.error(error instanceof Error ? error.message : "Failed to replace file")
    } finally {
      setReplacingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border/50">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (fetchError && pdfs.length === 0) {
    return (
      <Empty
        icon={FileText}
        title="Unable to load PDFs"
        description={fetchError}
      >
        <Button onClick={() => { setInternalLoading(true); refreshPdfs(true).finally(() => setInternalLoading(false)) }}>Retry</Button>
      </Empty>
    )
  }

  if (pdfs.length === 0) {
    return (
      <Empty
        icon={FileText}
        title="No PDFs uploaded"
        description="Upload your first PDF using the Import Files tab"
      />
    )
  }

  const allSelected = selectedIds.size === filteredPdfs.length && filteredPdfs.length > 0

  return (
    <div className="space-y-5">
      {/* Hidden file input for file replacement */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf,.html,.htm,application/pdf,text/html"
        className="hidden"
        onChange={handleReplaceFileChange}
      />

      {/* Search and Filter Bar - Enhanced */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="relative flex-1 group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-focus-within:bg-primary/20 transition-colors">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <Input
            aria-label="Search PDFs"
            placeholder="Search PDFs by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-11"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger aria-label="Filter PDFs by category" className="w-[160px] h-11">
              <Filter className="h-4 w-4 mr-2 text-accent" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger aria-label="Sort PDFs" className="w-[140px] h-11">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="downloads">Most Downloads</SelectItem>
              <SelectItem value="views">Most Views</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count - Enhanced */}
      {(searchQuery || filterCategory !== "all") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <span className="font-medium text-foreground">{filteredPdfs.length}</span>
          <span>of {pdfs.length} PDFs</span>
          {searchQuery && <span className="text-primary">matching "{searchQuery}"</span>}
        </div>
      )}

      {/* Bulk Actions Bar - Enhanced */}
      <div className={`flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl border transition-all duration-300 ${
        selectedIds.size > 0 
          ? "bg-primary/5 border-primary/30" 
          : "bg-muted/30 border-border/50"
      }`}>
        <div className="flex items-center gap-4">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all PDFs"
            className="h-5 w-5"
          />
          <div>
            <span className="text-sm font-medium text-foreground">
              {selectedIds.size > 0 
                ? `${selectedIds.size} PDFs selected` 
                : `${filteredPdfs.length} PDFs total`}
            </span>
            {selectedIds.size > 0 && (
              <p className="text-xs text-muted-foreground">Use actions below to manage selected PDFs</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Export dropdown - always visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" aria-label="Export PDFs">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileDown className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>
                <FileDown className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedIds.size > 0 && (
            <>
              <StructureSelector
                onChange={handleBulkStructureMove}
                placeholder="Move in Content Structure"
                className="w-[220px]"
              />
              {/* Move to category dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={bulkMoving} aria-label="Move selected PDFs to a category">
                    {bulkMoving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FolderInput className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Move to</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkMove(null)}>
                    <span className="text-muted-foreground">Uncategorized</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {categories.map((cat) => (
                    <DropdownMenuItem key={cat.id} onClick={() => handleBulkMove(cat.id)}>
                      <span className="h-2.5 w-2.5 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                      {cat.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Delete button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="gap-2"
                aria-label={`Delete ${selectedIds.size} selected PDFs`}
              >
                {bulkDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF List - Enhanced */}
      {filteredPdfs.length === 0 ? (
        <Empty
          icon={Search}
          title="No results found"
          description="Try adjusting your search or filters"
        />
      ) : (
        <div className="space-y-3">
          {filteredPdfs.map((pdf) => {
            const category = categories.find((c) => c.id === pdf.category_id)
            const isEditing = editingId === pdf.id

            return (
              <div
                key={pdf.id}
                className={`flex items-center gap-3 sm:gap-4 p-4 rounded-xl border bg-card transition-all duration-200 ${
                  selectedIds.has(pdf.id) 
                    ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10" 
                    : "border-border/50 hover:border-primary/30 hover:shadow-sm"
                }`}
              >
                <Checkbox
                  checked={selectedIds.has(pdf.id)}
                  onCheckedChange={() => toggleSelection(pdf.id)}
                  aria-label={`Select ${pdf.title}`}
                  className="shrink-0 h-5 w-5"
                />
                <div className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  selectedIds.has(pdf.id) 
                    ? "bg-primary/20" 
                    : "bg-gradient-to-br from-primary/10 to-accent/10"
                }`}>
                  <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        aria-label="PDF title"
                        value={editState.title}
                        onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Escape") cancelEdit() }}
                        className="h-8 text-sm font-medium"
                        placeholder="PDF title"
                        autoFocus
                        disabled={saving}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={editState.category_id} onValueChange={(v) => setEditState((s) => ({ ...s, category_id: v }))} disabled={saving}>
                           <SelectTrigger aria-label="Edit category" className="h-7 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No category</SelectItem>
                            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={editState.visibility} onValueChange={(v) => setEditState((s) => ({ ...s, visibility: v }))} disabled={saving}>
                           <SelectTrigger aria-label="Edit visibility" className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="unlisted">Unlisted</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        aria-label="PDF description"
                        value={editState.description}
                        onChange={(e) => setEditState((s) => ({ ...s, description: e.target.value }))}
                        className="text-xs min-h-[56px] resize-none"
                        placeholder="Description (optional)"
                        disabled={saving}
                      />
                      <Input
                        aria-label="PDF tags"
                        value={editState.tags}
                        onChange={(e) => setEditState((s) => ({ ...s, tags: e.target.value }))}
                        className="h-7 text-xs"
                        placeholder="Tags: nda, cds, math (comma-separated)"
                        disabled={saving}
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editState.allow_download}
                          onChange={(e) => setEditState((s) => ({ ...s, allow_download: e.target.checked }))}
                          disabled={saving}
                          className="rounded"
                        />
                        Allow download
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate text-sm sm:text-base">{pdf.title}</h3>
                        {category && (
                          <Badge className="text-[10px] sm:text-xs shrink-0" style={{ backgroundColor: category.color, color: "#fff" }}>
                            {category.name}
                          </Badge>
                        )}
                        {pdf.visibility && pdf.visibility !== "public" && (
                          <button
                            onClick={() => quickToggleVisibility(pdf)}
                            title={`Visibility: ${pdf.visibility} — click to toggle`}
                            aria-label={`Visibility: ${pdf.visibility}. Toggle visibility`}
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors hover:opacity-80"
                            style={pdf.visibility === "private" ? { borderColor: "rgb(239 68 68 / 0.4)", color: "rgb(220 38 38)", background: "rgb(254 242 242)" } : { borderColor: "rgb(245 158 11 / 0.4)", color: "rgb(217 119 6)", background: "rgb(255 251 235)" }}
                          >
                            {pdf.visibility === "private" ? <Lock className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                            {pdf.visibility}
                          </button>
                        )}
                        {Array.isArray(pdf.tags) && pdf.tags.length > 0 && (
                          <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Tag className="h-2.5 w-2.5" />
                            {pdf.tags.slice(0, 2).join(", ")}{pdf.tags.length > 2 ? `+${pdf.tags.length - 2}` : ""}
                          </span>
                        )}
                        {(() => {
                          const item = pdf as PDF & { publish_status?: string; processing_status?: string; review_warnings?: unknown[] }
                          const publishStatus = item.publish_status || "draft"
                          const processingStatus = item.processing_status
                          const warningCount = Array.isArray(item.review_warnings) ? item.review_warnings.length : 0
                          return (
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className={`text-[10px] ${publishStatus === "published" ? "border-emerald-500/50 text-emerald-700" : publishStatus === "rejected" ? "border-rose-500/50 text-rose-700" : "border-amber-500/50 text-amber-700"}`}>
                                {publishStatus}
                              </Badge>
                              {processingStatus && processingStatus !== "complete" && <Badge variant="secondary" className="text-[10px]">{processingStatus}</Badge>}
                              {warningCount > 0 && <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700">{warningCount} warning{warningCount === 1 ? "" : "s"}</Badge>}
                            </div>
                          )
                        })()}
                      </div>
                      {pdf.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-md">
                          <AlignLeft className="h-2.5 w-2.5 inline mr-1" />{pdf.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap mt-0.5">
                        <span>{formatFileSize(pdf.file_size)}</span>
                        <span className="hidden sm:inline">|</span>
                        <span className="hidden sm:inline">{formatDate(pdf.created_at)}</span>
                        <span>|</span>
                        <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{pdf.view_count || 0}</span>
                        <span>|</span>
                        <span className="inline-flex items-center gap-1"><Download className="h-3 w-3" />{pdf.download_count}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8"
                        onClick={() => saveEdit(pdf.id)}
                        aria-label="Save PDF changes"
                        disabled={saving}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-8 w-8"
                        onClick={cancelEdit}
                        aria-label="Cancel PDF editing"
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const item = pdf as PDF & { publish_status?: string; processing_status?: string }
                        const busy = workflowBusy === pdf.id
                        return (
                          <div className="hidden md:flex items-center gap-1 mr-1">
                            {item.processing_status === "failed" && <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" disabled={busy} onClick={() => workflowAction(pdf, "retry")}><RotateCcw className="h-3 w-3" /> Retry</Button>}
                            {item.publish_status !== "published" && item.processing_status !== "failed" && <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 text-emerald-700" disabled={busy} onClick={() => workflowAction(pdf, "publish")}><Send className="h-3 w-3" /> Publish</Button>}
                            {item.publish_status !== "rejected" && <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1 text-rose-700" disabled={busy} onClick={() => workflowAction(pdf, "reject")}><Ban className="h-3 w-3" /> Reject</Button>}
                          </div>
                        )
                      })()}
                      <Button variant="ghost" size="icon" onClick={() => startEdit(pdf)} aria-label="Edit PDF" className="h-8 w-8" title="Edit title & category">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600"
                        title="Replace file"
                        aria-label="Replace PDF file"
                        disabled={replacingId === pdf.id}
                        onClick={() => triggerReplaceFile(pdf.id)}
                      >
                        {replacingId === pdf.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <UploadCloud className="h-4 w-4" />
                        }
                      </Button>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <a href={`/pdf/${pdf.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${text(pdf.title, "PDF")} in a new tab`}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => handleDelete(pdf.id, pdf.title)}
                        aria-label={`Delete ${text(pdf.title, "PDF")}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
