import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const revalidate = 0
export const dynamic = "force-dynamic"

// Returns the full content-structure tree enriched with PDF + Quiz counts
// for each folder / category / section node.
export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ folders: [] })

    // ── 1. Fetch the folder tree from site_settings ──────────────────
    const { data: setting } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "folders")
      .single()

    const folders: FolderNode[] = (setting?.value as FolderNode[]) ?? []

    // ── 2. Fetch public enabled quizzes (light) ──────────────────────
    const { data: quizRows } = await supabase
      .from("quizzes")
      .select("id, structure_location, category")
      .eq("enabled", true)

    const quizzes = (quizRows || []).filter(
      (q) => Array.isArray((q as any).questions) ? (q as any).questions.length > 0 : true
    )

    // ── 3. Fetch PDFs + their old category names ─────────────────────
    const { data: pdfRows } = await supabase
      .from("pdfs")
      .select("id, category:categories(name), structure_location")

    const pdfs = pdfRows || []

    // ── 4. Build count maps ──────────────────────────────────────────
    const qByFolder: Record<string, number> = {}
    const qByCategory: Record<string, number> = {}
    const qBySection: Record<string, number> = {}

    for (const q of quizzes) {
      const loc = (q.structure_location as StructureLoc | null)
      if (!loc?.folderId) continue
      qByFolder[loc.folderId] = (qByFolder[loc.folderId] || 0) + 1
      if (loc.categoryId) qByCategory[loc.categoryId] = (qByCategory[loc.categoryId] || 0) + 1
      if (loc.sectionId) qBySection[loc.sectionId] = (qBySection[loc.sectionId] || 0) + 1
    }

    // PDF counts — prefer structure_location if available, else match by category name
    const pByFolder: Record<string, number> = {}
    const pByCategory: Record<string, number> = {}
    const pBySection: Record<string, number> = {}

    // Build a name→categoryId lookup inside the folder tree
    const catNameToId: Record<string, string> = {}
    const catNameToFolderId: Record<string, string> = {}
    for (const folder of folders) {
      for (const cat of folder.categories ?? []) {
        catNameToId[cat.name.toLowerCase()] = cat.id
        catNameToFolderId[cat.name.toLowerCase()] = folder.id
      }
    }

    for (const p of pdfs) {
      const loc = (p as any).structure_location as StructureLoc | null
      if (loc?.folderId) {
        // Has explicit structure_location
        pByFolder[loc.folderId] = (pByFolder[loc.folderId] || 0) + 1
        if (loc.categoryId) pByCategory[loc.categoryId] = (pByCategory[loc.categoryId] || 0) + 1
        if (loc.sectionId) pBySection[loc.sectionId] = (pBySection[loc.sectionId] || 0) + 1
      } else {
        // Fallback: match old category name to content structure category name
        const catName = (p.category as { name?: string } | null)?.name?.toLowerCase()
        if (catName && catNameToId[catName]) {
          const catId = catNameToId[catName]
          const folderId = catNameToFolderId[catName]
          pByFolder[folderId] = (pByFolder[folderId] || 0) + 1
          pByCategory[catId] = (pByCategory[catId] || 0) + 1
        }
      }
    }

    // ── 5. Enrich tree with counts ────────────────────────────────────
    const enriched = folders
      .filter((f) => f.enabled !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((folder) => ({
        ...folder,
        pdfCount: pByFolder[folder.id] || 0,
        quizCount: qByFolder[folder.id] || 0,
        categories: (folder.categories ?? [])
          .filter((c) => c.enabled !== false)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((cat) => ({
            ...cat,
            pdfCount: pByCategory[cat.id] || 0,
            quizCount: qByCategory[cat.id] || 0,
            sections: (cat.sections ?? [])
              .filter((s) => s.enabled !== false)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((sec) => ({
                ...sec,
                pdfCount: pBySection[sec.id] || 0,
                quizCount: qBySection[sec.id] || 0,
              })),
          })),
      }))

    // ── 6. Totals ─────────────────────────────────────────────────────
    const structuredPdfIds = new Set<string>()
    const structuredQuizIds = new Set<string>()

    for (const p of pdfs) {
      const loc = (p as any).structure_location as StructureLoc | null
      const catName = (p.category as { name?: string } | null)?.name?.toLowerCase()
      if (loc?.folderId || (catName && catNameToId[catName])) {
        structuredPdfIds.add(p.id)
      }
    }
    for (const q of quizzes) {
      const loc = (q.structure_location as StructureLoc | null)
      if (loc?.folderId) structuredQuizIds.add(q.id)
    }

    return NextResponse.json({
      folders: enriched,
      totals: {
        pdfs: pdfs.length,
        quizzes: quizzes.length,
        unstructuredPdfs: pdfs.length - structuredPdfIds.size,
        unstructuredQuizzes: quizzes.length - structuredQuizIds.size,
      },
    })
  } catch (err) {
    console.error("[content-structure]", err)
    return NextResponse.json({ folders: [] })
  }
}

interface StructureLoc {
  folderId: string
  categoryId: string
  sectionId: string
}

interface FolderNode {
  id: string
  name: string
  description: string
  icon: string
  color: string
  categories: CategoryNode[]
  order: number
  enabled: boolean
}

interface CategoryNode {
  id: string
  name: string
  color: string
  icon: string
  sections: SectionNode[]
  order: number
  enabled: boolean
}

interface SectionNode {
  id: string
  name: string
  order: number
  enabled: boolean
}
