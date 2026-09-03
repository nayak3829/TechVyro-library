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
    const assetKind = body.assetKind === "thumbnail" ? "thumbnail" : "pdf"

    if (typeof filename !== "string" || typeof contentType !== "string") {
      return NextResponse.json({ error: "filename and contentType are required" }, { status: 400 })
    }

    const normalizedFilename = filename.trim()
    const extension = normalizedFilename.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase()
    const allowedContentTypes: Record<string, string[]> = assetKind === "thumbnail"
      ? { jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"] }
      : { pdf: ["application/pdf"] }
    if (
      !extension ||
      !allowedContentTypes[extension]?.includes(contentType.toLowerCase().trim()) ||
      normalizedFilename.includes("/") ||
      normalizedFilename.includes("\\")
    ) {
      return NextResponse.json({ error: assetKind === "thumbnail" ? "Only JPEG or WebP thumbnails may be uploaded" : "Only PDF files may be uploaded" }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = normalizedFilename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `${assetKind === "thumbnail" ? "thumbnails/" : ""}${timestamp}-${sanitizedName}`

    const supabase = createAdminClient()

    // Create a signed upload URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from("pdfs")
      .createSignedUploadUrl(filePath)

    if (error) {
      console.error("[v0] Failed to create signed URL:", error)
      return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 })
    }

    // A cleanup reservation protects signed uploads that never get metadata.
    // It is deliberately idempotent by bucket/path, not by request.
    const { enqueuePdfJob } = await import("@/lib/pdf-jobs")
    await enqueuePdfJob(null, "cleanup", { bucket: "pdfs", path: filePath, maxBytes: assetKind === "thumbnail" ? 10 * 1024 * 1024 : 100 * 1024 * 1024 })
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
