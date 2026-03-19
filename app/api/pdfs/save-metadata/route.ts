import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Verify admin token
    const authHeader = request.headers.get("Authorization")
    const token = authHeader?.replace("Bearer ", "")
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const { title, description, filePath, fileSize, categoryId } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    if (!filePath) {
      return NextResponse.json({ error: "File path is required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check for duplicate title
    const { data: existingPdf } = await supabase
      .from("pdfs")
      .select("id")
      .ilike("title", title.trim())
      .single()

    if (existingPdf) {
      // Delete the uploaded file since we can't use it
      await supabase.storage.from("pdfs").remove([filePath])
      return NextResponse.json({ error: "A PDF with this title already exists" }, { status: 400 })
    }

    // Create database record
    const { data: pdf, error: dbError } = await supabase
      .from("pdfs")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        file_path: filePath,
        file_size: fileSize || null,
        category_id: categoryId || null,
        view_count: 0,
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database insert error:", dbError)
      // Try to delete uploaded file on failure
      await supabase.storage.from("pdfs").remove([filePath])
      return NextResponse.json({ error: "Failed to save PDF metadata" }, { status: 500 })
    }

    return NextResponse.json({ pdf })
  } catch (error) {
    console.error("[v0] Save metadata error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
