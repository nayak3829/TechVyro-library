import type { PDF } from "@/lib/types"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"

export const HOMEPAGE_PDF_LIMIT = 60

export const HOMEPAGE_PDF_SELECT = `
  id, title, description, file_size, page_count, category_id, download_count,
  view_count, average_rating, created_at, updated_at, allow_download, tags,
  content_type, content_category, content_subcategory, subject,
  category:categories(id, name, slug, color, created_at)
`

export interface HomepagePdfData {
  pdfs: PDF[]
  featured: {
    popular: PDF[]
    trending: PDF[]
    recent: PDF[]
    topRated: PDF[]
  }
}

type HomepagePdfRpcPayload = {
  pdfs?: Array<{ id?: unknown } & Record<string, unknown>>
  libraryIds?: unknown[]
  popularIds?: unknown[]
  trendingIds?: unknown[]
  topRatedIds?: unknown[]
}

function mapPdf(row: { id: string } & Record<string, unknown>): PDF {
  return {
    ...row,
    thumbnail_url: `/api/pdfs/${row.id}/thumbnail`,
  } as unknown as PDF
}

export function decodeHomepagePdfPayload(payload: unknown): HomepagePdfData | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null
  const value = payload as HomepagePdfRpcPayload
  if (!Array.isArray(value.pdfs)) return null

  const rows = value.pdfs.filter(
    (row): row is { id: string } & Record<string, unknown> =>
      !!row && typeof row === "object" && typeof row.id === "string"
  )
  const byId = new Map(rows.map(row => [row.id, mapPdf(row)]))
  const resolve = (ids: unknown): PDF[] => Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === "string").map(id => byId.get(id)).filter((pdf): pdf is PDF => !!pdf)
    : []

  return {
    pdfs: resolve(value.libraryIds),
    featured: {
      popular: resolve(value.popularIds),
      trending: resolve(value.trendingIds),
      recent: [],
      topRated: resolve(value.topRatedIds),
    },
  }
}

async function getLegacyHomepagePdfs(supabase: any): Promise<HomepagePdfData> {
  const query = () => applyPublicPdfVisibility(supabase.from("pdfs").select(HOMEPAGE_PDF_SELECT))
  const [library, popular, trending, topRated] = await Promise.all([
    query().order("created_at", { ascending: false }).limit(HOMEPAGE_PDF_LIMIT),
    query().gt("download_count", 0).order("download_count", { ascending: false }).limit(4),
    query().gt("view_count", 0).order("view_count", { ascending: false }).limit(4),
    query().gt("average_rating", 0).order("average_rating", { ascending: false }).limit(4),
  ])
  for (const [label, result] of Object.entries({ library, popular, trending, topRated })) {
    if (result.error) console.error(`[homepage] failed to load ${label} PDFs:`, result.error.message)
  }
  const mapRows = (data: Array<{ id: string } & Record<string, unknown>> | null): PDF[] =>
    (data || []).map(mapPdf)
  return {
    pdfs: mapRows(library.data),
    featured: {
      popular: mapRows(popular.data),
      trending: mapRows(trending.data),
      recent: [],
      topRated: mapRows(topRated.data),
    },
  }
}

export async function getHomepagePdfs(supabase: any): Promise<HomepagePdfData> {
  const { data, error } = await supabase.rpc("get_homepage_pdfs")
  if (!error) {
    const decoded = decodeHomepagePdfPayload(data)
    if (decoded) return decoded
    console.error("[homepage] invalid get_homepage_pdfs response; using compatibility queries")
  } else {
    console.error("[homepage] get_homepage_pdfs unavailable; using compatibility queries:", error.message)
  }
  return getLegacyHomepagePdfs(supabase)
}