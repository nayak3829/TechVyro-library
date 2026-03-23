import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

interface RouteProps {
  params: Promise<{ id: string }>
}


export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    if (!verifyToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, category_id, file_path, file_size } = body

    const supabase = createAdminClient()

    // File replacement mode — no title required
    if (file_path) {
      // Fetch current file_path to delete old file from storage
      const { data: current } = await supabase
        .from("pdfs")
        .select("file_path")
        .eq("id", id)
        .single()

      if (current?.file_path && current.file_path !== file_path) {
        await supabase.storage.from("pdfs").remove([current.file_path]).catch(() => {})
      }

      const updatePayload: Record<string, unknown> = {
        file_path,
        file_size: file_size || null,
        updated_at: new Date().toISOString(),
      }
      if (title?.trim()) updatePayload.title = title.trim()
      if (description !== undefined) updatePayload.description = description?.trim() || null
      if (category_id !== undefined) updatePayload.category_id = category_id || null

      const { data, error } = await supabase
        .from("pdfs")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("[v0] PDF file-replace error:", error)
        return NextResponse.json({ error: "Failed to replace file" }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    // Metadata-only update
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("pdfs")
      .update({
        title: title.trim(),
        description: description?.trim() || null,
        category_id: category_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[v0] PDF update error:", error)
      return NextResponse.json({ error: "Failed to update PDF" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] PDF PATCH error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params

    if (!verifyToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get the PDF to find the file path
    const { data: pdf, error: fetchError } = await supabase
      .from("pdfs")
      .select("file_path")
      .eq("id", id)
      .single()

    if (fetchError || !pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("pdfs")
      .remove([pdf.file_path])

    if (storageError) {
      console.error("[v0] Storage delete error:", storageError)
      // Continue to delete database record even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("pdfs")
      .delete()
      .eq("id", id)

    if (dbError) {
      console.error("[v0] Database delete error:", dbError)
      return NextResponse.json({ error: "Failed to delete PDF" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] PDF DELETE error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
