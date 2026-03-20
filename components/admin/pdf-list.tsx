"use client"

import { useState, useMemo } from "react"
import { Trash2, ExternalLink, FileText, Pencil, Check, X, Eye, Loader2, Search, Filter, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import type { PDF, Category } from "@/lib/types"

interface PDFListProps {
  pdfs: PDF[]
  categories: Category[]
  loading: boolean
  onDelete: () => void
  onUpdate: () => void
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown"
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

interface EditState {
  title: string
  category_id: string
}

export function PDFList({ pdfs, categories, loading, onDelete, onUpdate }: PDFListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: "", category_id: "" })
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "downloads" | "views">("newest")

  // Filter and sort PDFs
  const filteredPdfs = useMemo(() => {
    let result = [...pdfs]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(pdf => 
        pdf.title.toLowerCase().includes(query) ||
        pdf.description?.toLowerCase().includes(query)
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
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case "name":
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "downloads":
        result.sort((a, b) => b.download_count - a.download_count)
        break
      case "views":
        result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
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
      const token = sessionStorage.getItem("admin_token")
      const response = await fetch("/api/pdfs/bulk-delete", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete PDFs")
      }

      const data = await response.json()
      toast.success(`${data.deleted} PDF${data.deleted > 1 ? "s" : ""} deleted successfully!`)
      setSelectedIds(new Set())
      onDelete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete PDFs")
    } finally {
      setBulkDeleting(false)
    }
  }

  function startEdit(pdf: PDF) {
    setEditingId(pdf.id)
    setEditState({
      title: pdf.title,
      category_id: pdf.category_id || "none",
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState({ title: "", category_id: "" })
  }

  async function saveEdit(id: string) {
    if (!editState.title.trim()) {
      toast.error("Title cannot be empty")
      return
    }

    setSaving(true)
    try {
      const token = sessionStorage.getItem("admin_token")
      const response = await fetch(`/api/pdfs/${id}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editState.title.trim(),
          category_id: editState.category_id === "none" ? null : editState.category_id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update PDF")
      }

      toast.success("PDF updated!")
      setEditingId(null)
      onUpdate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update PDF")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    try {
      const token = sessionStorage.getItem("admin_token")
      const response = await fetch(`/api/pdfs/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete PDF")
      }

      toast.success("PDF deleted successfully!")
      onDelete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete PDF")
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

  if (pdfs.length === 0) {
    return (
      <Empty
        icon={FileText}
        title="No PDFs uploaded"
        description="Upload your first PDF using the Upload tab"
      />
    )
  }

  const allSelected = selectedIds.size === filteredPdfs.length && filteredPdfs.length > 0

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PDFs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="downloads">Downloads</SelectItem>
              <SelectItem value="views">Views</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || filterCategory !== "all") && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredPdfs.length} of {pdfs.length} PDFs
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      )}

      {/* Bulk Actions Bar */}
      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
            aria-label="Select all PDFs"
          />
          <span className="text-sm text-muted-foreground">
            {selectedIds.size > 0 
              ? `${selectedIds.size} selected` 
              : `${filteredPdfs.length} PDFs`}
          </span>
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
          >
            {bulkDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedIds.size}
              </>
            )}
          </Button>
        )}
      </div>

      {/* PDF List */}
      {filteredPdfs.length === 0 ? (
        <Empty
          icon={Search}
          title="No results found"
          description="Try adjusting your search or filters"
        />
      ) : (
        <div className="space-y-2">
          {filteredPdfs.map((pdf) => {
            const category = categories.find((c) => c.id === pdf.category_id)
            const isEditing = editingId === pdf.id

            return (
              <div
                key={pdf.id}
                className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors ${
                  selectedIds.has(pdf.id) ? "border-primary/50 bg-primary/5" : "border-border/50"
                }`}
              >
                <Checkbox
                  checked={selectedIds.has(pdf.id)}
                  onCheckedChange={() => toggleSelection(pdf.id)}
                  aria-label={`Select ${pdf.title}`}
                  className="shrink-0"
                />
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary/60" />
                </div>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={editState.title}
                        onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(pdf.id)
                          if (e.key === "Escape") cancelEdit()
                        }}
                        className="h-8 text-sm font-medium"
                        autoFocus
                        disabled={saving}
                      />
                      <Select
                        value={editState.category_id}
                        onValueChange={(v) => setEditState((s) => ({ ...s, category_id: v }))}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate text-sm sm:text-base">{pdf.title}</h3>
                        {category && (
                          <Badge
                            className="text-[10px] sm:text-xs shrink-0"
                            style={{ backgroundColor: category.color, color: "#fff" }}
                          >
                            {category.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap mt-0.5">
                        <span>{formatFileSize(pdf.file_size)}</span>
                        <span className="hidden sm:inline">|</span>
                        <span className="hidden sm:inline">{formatDate(pdf.created_at)}</span>
                        <span>|</span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {pdf.view_count || 0}
                        </span>
                        <span>|</span>
                        <span className="inline-flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {pdf.download_count}
                        </span>
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
                        disabled={saving}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground h-8 w-8"
                        onClick={cancelEdit}
                        disabled={saving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(pdf)} className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <a href={`/pdf/${pdf.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => handleDelete(pdf.id, pdf.title)}
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
