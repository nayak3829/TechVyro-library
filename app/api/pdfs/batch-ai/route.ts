import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { verifyAdminToken, extractToken } from "@/lib/admin-auth"
import { NextResponse } from "next/server"

const OPENAI_KEY = process.env.OPENAI_API_KEY
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const AI_MODES = new Set(["description", "tags", "both", "all"])
const VISIBILITIES = new Set(["public", "unlisted", "private"])
const MAX_AI_IDS = 30
const MAX_VISIBILITY_IDS = 100

function validIds(value: unknown, max: number): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= max &&
    value.every((id) => typeof id === "string" && UUID.test(id))
}

async function generateMeta(title: string, existingDesc: string | null, categories: string[]): Promise<{
  description: string
  tags: string[]
}> {
  if (!OPENAI_KEY) return { description: "", tags: [] }

  const prompt = `You are generating metadata for a PDF study material on TechVyro — an Indian educational platform for NDA, CDS, SSC, UPSC, and competitive exam preparation.

PDF Title: "${title}"
Available categories: ${categories.join(", ")}
Existing description: ${existingDesc ? `"${existingDesc}"` : "None"}

Generate concise, educational metadata in JSON:
{
  "description": "2-3 sentence description of what this PDF likely contains. Be specific and educational.",
  "tags": ["4-6 short keyword tags relevant to this study material"]
}

Return only valid JSON.`

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 250,
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!res.ok) return { description: "", tags: [] }
    const data = await res.json()
    const content: string = data.choices?.[0]?.message?.content?.trim() || ""
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim()
    const json = JSON.parse(cleaned)
    return {
      description: typeof json.description === "string" ? json.description.trim().slice(0, 2000) : "",
      tags: Array.isArray(json.tags)
        ? json.tags.filter((tag: unknown): tag is string => typeof tag === "string")
          .map((tag: string) => tag.trim().slice(0, 50)).filter(Boolean).slice(0, 6)
        : [],
    }
  } catch {
    return { description: "", tags: [] }
  }
}

// GET — return content health stats
export async function GET(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

  const supabase = createAdminClient()

  const { data: pdfs, error: pdfError } = await supabase
    .from("pdfs")
    .select("id, title, description, category_id, file_path, tags, visibility, view_count, download_count, created_at")
    .order("created_at", { ascending: false })
  if (pdfError) return NextResponse.json({ error: "Failed to load content health" }, { status: 500 })

  const all = pdfs || []
  const noDesc = all.filter(p => !p.description)
  const noCategory = all.filter(p => !p.category_id)
  const noTags = all.filter(p => !p.tags || (Array.isArray(p.tags) && p.tags.length === 0))
  const noDownloads = all.filter(p => (p.download_count || 0) === 0 && (p.view_count || 0) > 5)
  const privateCount = all.filter(p => p.visibility === "private")
  const unlistedCount = all.filter(p => p.visibility === "unlisted")

  return NextResponse.json({
    total: all.length,
    noDescription: noDesc.length,
    noCategory: noCategory.length,
    noTags: noTags.length,
    noDownloads: noDownloads.length,
    private: privateCount.length,
    unlisted: unlistedCount.length,
    noDescIds: noDesc.map(p => ({ id: p.id, title: p.title })).slice(0, 5),
    noCategoryIds: noCategory.map(p => ({ id: p.id, title: p.title })).slice(0, 5),
    noTagsIds: noTags.map(p => ({ id: p.id, title: p.title })).slice(0, 5),
  })
}

// POST — run batch AI enhancement
export async function POST(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
  }
  const { mode, ids } = body as { mode: "description" | "tags" | "both" | "all"; ids?: string[] }
  if (typeof mode !== "string" || !AI_MODES.has(mode)) {
    return NextResponse.json({ error: "Invalid AI enhancement mode" }, { status: 400 })
  }
  if (ids !== undefined && !validIds(ids, MAX_AI_IDS)) {
    return NextResponse.json({ error: `ids must contain 1 to ${MAX_AI_IDS} valid PDF IDs` }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: categories } = await supabase.from("categories").select("name").order("name")
  const catNames = (categories || []).map((c: { name: string }) => c.name)

  let query = supabase.from("pdfs").select("id, title, description, tags")

  if (ids && ids.length > 0) {
    query = query.in("id", ids)
  } else if (mode === "description") {
    query = query.is("description", null)
  } else if (mode === "tags") {
    query = query.or("tags.is.null,tags.eq.{}")
  } else {
    query = query.or("description.is.null,tags.is.null,tags.eq.{}")
  }

  query = query.limit(30)

  const { data: pdfs, error: queryError } = await query
  if (queryError) return NextResponse.json({ error: "Failed to load PDFs" }, { status: 500 })
  if (!pdfs || pdfs.length === 0) {
    return NextResponse.json({ updated: 0, skipped: 0, message: "No PDFs need enhancement" })
  }

  let updated = 0
  let skipped = 0
  const results: { id: string; title: string; ok: boolean }[] = []

  for (const pdf of pdfs) {
    try {
      const needsDesc = mode === "description" || mode === "both" || mode === "all" || !pdf.description
      const needsTags = mode === "tags" || mode === "both" || mode === "all" || !pdf.tags || (pdf.tags as string[]).length === 0

      if (!needsDesc && !needsTags) { skipped++; continue }

      const { description, tags } = await generateMeta(
        String(pdf.title || "").slice(0, 300),
        typeof pdf.description === "string" ? pdf.description.slice(0, 2000) : null,
        catNames.slice(0, 100).map((name) => String(name).slice(0, 80)),
      )

      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (needsDesc && description) updatePayload.description = description
      if (needsTags && tags.length > 0) updatePayload.tags = tags

      if (Object.keys(updatePayload).length <= 1) { skipped++; continue }

      const { data: updatedRows, error: updateError } = await supabase
        .from("pdfs").update(updatePayload).eq("id", pdf.id).select("id")
      if (updateError || !updatedRows?.length) {
        skipped++
        results.push({ id: pdf.id, title: pdf.title, ok: false })
        continue
      }
      updated++
      results.push({ id: pdf.id, title: pdf.title, ok: true })

      await new Promise(r => setTimeout(r, 200))
    } catch {
      skipped++
      results.push({ id: pdf.id, title: pdf.title, ok: false })
    }
  }

  return NextResponse.json({
    updated,
    skipped,
    total: pdfs.length,
    results,
    message: `Enhanced ${updated} PDFs${skipped > 0 ? `, skipped ${skipped}` : ""}`,
  })
}

// PATCH — bulk update visibility
export async function PATCH(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminConfigured()) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

  const body: unknown = await request.json().catch(() => null)
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
  }
  const { ids, visibility } = body as { ids: string[]; visibility: string }

  if (!validIds(ids, MAX_VISIBILITY_IDS) || typeof visibility !== "string" || !VISIBILITIES.has(visibility)) {
    return NextResponse.json({ error: `Provide 1 to ${MAX_VISIBILITY_IDS} valid PDF IDs and a valid visibility` }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("pdfs")
    .update({ visibility, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, updated: data?.length ?? 0 })
}
