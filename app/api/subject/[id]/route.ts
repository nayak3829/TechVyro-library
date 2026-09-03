import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const revalidate = 0
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: folderId } = await params
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "No db" }, { status: 500 })
    const adminSupabase = createAdminClient()

    // 1. Fetch folder tree
    const { data: setting } = await adminSupabase
      .from("site_settings")
      .select("value")
      .eq("key", "folders")
      .single()

    const folders: FolderNode[] = (setting?.value as FolderNode[]) ?? []
    const folder = folders.find((f) => f.id === folderId && f.enabled !== false)
    if (!folder) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Build name→id maps for legacy fallback
    const catNameToId: Record<string, string> = {}
    for (const cat of folder.categories ?? []) {
      catNameToId[cat.name.toLowerCase()] = cat.id
    }

    // 2. Fetch PDFs
    const { data: allPdfs } = await supabase
      .from("pdfs")
      .select("id, title, description, file_size, view_count, allow_download, created_at, scheduled_at, structure_location, category:categories(id,name,color)")
      .eq("visibility", "public")
      .eq("publish_status", "published")
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })

    const pdfs = (allPdfs || []).filter((p: any) => {
      const loc = p.structure_location as StructureLoc | null
      if (loc?.folderId === folderId) return true
      const catName = (p.category as any)?.name?.toLowerCase()
      return catName && catNameToId[catName]
    })

    // 3. Fetch Quizzes
    const { data: allQuizzes } = await supabase
      .from("quizzes")
      .select("id, title, description, category, difficulty, time_limit, questions, enabled, created_at, structure_location, url_slug")
      .eq("enabled", true)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })

    const quizzes = (allQuizzes || []).filter((q: any) => {
      const loc = q.structure_location as StructureLoc | null
      return loc?.folderId === folderId
    }).filter((q: any) => Array.isArray(q.questions) && q.questions.length > 0)

    // 4. Enrich categories with counts
    const pByCategory: Record<string, number> = {}
    const pBySection: Record<string, number> = {}
    const qByCategory: Record<string, number> = {}
    const qBySection: Record<string, number> = {}

    for (const p of pdfs) {
      const loc = (p as any).structure_location as StructureLoc | null
      if (loc?.categoryId) pByCategory[loc.categoryId] = (pByCategory[loc.categoryId] || 0) + 1
      if (loc?.sectionId) pBySection[loc.sectionId] = (pBySection[loc.sectionId] || 0) + 1
    }
    for (const q of quizzes) {
      const loc = (q as any).structure_location as StructureLoc | null
      if (loc?.categoryId) qByCategory[loc.categoryId] = (qByCategory[loc.categoryId] || 0) + 1
      if (loc?.sectionId) qBySection[loc.sectionId] = (qBySection[loc.sectionId] || 0) + 1
    }

    const enrichedFolder = {
      ...folder,
      pdfCount: pdfs.length,
      quizCount: quizzes.length,
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
    }

    return NextResponse.json({ folder: enrichedFolder, pdfs, quizzes })
  } catch (err) {
    console.error("[subject]", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

interface StructureLoc { folderId: string; categoryId: string; sectionId: string }
interface SectionNode { id: string; name: string; order: number; enabled: boolean }
interface CategoryNode { id: string; name: string; color: string; icon: string; sections: SectionNode[]; order: number; enabled: boolean }
interface FolderNode { id: string; name: string; description: string; icon: string; color: string; categories: CategoryNode[]; order: number; enabled: boolean }
