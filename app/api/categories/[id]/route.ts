import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

interface RouteProps {
  params: Promise<{ id: string }>
}

// Helper to verify admin token

// Update category (rename, change color)
export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params
    
    if (!verifyAdminToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, color } = body

    if (!name && !color) {
      return NextResponse.json({ error: "Name or color required" }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    const updateData: { name?: string; color?: string; slug?: string } = {}
    if (name) {
      updateData.name = name
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    }
    if (color) {
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
    
    if (!verifyAdminToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[v0] Error deleting category:", error)
      return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Category DELETE error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
