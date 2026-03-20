"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, FileText, X, CheckCircle, Loader2, AlertCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import type { Category } from "@/lib/types"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
const MAX_PARALLEL_UPLOADS = 5 // Maximum concurrent uploads

interface FileEntry {
  id: string
  file: File
  title: string
  categoryId: string
  status: "pending" | "uploading" | "done" | "error"
  progress: number
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
    const allFiles = Array.from(files)
    const pdfs = allFiles.filter((f) => f.type === "application/pdf")
    
    if (pdfs.length === 0) {
      toast.error("Only PDF files are allowed")
      return
    }

    // Check for oversized files
    const oversizedFiles = pdfs.filter(f => f.size > MAX_FILE_SIZE)
    const validFiles = pdfs.filter(f => f.size <= MAX_FILE_SIZE)

    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map(f => f.name).join(", ")
      toast.error(`Files exceeding 50MB limit: ${names}`, {
        description: "Please compress or split these files before uploading.",
        duration: 5000,
      })
    }

    if (validFiles.length === 0) return

    const newEntries: FileEntry[] = validFiles.map((file) => ({
      id: generateId(),
      file,
      title: titleFromFilename(file.name),
      categoryId: globalCategory,
      status: "pending",
      progress: 0,
    }))
    setEntries((prev) => [...prev, ...newEntries])

    if (validFiles.length > 0 && oversizedFiles.length > 0) {
      toast.info(`Added ${validFiles.length} file(s). ${oversizedFiles.length} file(s) skipped (over 50MB).`)
    }
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

  const uploadEntry = useCallback(async (entry: FileEntry): Promise<boolean> => {
    updateEntry(entry.id, { status: "uploading", progress: 0 })
    try {
      const token = sessionStorage.getItem("admin_token")
      const title = entry.title.trim() || titleFromFilename(entry.file.name)

      // Step 1: Get signed upload URL from our API
      updateEntry(entry.id, { progress: 10 })
      const urlRes = await fetch("/api/pdfs/get-upload-url", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          filename: entry.file.name,
          contentType: "application/pdf"
        }),
      })
      
      if (!urlRes.ok) {
        const urlData = await urlRes.json().catch(() => ({}))
        throw new Error(urlData.error || "Failed to get upload URL")
      }
      
      const { signedUrl, filePath } = await urlRes.json()
      updateEntry(entry.id, { progress: 20 })

      // Step 2: Upload file directly to Supabase Storage with XMLHttpRequest for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            // Map upload progress from 20% to 80%
            const uploadProgress = 20 + Math.round((event.loaded / event.total) * 60)
            updateEntry(entry.id, { progress: uploadProgress })
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error("Failed to upload file to storage"))
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"))
        })

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was cancelled"))
        })

        xhr.open("PUT", signedUrl)
        xhr.setRequestHeader("Content-Type", "application/pdf")
        xhr.send(entry.file)
      })

      updateEntry(entry.id, { progress: 85 })

      // Step 3: Save metadata to database
      const metaRes = await fetch("/api/pdfs/save-metadata", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          filePath,
          fileSize: entry.file.size,
          categoryId: entry.categoryId || null,
        }),
      })

      if (!metaRes.ok) {
        const metaData = await metaRes.json().catch(() => ({}))
        throw new Error(metaData.error || "Failed to save PDF metadata")
      }

      updateEntry(entry.id, { status: "done", progress: 100 })
      return true
    } catch (err) {
      let errorMsg = "Upload failed"
      if (err instanceof Error) {
        if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
          errorMsg = "Network error - check your connection"
        } else {
          errorMsg = err.message
        }
      }
      updateEntry(entry.id, {
        status: "error",
        progress: 0,
        error: errorMsg,
      })
      return false
    }
  }, [])

  async function handleUploadAll() {
    const pending = entries.filter((e) => e.status === "pending")
    if (pending.length === 0) {
      toast.error("No files to upload")
      return
    }
    setIsUploading(true)
    
    // Parallel upload with concurrency limit
    let successCount = 0
    const results: boolean[] = []
    
    // Process in batches for parallel upload
    for (let i = 0; i < pending.length; i += MAX_PARALLEL_UPLOADS) {
      const batch = pending.slice(i, i + MAX_PARALLEL_UPLOADS)
      const batchResults = await Promise.all(batch.map(entry => uploadEntry(entry)))
      results.push(...batchResults)
      successCount += batchResults.filter(Boolean).length
    }
    
    setIsUploading(false)
    
    if (successCount > 0) {
      toast.success(`${successCount} PDF${successCount > 1 ? "s" : ""} uploaded successfully!`)
      onSuccess()
    }
    
    const failedCount = results.filter(r => !r).length
    if (failedCount > 0) {
      toast.error(`${failedCount} file${failedCount > 1 ? "s" : ""} failed to upload`)
    }
    
    // Remove successfully uploaded files after a short delay
    setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.status !== "done"))
    }, 2000)
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
        <p className="text-sm text-muted-foreground mt-1">Multiple files supported (max 50MB each) - parallel upload</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-amber-600">Files over 50MB will be rejected</span>
        </div>
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
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground truncate flex-1">
                    {entry.file.name} &middot; {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                    {entry.status === "error" && (
                      <span className="text-destructive ml-1">&mdash; {entry.error}</span>
                    )}
                  </p>
                  {entry.status === "uploading" && (
                    <span className="text-xs font-medium text-primary shrink-0">
                      {entry.progress}%
                    </span>
                  )}
                </div>
                {entry.status === "uploading" && (
                  <Progress value={entry.progress} className="h-1.5 mt-1.5" />
                )}
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
