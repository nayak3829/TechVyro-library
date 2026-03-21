"use client"

import { useState, useRef, useCallback } from "react"
import { 
  Upload, FileText, X, CheckCircle, Loader2, AlertCircle, 
  Zap, Files, Tag, Eye, EyeOff, Lock, Globe, Link2, 
  Sparkles, ChevronDown, ChevronUp, Settings2, Code, Copy
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "sonner"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_PARALLEL_UPLOADS = 3

type VisibilityType = "public" | "private"

interface FileEntry {
  id: string
  file: File
  title: string
  description: string
  tags: string[]
  visibility: VisibilityType
  status: "pending" | "uploading" | "done" | "error"
  progress: number
  error?: string
  showAdvanced: boolean
}

interface HTMLUploadFormProps {
  onSuccess: () => void
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

function titleFromFilename(name: string) {
  return name.replace(/\.html?$/i, "").replace(/[-_]+/g, " ").trim()
}

const visibilityOptions = [
  { value: "public" as const, label: "Public", icon: <Globe className="h-3.5 w-3.5" />, description: "Anyone can access" },
  { value: "private" as const, label: "Private", icon: <Lock className="h-3.5 w-3.5" />, description: "Only admin" },
]

export function HTMLUploadForm({ onSuccess }: HTMLUploadFormProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [globalVisibility, setGlobalVisibility] = useState<VisibilityType>("public")
  const [globalTags, setGlobalTags] = useState<string[]>([])
  const [globalTagInput, setGlobalTagInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [showGlobalSettings, setShowGlobalSettings] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | File[]) {
    const allFiles = Array.from(files)
    const htmlFiles = allFiles.filter((f) => f.type === "text/html" || f.name.endsWith(".html") || f.name.endsWith(".htm"))
    
    if (htmlFiles.length === 0) {
      toast.error("Only HTML files are allowed")
      return
    }

    const oversizedFiles = htmlFiles.filter(f => f.size > MAX_FILE_SIZE)
    const validFiles = htmlFiles.filter(f => f.size <= MAX_FILE_SIZE)

    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map(f => f.name).join(", ")
      toast.error(`Files exceeding 10MB limit: ${names}`)
    }

    if (validFiles.length === 0) return

    const newEntries: FileEntry[] = validFiles.map((file) => {
      const title = titleFromFilename(file.name)
      return {
        id: generateId(),
        file,
        title,
        description: "",
        tags: [...globalTags],
        visibility: globalVisibility,
        status: "pending",
        progress: 0,
        showAdvanced: false,
      }
    })
    setEntries((prev) => [...prev, ...newEntries])

    if (validFiles.length > 0 && oversizedFiles.length > 0) {
      toast.info(`Added ${validFiles.length} file(s). ${oversizedFiles.length} file(s) skipped (over 10MB).`)
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

  function applyGlobalSettings() {
    setEntries((prev) =>
      prev.map((e) => (e.status === "pending" ? { 
        ...e, 
        visibility: globalVisibility,
        tags: [...new Set([...e.tags, ...globalTags])],
      } : e))
    )
    toast.success("Global settings applied to all pending files")
  }

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

  const uploadEntry = useCallback(async (entry: FileEntry): Promise<boolean> => {
    updateEntry(entry.id, { status: "uploading", progress: 0 })
    try {
      const token = sessionStorage.getItem("admin_token")
      const title = entry.title.trim() || titleFromFilename(entry.file.name)

      updateEntry(entry.id, { progress: 20 })

      // Save as localStorage for now (similar to quiz storage pattern)
      const fileContent = await entry.file.text()
      const htmlEntry = {
        id: generateId(),
        title,
        description: entry.description,
        filename: entry.file.name,
        content: fileContent,
        tags: entry.tags,
        visibility: entry.visibility,
        createdAt: new Date().toISOString(),
      }

      const existing = localStorage.getItem("techvyro-html-files")
      const files = existing ? JSON.parse(existing) : []
      files.unshift(htmlEntry)
      localStorage.setItem("techvyro-html-files", JSON.stringify(files.slice(0, 100)))

      updateEntry(entry.id, { status: "done", progress: 100 })
      return true
    } catch (err) {
      let errorMsg = "Upload failed"
      if (err instanceof Error) {
        errorMsg = err.message
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
      toast.success(`${successCount} HTML file${successCount > 1 ? "s" : ""} uploaded successfully!`)
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
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-300 cursor-pointer group ${
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,80,200,0.05),transparent_70%)] rounded-2xl pointer-events-none" />
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,text/html"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="relative">
          <div className="mx-auto w-12 sm:w-16 h-12 sm:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
            <Code className="h-6 sm:h-8 w-6 sm:w-8 text-primary" />
          </div>
          <p className="font-semibold text-base sm:text-lg text-foreground">Drop HTML files here or click</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Multiple files supported (max 10MB each)</p>
          
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 sm:mt-4">
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-primary bg-primary/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Zap className="h-3 w-3" />
              Fast Upload
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-green-600 bg-green-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Files className="h-3 w-3" />
              Batch Support
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 bg-blue-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
              <Tag className="h-3 w-3" />
              Tags
            </span>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      {entries.length > 0 && (
        <Collapsible open={showGlobalSettings} onOpenChange={setShowGlobalSettings}>
          <div className="rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full flex items-center justify-between p-3 sm:p-4 h-auto hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Settings2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-xs sm:text-base text-foreground">Global Settings</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Apply to all files</p>
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
              <div className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4 border-t border-border/50">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Visibility
                  </Label>
                  <Select value={globalVisibility} onValueChange={(v) => setGlobalVisibility(v as VisibilityType)}>
                    <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {visibilityOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            {opt.icon}
                            <span>{opt.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-1 sm:gap-2 min-h-[36px] sm:min-h-[40px] p-1.5 sm:p-2 rounded-lg border border-border bg-background">
                    {globalTags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20 text-[10px] sm:text-xs"
                        onClick={() => removeGlobalTag(tag)}
                      >
                        #{tag}
                        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
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
                      placeholder="Type tag..."
                      className="flex-1 min-w-[100px] border-0 shadow-none h-6 sm:h-7 px-1 text-xs focus-visible:ring-0"
                    />
                  </div>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">Press Enter to add</p>
                </div>

                <Button 
                  onClick={applyGlobalSettings}
                  className="w-full gap-2 text-xs sm:text-sm h-8 sm:h-9"
                  variant="outline"
                >
                  <Sparkles className="h-4 w-4" />
                  Apply to All
                </Button>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      )}

      {/* File List */}
      {entries.length > 0 && (
        <div className="space-y-2 sm:space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-lg sm:rounded-xl border bg-card transition-all duration-300 overflow-hidden p-2 sm:p-3 ${
                entry.status === "done"
                  ? "border-green-500/50 bg-green-500/5"
                  : entry.status === "error"
                  ? "border-red-500/50 bg-red-500/5"
                  : ""
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="shrink-0 mt-0.5 sm:mt-1">
                  {entry.status === "done" && <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />}
                  {entry.status === "uploading" && <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />}
                  {entry.status === "error" && <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />}
                  {entry.status === "pending" && <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={entry.title}
                        onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                        placeholder="File title"
                        disabled={entry.status !== "pending"}
                        className="h-7 sm:h-8 text-xs sm:text-sm"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeEntry(entry.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {entry.status === "uploading" && (
                    <Progress value={entry.progress} className="h-1.5 sm:h-2 mb-1" />
                  )}

                  {entry.status === "error" && entry.error && (
                    <p className="text-[10px] sm:text-xs text-red-600 mb-1">{entry.error}</p>
                  )}

                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                    {entry.file.name} • {(entry.file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {entries.length > 0 && (
        <div className="flex gap-2 sm:gap-3">
          <Button 
            onClick={handleUploadAll}
            disabled={isUploading || pendingCount === 0}
            className="flex-1 gap-2 text-xs sm:text-sm h-8 sm:h-9"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload ({pendingCount})
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setEntries([])}
            disabled={isUploading}
            className="text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}
