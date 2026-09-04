import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { COMMUNITY_PATH, UUID } from "@/lib/community-submissions"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(extractToken(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = (await params).id
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid submission id" }, { status: 400 })
  const db = createAdminClient()
  const { data: row, error } = await db.from("community_submissions").select("file_path").eq("id", id).maybeSingle()
  if (error) return NextResponse.json({ error: "Could not load submission" }, { status: 500 })
  if (!row || !COMMUNITY_PATH.test(row.file_path)) return NextResponse.json({ error: "File not found" }, { status: 404 })
  const { data: blob, error: storageError } = await db.storage.from("community-pdfs").download(row.file_path)
  if (storageError || !blob) return NextResponse.json({ error: "File not found" }, { status: 404 })
  return new Response(blob.stream(), { headers: {
    "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="submission-${id}.pdf"`,
    "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
  } })
}