import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

interface RouteProps {
  params: Promise<{ id: string }>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function categorySlug(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

// Update category (rename, change color)
export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!UUID.test(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })

    const body: unknown = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid request body is required" }, { status: 400 })
    }
    const { name, color } = body as Record<string, unknown>

    if (name === undefined && color === undefined) {
      return NextResponse.json({ error: "Name or color required" }, { status: 400 })
    }
    if (name !== undefined && (typeof name !== "string" || !name.trim() || name.trim().length > 80)) {
      return NextResponse.json({ error: "Name must be between 1 and 80 characters" }, { status: 400 })
    }
    if (color !== undefined && (typeof color !== "string" || !HEX_COLOR.test(color))) {
      return NextResponse.json({ error: "Color must be a valid hex color" }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    const updateData: { name?: string; color?: string; slug?: string } = {}
    if (typeof name === "string") {
      const normalizedName = name.trim()
      const slug = categorySlug(normalizedName)
      if (!slug) return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 })
      updateData.name = normalizedName
      updateData.slug = slug
    }
    if (typeof color === "string") {
      updateData.color = color
    }
    
    const { data, error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating category:", error)
      if (error.code === "PGRST116") return NextResponse.json({ error: "Category not found" }, { status: 404 })
      if (error.code === "23505") return NextResponse.json({ error: "Category already exists" }, { status: 409 })
      return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Category PATCH error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!UUID.test(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 })

    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle()

    if (error) {
      console.error("[v0] Error deleting category:", error)
      return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
    }

    if (!data) return NextResponse.json({ error: "Category not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Category DELETE error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
