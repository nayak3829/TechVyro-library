"use client"

import { useState, useRef } from "react"
import { Upload, FileText, X, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import type { Category } from "@/lib/types"

interface FileEntry {
  id: string
  file: File
  title: string
  categoryId: string
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

interface PDFUploadFormProps {
  categories: Category[]
  onSuccess: () => void
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

function titleFromFilename(name: string) {
  return name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").trim()
}

export function PDFUploadForm({ categories, onSuccess }: PDFUploadFormProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [globalCategory, setGlobalCategory] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | File[]) {
    const pdfs = Array.from(files).filter((f) => f.type === "application/pdf")
    if (pdfs.length === 0) {
      toast.error("Only PDF files are allowed")
      return
    }
    const newEntries: FileEntry[] = pdfs.map((file) => ({
      id: generateId(),
      file,
      title: titleFromFilename(file.name),
      categoryId: globalCategory,
      status: "pending",
    }))
    setEntries((prev) => [...prev, ...newEntries])
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      addFiles(e.target.files)
      e.target.value = ""
    }
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  function updateEntry(id: string, patch: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  // Apply global category to all pending entries
  function applyGlobalCategory(cat: string) {
    setGlobalCategory(cat)
    setEntries((prev) =>
      prev.map((e) => (e.status === "pending" ? { ...e, categoryId: cat } : e))
    )
  }

  async function uploadEntry(entry: FileEntry): Promise<boolean> {
    updateEntry(entry.id, { status: "uploading" })
    try {
      const token = sessionStorage.getItem("admin_token")
      const formData = new FormData()
      formData.append("file", entry.file)
      formData.append("title", entry.title.trim() || titleFromFilename(entry.file.name))
      if (entry.categoryId) formData.append("categoryId", entry.categoryId)

      const res = await fetch("/api/pdfs/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      
      // Handle non-JSON responses (like "Request Entity Too Large")
      const contentType = res.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text()
        throw new Error(text || `Upload failed with status ${res.status}`)
      }
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      updateEntry(entry.id, { status: "done" })
      return true
    } catch (err) {
      let errorMsg = "Upload failed"
      if (err instanceof Error) {
        // Handle common error messages
        if (err.message.includes("Request Entity Too Large") || err.message.includes("413")) {
          errorMsg = "File too large - try reducing file size"
        } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          errorMsg = "Network error - check your connection"
        } else {
          errorMsg = err.message
        }
      }
      updateEntry(entry.id, {
        status: "error",
        error: errorMsg,
      })
      return false
    }
  }

  async function handleUploadAll() {
    const pending = entries.filter((e) => e.status === "pending")
    if (pending.length === 0) {
      toast.error("No files to upload")
      return
    }
    setIsUploading(true)
    let successCount = 0
    for (const entry of pending) {
      const ok = await uploadEntry(entry)
      if (ok) successCount++
    }
    setIsUploading(false)
    if (successCount > 0) {
      toast.success(`${successCount} PDF${successCount > 1 ? "s" : ""} uploaded successfully!`)
      onSuccess()
    }
    const failed = entries.filter((e) => e.status === "error")
    if (failed.length > 0) {
      toast.error(`${failed.length} file${failed.length > 1 ? "s" : ""} failed to upload`)
    }
    // Remove successfully uploaded files after a short delay
    setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.status !== "done"))
    }, 1500)
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
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
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <p className="font-medium text-foreground">Drop PDFs here or click to select</p>
        <p className="text-sm text-muted-foreground mt-1">Multiple files supported — titles are auto-filled from filenames</p>
      </div>

      {/* Global Category */}
      {entries.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Apply category to all:</span>
          <Select value={globalCategory} onValueChange={applyGlobalCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
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
        </div>
      )}

      {/* File List */}
      {entries.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors ${
                entry.status === "done"
                  ? "border-green-500/40 bg-green-500/5"
                  : entry.status === "error"
                  ? "border-destructive/40 bg-destructive/5"
                  : entry.status === "uploading"
                  ? "border-primary/40 bg-primary/5"
                  : "border-border"
              }`}
            >
              {/* Status Icon */}
              <div className="shrink-0">
                {entry.status === "uploading" && (
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                )}
                {entry.status === "done" && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                {entry.status === "error" && (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                {entry.status === "pending" && (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* Title input */}
              <div className="flex-1 min-w-0">
                <Input
                  value={entry.title}
                  onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                  placeholder="PDF title"
                  disabled={entry.status !== "pending"}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {entry.file.name} &middot; {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                  {entry.status === "error" && (
                    <span className="text-destructive ml-1">&mdash; {entry.error}</span>
                  )}
                </p>
              </div>

              {/* Per-file category */}
              <Select
                value={entry.categoryId}
                onValueChange={(v) => updateEntry(entry.id, { categoryId: v })}
                disabled={entry.status !== "pending"}
              >
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Remove */}
              {entry.status === "pending" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  onClick={() => removeEntry(entry.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {entries.length > 0 && (
        <Button
          onClick={handleUploadAll}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          disabled={isUploading || pendingCount === 0}
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </span>
          ) : (
            `Upload ${pendingCount} PDF${pendingCount !== 1 ? "s" : ""}`
          )}
        </Button>
      )}
    </div>
  )
}
