import { createAdminClient } from "@/lib/supabase/admin"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { NextResponse } from "next/server"
import { simhashSimilarity } from "@/lib/pdf-similarity"

export async function GET(request: Request) {
  if (!verifyAdminToken(extractToken(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const hash = new URL(request.url).searchParams.get("hash")?.trim().toLowerCase()
  const fingerprintRaw = new URL(request.url).searchParams.get("textFingerprint")?.trim().toLowerCase()
  const textFingerprint = fingerprintRaw && /^[a-f0-9]{16,128}$/.test(fingerprintRaw) ? fingerprintRaw : null
  if (!hash || !/^[a-f0-9]{32,128}$/.test(hash)) return NextResponse.json({ error: "A valid content hash is required" }, { status: 400 })
  const db = createAdminClient()
  const { data, error } = await db.from("pdfs").select("id,title,publish_status,content_hash,text_fingerprint").eq("content_hash", hash).limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: "Failed to check hash" }, { status: 500 })
  const response: { duplicate: boolean; pdf: unknown; exact: unknown; nearDuplicate: unknown[] } = {
    duplicate: !!data, pdf: data || null, exact: data || null, nearDuplicate: [],
  }
  if (!textFingerprint) return NextResponse.json(response)
  const { data: candidates } = await db.from("pdfs")
    .select("id,title,publish_status,content_hash,text_fingerprint")
    .not("text_fingerprint", "is", null).limit(200)
  const matches = (candidates || []).filter((candidate) => typeof candidate.text_fingerprint === "string")
    .map((candidate) => ({ candidate, score: simhashSimilarity(candidate.text_fingerprint, textFingerprint) }))
    .filter(({ score }) => score >= 0.8)
    .sort((a, b) => b.score - a.score).slice(0, 10)
  response.nearDuplicate = matches
    .filter(({ candidate }) => candidate.content_hash !== hash)
    .map(({ candidate, score }) => ({
      id: candidate.id,
      title: candidate.title,
      publish_status: candidate.publish_status,
      similarity: Number(score.toFixed(4)),
    }))
  return NextResponse.json(response)
}