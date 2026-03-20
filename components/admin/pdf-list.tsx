"use client"

import { useState, useMemo } from "react"
import { Trash2, ExternalLink, FileText, Pencil, Check, X, Eye, Loader2, Search, Filter, Download, FolderInput, FileDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  const [bulkMoving, setBulkMoving] = useState(false)
  
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

  async function handleBulkMove(categoryId: string | null) {
    if (selectedIds.size === 0) return

    setBulkMoving(true)
    try {
      const token = sessionStorage.getItem("admin_token")
      const response = await fetch("/api/pdfs/bulk-move", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: Array.from(selectedIds), category_id: categoryId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to move PDFs")
      }

      const data = await response.json()
      const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name : "Uncategorized"
      toast.success(`${data.updated} PDF${data.updated > 1 ? "s" : ""} moved to ${categoryName}!`)
      setSelectedIds(new Set())
      onUpdate()
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
    <div className="space-y-5">
      {/* Search and Filter Bar - Enhanced */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="relative flex-1 group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-focus-within:bg-primary/20 transition-colors">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <Input
            placeholder="Search PDFs by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-11"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] h-11">
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
            <SelectTrigger className="w-[140px] h-11">
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
      <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
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
        <div className="flex items-center gap-2">
          {/* Export dropdown - always visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
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
              {/* Move to category dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={bulkMoving}>
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
