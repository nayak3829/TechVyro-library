import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Get all reviews (Admin only)
export async function GET(request: Request) {
  try {
    // Verify admin token
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        *,
        pdfs:pdf_id (
          id,
          title
        )
      `)
      .order("created_at", { ascending: false })

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

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error("[v0] Error fetching all reviews:", error)
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 })
  }
}
