"use client"

import { useState, useEffect, useMemo } from "react"
import { MessageSquare, Trash2, User, Star, Search, Filter, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Empty } from "@/components/ui/empty"
import { StarRating } from "@/components/star-rating"
import { toast } from "sonner"
import type { PDF, Review, Category } from "@/lib/types"

interface ReviewWithPDF extends Review {
  pdf_title?: string
}

interface ReviewsManagerProps {
  pdfs: PDF[]
  categories: Category[]
}

export function ReviewsManager({ pdfs, categories }: ReviewsManagerProps) {
  const [reviews, setReviews] = useState<ReviewWithPDF[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRating, setFilterRating] = useState<string>("all")
  const [filterPdf, setFilterPdf] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "rating_high" | "rating_low">("newest")

  // Fetch all reviews using dedicated endpoint
  useEffect(() => {
    async function fetchAllReviews() {
      setLoading(true)
      try {
        const token = sessionStorage.getItem("admin_token")
        const res = await fetch("/api/reviews", {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to fetch reviews")
        }
        
        const data = await res.json()
        setReviews(data.reviews || [])
      } catch (error) {
        toast.error("Failed to load reviews")
      } finally {
        setLoading(false)
      }
    }

    fetchAllReviews()
  }, [])

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(review => 
        review.user_name.toLowerCase().includes(query) ||
        review.comment?.toLowerCase().includes(query) ||
        review.pdf_title?.toLowerCase().includes(query)
      )
    }

    // Rating filter
    if (filterRating !== "all") {
      const rating = parseInt(filterRating)
      result = result.filter(review => review.rating === rating)
    }

    // PDF filter
    if (filterPdf !== "all") {
      result = result.filter(review => review.pdf_id === filterPdf)
    }

    // Sort
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case "rating_high":
        result.sort((a, b) => b.rating - a.rating)
        break
      case "rating_low":
        result.sort((a, b) => a.rating - b.rating)
        break
    }

    return result
  }, [reviews, searchQuery, filterRating, filterPdf, sortBy])

  function toggleSelection(id: string) {
    setSelectedIds(prev => {
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
    if (selectedIds.size === filteredReviews.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredReviews.map(r => r.id)))
    }
  }

  async function handleDelete(reviewId: string, pdfId: string) {
    if (!confirm("Are you sure you want to delete this review?")) return

    try {
      const token = sessionStorage.getItem("admin_token")
      const res = await fetch(`/api/pdfs/${pdfId}/reviews?reviewId=${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete review")
      }

      setReviews(prev => prev.filter(r => r.id !== reviewId))
      toast.success("Review deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete review")
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} review${selectedIds.size > 1 ? "s" : ""}?`)) return

    setDeleting(true)
    try {
      const token = sessionStorage.getItem("admin_token")
      let deleted = 0

      for (const id of selectedIds) {
        const review = reviews.find(r => r.id === id)
        if (!review) continue

        try {
          const res = await fetch(`/api/pdfs/${review.pdf_id}/reviews?reviewId=${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })

          if (res.ok) {
            deleted++
          }
        } catch (err) {
          console.error(`Failed to delete review ${id}:`, err)
        }
      }

      setReviews(prev => prev.filter(r => !selectedIds.has(r.id)))
      setSelectedIds(new Set())
      toast.success(`${deleted} review${deleted > 1 ? "s" : ""} deleted successfully`)
    } catch (error) {
      toast.error("Failed to delete some reviews")
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Stats
  const totalReviews = reviews.length
  const avgRating = totalReviews > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1) 
    : "N/A"
  const lowRatingCount = reviews.filter(r => r.rating <= 2).length

  const allSelected = selectedIds.size === filteredReviews.length && filteredReviews.length > 0

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
        <p className="text-muted-foreground">Loading reviews...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Reviews</p>
                <p className="text-2xl font-bold text-foreground">{totalReviews}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Average Rating</p>
                <p className="text-2xl font-bold text-foreground">{avgRating}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Low Ratings (1-2 stars)</p>
                <p className="text-2xl font-bold text-foreground">{lowRatingCount}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="relative flex-1 group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 group-focus-within:bg-primary/20 transition-colors">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <Input
            placeholder="Search by name, comment, or PDF title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-14 h-11"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-[130px] h-11">
              <Star className="h-4 w-4 mr-2 text-amber-500" />
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPdf} onValueChange={setFilterPdf}>
            <SelectTrigger className="w-[160px] h-11">
              <Filter className="h-4 w-4 mr-2 text-accent" />
              <SelectValue placeholder="PDF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PDFs</SelectItem>
              {pdfs.map(pdf => (
                <SelectItem key={pdf.id} value={pdf.id}>
                  {pdf.title.length > 20 ? pdf.title.slice(0, 20) + "..." : pdf.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[140px] h-11">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="rating_high">Rating High</SelectItem>
              <SelectItem value="rating_low">Rating Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {filteredReviews.length > 0 && (
        <div className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
          selectedIds.size > 0 
            ? "bg-destructive/5 border-destructive/30" 
            : "bg-muted/30 border-border/50"
        }`}>
          <div className="flex items-center gap-4">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all reviews"
              className="h-5 w-5"
            />
            <div>
              <span className="text-sm font-medium text-foreground">
                {selectedIds.size > 0 
                  ? `${selectedIds.size} reviews selected` 
                  : `${filteredReviews.length} reviews`}
              </span>
            </div>
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleting}
              className="gap-2 shadow-lg shadow-destructive/20"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedIds.size}
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Empty
          icon={MessageSquare}
          title={reviews.length === 0 ? "No reviews yet" : "No reviews found"}
          description={reviews.length === 0 
            ? "Reviews will appear here when users submit them" 
            : "Try adjusting your search or filters"}
        />
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`p-4 rounded-xl border bg-card transition-all duration-200 ${
                selectedIds.has(review.id)
                  ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10"
                  : "border-border/50 hover:border-primary/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(review.id)}
                  onCheckedChange={() => toggleSelection(review.id)}
                  aria-label={`Select review from ${review.user_name}`}
                  className="mt-1 h-5 w-5"
                />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-medium text-foreground">{review.user_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StarRating rating={review.rating} size="sm" />
                        <Badge variant="outline" className="text-xs">
                          {review.pdf_title || "Unknown PDF"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(review.created_at)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(review.id, review.pdf_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
