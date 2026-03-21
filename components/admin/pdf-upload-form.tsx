"use client"

import { useState, useRef, useCallback } from "react"
import { 
  Upload, FileText, X, CheckCircle, Loader2, AlertCircle, AlertTriangle, 
  Zap, Files, FolderPlus, Tag, Eye, EyeOff, Calendar, Clock, Lock, 
  Globe, Link2, FileCheck, Sparkles, ChevronDown, ChevronUp, Settings2,
  ImageIcon, Hash, Download, Shield
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
import type { Category } from "@/lib/types"
import { InlineStructureEditor } from "./inline-structure-editor"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
const MAX_PARALLEL_UPLOADS = 8

type VisibilityType = "public" | "unlisted" | "private"

interface FileEntry {
  id: string
  file: File
  title: string
  description: string
  categoryId: string
  tags: string[]
  visibility: VisibilityType
  scheduledAt: string | null
  allowDownload: boolean
  customSlug: string
  status: "pending" | "uploading" | "done" | "error"
  progress: number
  error?: string
  showAdvanced: boolean
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

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
}

const visibilityOptions: { value: VisibilityType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "public", label: "Public", icon: <Globe className="h-3.5 w-3.5" />, description: "Anyone can view and search" },
  { value: "unlisted", label: "Unlisted", icon: <Link2 className="h-3.5 w-3.5" />, description: "Only with direct link" },
  { value: "private", label: "Private", icon: <Lock className="h-3.5 w-3.5" />, description: "Only admin can view" },
]

