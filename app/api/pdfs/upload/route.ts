import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// Allow large file uploads (no size limit from Next.js side)
export const maxDuration = 300 // 5 minutes for large uploads
export const dynamic = "force-dynamic"

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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const categoryId = formData.get("categoryId") as string

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Check file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check for duplicate title
    const { data: existingPdf } = await supabase
      .from("pdfs")
      .select("id")
      .ilike("title", title.trim())
      .single()

    if (existingPdf) {
      return NextResponse.json({ error: "A PDF with this title already exists" }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `${timestamp}-${sanitizedName}`

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(filePath, file, {
        contentType: "application/pdf",
        upsert: false,
      })

    if (uploadError) {
      console.error("[v0] Storage upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Create database record
    const { data: pdf, error: dbError } = await supabase
      .from("pdfs")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        file_path: filePath,
        file_size: file.size,
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
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
