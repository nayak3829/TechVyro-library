import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Get reviews for a PDF
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("pdf_id", id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [])
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
    const body = await request.json()
    const { user_name, rating, comment } = body

    if (!user_name || !rating) {
      return NextResponse.json({ error: "Name and rating are required" }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        pdf_id: id,
        user_name: user_name.trim(),
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single()

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
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get("reviewId")

    if (!reviewId) {
      return NextResponse.json({ error: "Review ID is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting review:", error)
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
  }
}
