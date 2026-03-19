import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

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

    return NextResponse.json({ categories: data })
  } catch (error) {
    console.error("[v0] Categories GET error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin token
    const authHeader = request.headers.get("Authorization")
    const token = authHeader?.replace("Bearer ", "")
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify token
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 })
    }

    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8")
      const [storedPassword] = decoded.split(":")
      if (storedPassword !== adminPassword) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
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
