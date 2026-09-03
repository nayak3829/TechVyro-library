import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"

// Get all reviews (Admin only)
export async function GET(request: Request) {
  try {
    // Verify admin token
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const requestedLimit = Number(searchParams.get("limit") || "100")
    const requestedOffset = Number(searchParams.get("offset") || "0")
    const limit = Number.isInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 100
    const offset = Number.isInteger(requestedOffset) ? Math.max(0, requestedOffset) : 0

    const { data, error, count } = await supabase
      .from("reviews")
      .select(`
        *,
        pdfs:pdf_id (
          id,
          title
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[v0] Error fetching reviews:", error)
      throw error
    }

    // Transform data to include pdf_title
    const reviews = (data || []).map(review => ({
      ...review,
      pdf_title: review.pdfs?.title || "Unknown PDF",
      pdfs: undefined // Remove nested object
    }))

    return NextResponse.json({
      reviews,
      total: count ?? reviews.length,
      limit,
      offset,
      hasMore: offset + reviews.length < (count ?? reviews.length),
    })
  } catch (error) {
    console.error("[v0] Error fetching all reviews:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
