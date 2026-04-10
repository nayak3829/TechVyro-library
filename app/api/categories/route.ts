import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }
    
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name")

    if (error) {
      console.error("[v0] Error fetching categories:", error)
      return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }

    // Prevent caching to ensure fresh data
    const response = NextResponse.json({ categories: data })
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    return response
  } catch (error) {
    console.error("[v0] Categories GET error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, color } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: name.trim(),
        slug,
        color: color || "#8B5CF6",
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating category:", error)
      if (error.code === "23505") {
        return NextResponse.json({ error: "Category already exists" }, { status: 400 })
      }
      return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }

    return NextResponse.json({ category: data })
  } catch (error) {
    console.error("[v0] Categories POST error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
