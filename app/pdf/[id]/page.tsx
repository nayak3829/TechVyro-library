import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { PDFViewer } from "@/components/pdf-viewer"
import { PageAutoRefresh } from "@/components/page-auto-refresh"
import type { PDF } from "@/lib/types"
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from "@/lib/admin-auth"
import { cookies } from "next/headers"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"
import { publicPdfMetadata } from "@/lib/pdf-seo"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPDF(id: string): Promise<PDF | null> {
  if (!isAdminConfigured()) return null
  const supabase = createAdminClient()

  const { data, error } = await applyPublicPdfVisibility(supabase
    .from("pdfs")
    .select(`
      id, title, description, file_size, category_id, download_count,
      view_count, average_rating, review_count, created_at, updated_at,
       visibility, allow_download, tags, scheduled_at, seo_title, seo_description,
        seo_keywords, thumbnail_path, category:categories(*)
    `)
    .eq("id", id)
    )
    .single()

  if (error) {
    console.error("[v0] Error fetching PDF:", error)
    return null
  }

  return {
    ...data,
    thumbnail_url: `/api/pdfs/${data.id}/thumbnail`,
    thumbnail_path: undefined,
  } as unknown as PDF
}

async function getRelatedPDFs(categoryId: string | null, currentId: string): Promise<PDF[]> {
  if (!categoryId || !isAdminConfigured()) return []
  const supabase = createAdminClient()
  const { data } = await applyPublicPdfVisibility(supabase
    .from("pdfs")
    .select(`
      id, title, description, file_size, category_id, download_count,
      view_count, average_rating, review_count, created_at, updated_at,
       visibility, allow_download, tags, thumbnail_path, category:categories(*)
    `)
    .eq("category_id", categoryId)
    )
    .neq("id", currentId)
    .order("download_count", { ascending: false })
    .limit(6)
  return (data || []).map((pdf: { id: string; thumbnail_path?: string | null } & Record<string, unknown>) => ({
    ...pdf,
    thumbnail_url: `/api/pdfs/${pdf.id}/thumbnail`,
    thumbnail_path: undefined,
  })) as unknown as PDF[]
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const pdf = await getPDF(id)
  
  if (!pdf) {
    return {
      title: "PDF Not Found",
      robots: { index: false, follow: false },
    }
  }

  // getPDF is constrained at query time to public, published, and due records;
  // do not query drafts here merely to produce metadata.
  return publicPdfMetadata(pdf)
}

export default async function PDFDetailPage({ params }: PageProps) {
  const { id } = await params
  const pdf = await getPDF(id)
  const cookieStore = await cookies()
  const isAdmin = verifyAdminToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)
  if (!pdf) {
    notFound()
  }

  const relatedPDFs = await getRelatedPDFs(pdf.category_id, id)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <PDFViewer pdf={pdf} relatedPDFs={relatedPDFs} isAdmin={isAdmin} />
      </main>
      <PageAutoRefresh interval={60000} label="Live" showToast={false} />
    </div>
  )
}
