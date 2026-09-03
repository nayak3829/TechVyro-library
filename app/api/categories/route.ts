import { createClient } from "@/lib/supabase/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"

const CATEGORY_NAME_MAX_LENGTH = 80
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function categorySlug(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

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

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid request body is required" }, { status: 400 })
    }
    const { name, color } = body as Record<string, unknown>

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (name.trim().length > CATEGORY_NAME_MAX_LENGTH) {
      return NextResponse.json({ error: `Name must be ${CATEGORY_NAME_MAX_LENGTH} characters or fewer` }, { status: 400 })
    }
    if (color !== undefined && (typeof color !== "string" || !HEX_COLOR.test(color))) {
      return NextResponse.json({ error: "Color must be a valid hex color" }, { status: 400 })
    }

    const normalizedName = name.trim()
    const slug = categorySlug(normalizedName)
    if (!slug) {
      return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: normalizedName,
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