export function PDFUploadForm({ categories, onSuccess }: PDFUploadFormProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [globalCategory, setGlobalCategory] = useState<string>("")
  const [globalVisibility, setGlobalVisibility] = useState<VisibilityType>("public")
  const [globalTags, setGlobalTags] = useState<string[]>([])
  const [globalTagInput, setGlobalTagInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)
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

    const newEntries: FileEntry[] = validFiles.map((file) => {
      const title = titleFromFilename(file.name)
      return {
        id: generateId(),
        file,
        title,
        description: "",
        categoryId: globalCategory,
        tags: [...globalTags],
        visibility: globalVisibility,
        scheduledAt: null,
        allowDownload: true,
        customSlug: slugify(title),
        status: "pending",
        progress: 0,
        showAdvanced: false,
      }
    })
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

  // Apply global settings to all pending entries
  function applyGlobalSettings() {
    setEntries((prev) =>
      prev.map((e) => (e.status === "pending" ? { 
        ...e, 
        categoryId: globalCategory || e.categoryId,
        visibility: globalVisibility,
        tags: [...new Set([...e.tags, ...globalTags])],
      } : e))
    )
    toast.success("Global settings applied to all pending files")
  }

  // Handle adding tags
  function addGlobalTag(tag: string) {
    const trimmed = tag.trim().toLowerCase()
    if (trimmed && !globalTags.includes(trimmed)) {
      setGlobalTags([...globalTags, trimmed])
    }
    setGlobalTagInput("")
  }

  function removeGlobalTag(tag: string) {
    setGlobalTags(globalTags.filter(t => t !== tag))
  }

  function addEntryTag(id: string, tag: string) {
    const entry = entries.find(e => e.id === id)
    if (entry) {
      const trimmed = tag.trim().toLowerCase()
      if (trimmed && !entry.tags.includes(trimmed)) {
        updateEntry(id, { tags: [...entry.tags, trimmed] })
      }
    }
  }

  function removeEntryTag(id: string, tag: string) {
    const entry = entries.find(e => e.id === id)
    if (entry) {
      updateEntry(id, { tags: entry.tags.filter(t => t !== tag) })
    }
  }

  const uploadEntry = useCallback(async (entry: FileEntry): Promise<boolean> => {
    updateEntry(entry.id, { status: "uploading", progress: 0 })
    try {
      const token = sessionStorage.getItem("admin_token")
      const title = entry.title.trim() || titleFromFilename(entry.file.name)

      // Step 1: Get signed upload URL
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

      // Step 2: Upload file with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
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

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")))
        xhr.addEventListener("abort", () => reject(new Error("Upload was cancelled")))

        xhr.open("PUT", signedUrl)
        xhr.setRequestHeader("Content-Type", "application/pdf")
        xhr.send(entry.file)
      })

      updateEntry(entry.id, { progress: 85 })

      // Step 3: Save metadata with all advanced options
      const metaRes = await fetch("/api/pdfs/save-metadata", {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description: entry.description,
          filePath,
          fileSize: entry.file.size,
          categoryId: entry.categoryId || null,
          tags: entry.tags,
          visibility: entry.visibility,
          scheduledAt: entry.scheduledAt,
          allowDownload: entry.allowDownload,
          customSlug: entry.customSlug || slugify(title),
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
      updateEntry(entry.id, { status: "error", progress: 0, error: errorMsg })
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
    
    let successCount = 0
    const results: boolean[] = []
    
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
    
    setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.status !== "done"))
    }, 2000)
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length

  return (
    <div className="space-y-5">
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
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="relative">
          <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
            <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <p className="font-semibold text-sm sm:text-lg text-foreground">Drop PDFs here or click to select</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">Multiple files supported (max 50MB each)</p>
          
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-primary bg-primary/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Fast
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-green-600 bg-green-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Files className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Batch
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 bg-blue-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Tags
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-amber-600 bg-amber-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Schedule
            </span>
          </div>
        </div>
      </div>

      {/* Global Settings Panel */}
      {entries.length > 0 && (
        <Collapsible open={showGlobalSettings} onOpenChange={setShowGlobalSettings}>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between p-3 sm:p-4 h-auto hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Settings2 className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground text-xs sm:text-sm">Global Upload Settings</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Apply to all pending files</p>
                  </div>
                </div>
                {showGlobalSettings ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="p-4 pt-0 space-y-4 border-t border-border/50">
                {/* Category & Visibility Row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FolderPlus className="h-4 w-4 text-muted-foreground" />
                      Category
                    </Label>
                    <Select value={globalCategory} onValueChange={setGlobalCategory}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      Visibility
                    </Label>
                    <Select value={globalVisibility} onValueChange={(v) => setGlobalVisibility(v as VisibilityType)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {visibilityOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              {opt.icon}
                              <span>{opt.label}</span>
                              <span className="text-xs text-muted-foreground">- {opt.description}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags Input */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Tags (for search & filtering)
                  </Label>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 rounded-lg border border-border bg-background">
                    {globalTags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                        onClick={() => removeGlobalTag(tag)}
                      >
                        #{tag}
                        <X className="h-3 w-3" />
                      </Badge>
                    ))}
                    <Input
                      value={globalTagInput}
                      onChange={(e) => setGlobalTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault()
                          addGlobalTag(globalTagInput)
                        }
                      }}
                      onBlur={() => addGlobalTag(globalTagInput)}
                      placeholder="Type and press Enter..."
                      className="flex-1 min-w-[120px] border-0 shadow-none h-7 px-1 focus-visible:ring-0"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Press Enter or comma to add tags</p>
                </div>

                <Button 
                  onClick={applyGlobalSettings}
                  className="w-full gap-2"
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4" />
                  Apply to All Pending Files
                </Button>
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
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between p-3 sm:p-4 h-auto hover:bg-muted/50"
              >
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
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border bg-card transition-all duration-300 overflow-hidden ${
                entry.status === "done"
                  ? "border-green-500/50 bg-green-500/5"
                  : entry.status === "error"
                  ? "border-destructive/50 bg-destructive/5"
                  : entry.status === "uploading"
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              {/* Main Row */}
              <div className="flex items-center gap-3 p-3.5">
                {/* Status Icon */}
                <div className="shrink-0">
                  {entry.status === "uploading" && (
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    </div>
                  )}
                  {entry.status === "pending" && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Title and Info */}
                <div className="flex-1 min-w-0">
                  <Input
                    value={entry.title}
                    onChange={(e) => {
                      updateEntry(entry.id, { 
                        title: e.target.value,
                        customSlug: slugify(e.target.value)
                      })
                    }}
                    placeholder="PDF title"
                    disabled={entry.status !== "pending"}
                    className="h-9 text-sm font-medium"
                  />
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.file.name} &middot; {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {entry.tags.length > 0 && (
                      <div className="flex gap-1">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                            #{tag}
                          </Badge>
                        ))}
                        {entry.tags.length > 3 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            +{entry.tags.length - 3}
                          </Badge>
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
                        <Clock className="h-2.5 w-2.5" />
                        Scheduled
                      </Badge>
                    )}
                    {entry.status === "error" && (
                      <span className="text-xs text-destructive">{entry.error}</span>
                    )}
                    {entry.status === "uploading" && (
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {entry.progress}%
                      </span>
                    )}
                  </div>
                  {entry.status === "uploading" && (
                    <Progress value={entry.progress} className="h-2 mt-2" />
                  )}
                </div>

                {/* Category Select */}
                <Select
                  value={entry.categoryId}
                  onValueChange={(v) => updateEntry(entry.id, { categoryId: v })}
                  disabled={entry.status !== "pending"}
                >
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue placeholder="Category" />
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

                {/* Actions */}
                {entry.status === "pending" && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-primary/10"
                      onClick={() => updateEntry(entry.id, { showAdvanced: !entry.showAdvanced })}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeEntry(entry.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Advanced Options (Collapsible) */}
              {entry.showAdvanced && entry.status === "pending" && (
                <div className="border-t border-border/50 p-4 space-y-4 bg-muted/20">
                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Description
                    </Label>
                    <Textarea
                      value={entry.description}
                      onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                      placeholder="Add a description for this PDF (optional)..."
                      className="min-h-[80px] resize-none"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-2 min-h-[36px] p-2 rounded-lg border border-border bg-background">
                      {entry.tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                          onClick={() => removeEntryTag(entry.id, tag)}
                        >
                          #{tag}
                          <X className="h-3 w-3" />
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
                    {/* Visibility */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        Visibility
                      </Label>
                      <Select 
                        value={entry.visibility} 
                        onValueChange={(v) => updateEntry(entry.id, { visibility: v as VisibilityType })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {visibilityOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-2">
                                {opt.icon}
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Schedule Publish
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
                    {/* Custom Slug */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        Custom URL Slug
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

                    {/* Download Permission */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        Download
                      </Label>
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Allow Download</span>
                        </div>
                        <Switch
                          checked={entry.allowDownload}
                          onCheckedChange={(checked) => updateEntry(entry.id, { allowDownload: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Summary & Button */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <FileCheck className="h-3 w-3" />
              {pendingCount} pending
            </Badge>
            {entries.filter(e => e.status === "uploading").length > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {entries.filter(e => e.status === "uploading").length} uploading
              </Badge>
            )}
            {entries.filter(e => e.status === "done").length > 0 && (
              <Badge className="gap-1 bg-green-500">
                <CheckCircle className="h-3 w-3" />
                {entries.filter(e => e.status === "done").length} done
              </Badge>
            )}
            {entries.filter(e => e.status === "error").length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {entries.filter(e => e.status === "error").length} failed
              </Badge>
            )}
          </div>

          <Button
            onClick={handleUploadAll}
            className="w-full h-12 text-base bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25"
            disabled={isUploading || pendingCount === 0}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading {entries.filter(e => e.status === "uploading").length} files...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Upload {pendingCount} PDF{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
