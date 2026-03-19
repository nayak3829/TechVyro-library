import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

function verifyToken(request: Request): boolean {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) return false
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8")
    const [storedPassword] = decoded.split(":")
    return storedPassword === adminPassword
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
    if (!verifyToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No PDF IDs provided" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get all PDFs to find their file paths
    const { data: pdfs, error: fetchError } = await supabase
      .from("pdfs")
      .select("id, file_path")
      .in("id", ids)

    if (fetchError) {
      console.error("[v0] Error fetching PDFs for bulk delete:", fetchError)
      return NextResponse.json({ error: "Failed to fetch PDFs" }, { status: 500 })
    }

    if (!pdfs || pdfs.length === 0) {
      return NextResponse.json({ error: "No PDFs found" }, { status: 404 })
    }

    // Delete files from storage
    const filePaths = pdfs.map((pdf) => pdf.file_path)
    const { error: storageError } = await supabase.storage
      .from("pdfs")
      .remove(filePaths)

    if (storageError) {
      console.error("[v0] Storage bulk delete error:", storageError)
      // Continue to delete database records even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("pdfs")
      .delete()
      .in("id", ids)

    if (dbError) {
      console.error("[v0] Database bulk delete error:", dbError)
      return NextResponse.json({ error: "Failed to delete PDFs" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      deleted: pdfs.length 
    })
  } catch (error) {
    console.error("[v0] Bulk delete error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
