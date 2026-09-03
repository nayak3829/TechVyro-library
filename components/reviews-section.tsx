"use client"

import { useState, useEffect, useRef } from "react"
import { StarRating } from "@/components/star-rating"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Send, User, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { Review } from "@/lib/types"
import { useAuth } from "@/hooks/use-auth"

interface ReviewsSectionProps {
  pdfId: string
  initialReviews?: Review[]
}

const EMPTY_REVIEWS: Review[] = []

export function ReviewsSection({ pdfId, initialReviews = EMPTY_REVIEWS }: ReviewsSectionProps) {
  const { user, loading: authLoading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [totalReviews, setTotalReviews] = useState(initialReviews.length)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const fetchSequence = useRef(0)
  const [formData, setFormData] = useState({
    user_name: "",
    rating: 0,
    comment: "",
  })
  const authenticatedName = user
    ? (
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim())
        || (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim())
        || user.email?.split("@")[0]
        || "User"
      ).slice(0, 100)
    : ""

  useEffect(() => {
    setFormData(previous => (
      previous.user_name === authenticatedName
        ? previous
        : { ...previous, user_name: authenticatedName }
    ))
  }, [authenticatedName])

  useEffect(() => {
    const controller = new AbortController()
    const sequence = ++fetchSequence.current
    if (initialReviews.length === 0) {
      fetchReviews(controller.signal, sequence)
    } else {
      setReviews(initialReviews)
      setTotalReviews(initialReviews.length)
      setHasMore(false)
      setLoading(false)
    }
    return () => controller.abort()
  }, [pdfId, initialReviews])

  async function fetchReviews(signal?: AbortSignal, sequence = ++fetchSequence.current, reset = true) {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      const offset = reset ? 0 : reviews.length
      const res = await fetch(`/api/pdfs/${pdfId}/reviews?limit=20&offset=${offset}`, { signal })
      if (res.ok) {
        const data = await res.json()
        if (sequence === fetchSequence.current && data && Array.isArray(data.reviews)) {
          setReviews(previous => reset ? data.reviews : [...previous, ...data.reviews])
          setTotalReviews(typeof data.total === "number" ? data.total : data.reviews.length)
          setHasMore(Boolean(data.hasMore))
        }
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Failed to fetch reviews:", error)
      }
    } finally {
      if (sequence === fetchSequence.current) setLoading(false)
      if (sequence === fetchSequence.current) setLoadingMore(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.user_name.trim() || !formData.rating) {
      toast.error("Please enter your name and rating")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/pdfs/${pdfId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit review")
      }

      const newReview = await res.json()
      setReviews(previous => [newReview, ...previous])
      setTotalReviews(previous => previous + 1)
      setFormData({ user_name: authenticatedName, rating: 0, comment: "" })
      setShowForm(false)
      toast.success("Review submitted successfully!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit review")
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Reviews ({totalReviews})
        </CardTitle>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            Write Review
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="space-y-2">
              <label htmlFor="review-user-name" className="text-sm font-medium">Your Name</label>
              <Input
                id="review-user-name"
                placeholder={authLoading ? "Loading your name..." : "Sign in to review"}
                value={formData.user_name}
                maxLength={100}
                readOnly
                aria-readonly="true"
                className="cursor-not-allowed bg-muted/60"
              />
              <p className="text-xs text-muted-foreground">Name is taken from your signed-in profile.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <StarRating
                rating={formData.rating}
                size="lg"
                interactive
                onChange={(rating) => setFormData({ ...formData, rating })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comment (Optional)</label>
              <Textarea
                placeholder="Share your thoughts about this PDF..."
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                maxLength={2000}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reviews yet. Be the first to review!
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{review.user_name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                )}
              </div>
            ))}
            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                disabled={loadingMore}
                onClick={() => fetchReviews(undefined, ++fetchSequence.current, false)}
              >
                {loadingMore ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</> : "Load more reviews"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
