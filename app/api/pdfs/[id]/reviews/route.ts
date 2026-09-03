import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { applyPublicPdfVisibility, canViewPDF, getPDFRequestIdentity } from "@/lib/pdf-access"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_REVIEW_BODY_BYTES = 8 * 1024
const MAX_PUBLIC_REVIEW_LIMIT = 50

async function visiblePdf(request: Request, id: string) {
  if (!UUID.test(id)) return null
  const admin = createAdminClient()
  const identity = await getPDFRequestIdentity(request)
  let query = admin.from("pdfs")
    .select("id, visibility, scheduled_at, publish_status").eq("id", id)
  if (!identity.isAdmin) query = applyPublicPdfVisibility(query)
  const { data } = await query.maybeSingle()
  if (!data) return null
  return canViewPDF(data, identity.isAdmin) ? { pdf: data, identity } : null
}

// Get reviews for a PDF
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const visible = await visiblePdf(request, id)
    if (!visible) return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    const { searchParams } = new URL(request.url)
    const requestedLimit = Number(searchParams.get("limit") || "20")
    const requestedOffset = Number(searchParams.get("offset") || "0")
    const limit = Number.isInteger(requestedLimit) ? Math.min(MAX_PUBLIC_REVIEW_LIMIT, Math.max(1, requestedLimit)) : 20
    const offset = Number.isInteger(requestedOffset) ? Math.max(0, requestedOffset) : 0
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { data, error, count } = await supabase
      .from("reviews")
      .select("id, pdf_id, user_name, rating, comment, created_at", { count: "exact" })
      .eq("pdf_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const reviews = data || []
    return NextResponse.json({
      reviews,
      total: count ?? reviews.length,
      hasMore: offset + reviews.length < (count ?? reviews.length),
    })
  } catch (error) {
    console.error("[v0] Error fetching reviews:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}

// Add a review
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured. Please add Supabase environment variables." }, { status: 503 })
    }

    const { id } = await params
    const contentLength = Number(request.headers.get("content-length") || 0)
    if (contentLength > MAX_REVIEW_BODY_BYTES) {
      return NextResponse.json({ error: "Review is too large" }, { status: 413 })
    }
    if (!UUID.test(id)) return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
    }
    const { rating, comment } = body as Record<string, unknown>
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be a whole number between 1 and 5" }, { status: 400 })
    }
    if (comment !== undefined && comment !== null && (typeof comment !== "string" || comment.trim().length > 2000)) {
      return NextResponse.json({ error: "Comment must be at most 2000 characters" }, { status: 400 })
    }

    const visible = await visiblePdf(request, id)
    if (!visible) return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to submit a review" }, { status: 401 })
    }
    const userName = (
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim())
      || (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim())
      || user.email?.split("@")[0]
      || "User"
    ).slice(0, 100)

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        pdf_id: id,
        user_name: userName,
        rating,
        comment: typeof comment === "string" ? comment.trim() || null : null,
        user_id: user.id,
      })
      .select()
      .single()

    if (error?.code === "23505") {
      return NextResponse.json({ error: "You have already reviewed this PDF" }, { status: 409 })
    }
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error adding review:", error)
    return NextResponse.json({ error: "Failed to add review" }, { status: 500 })
  }
}

// Delete a review (Admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin token
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const { id } = await params
    const reviewId = searchParams.get("reviewId")

    if (!UUID.test(id) || !reviewId || !UUID.test(reviewId)) {
      return NextResponse.json({ error: "Valid PDF and review IDs are required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)
      .eq("pdf_id", id)
      .select("id")
      .maybeSingle()

    if (error) throw error

    if (!data) return NextResponse.json({ error: "Review not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting review:", error)
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
  }
}
