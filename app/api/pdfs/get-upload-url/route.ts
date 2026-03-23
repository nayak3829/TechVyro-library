import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    if (!verifyAdminToken(extractToken(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isAdminConfigured()) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 })
    }

    const body = await request.json()
    const { filename, contentType } = body

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `${timestamp}-${sanitizedName}`

    const supabase = createAdminClient()

    // Create a signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("pdfs")
      .createSignedUploadUrl(filePath)

    if (error) {
      console.error("[v0] Failed to create signed URL:", error)
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
    }

    return NextResponse.json({ 
      signedUrl: data.signedUrl,
      filePath,
      token: data.token
    })
  } catch (error) {
    console.error("[v0] Get upload URL error:", error)
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
