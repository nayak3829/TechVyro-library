import { extractToken, verifyAdminToken } from "@/lib/admin-auth"
import { createClient } from "@/lib/supabase/server"

export type PDFVisibility = "public" | "unlisted" | "private"

export interface PDFPolicyRecord {
  visibility?: PDFVisibility | null
  allow_download?: boolean | null
  scheduled_at?: string | null
  publish_status?: "draft" | "needs_review" | "published" | "rejected" | null
  storage_bucket?: "pdfs" | "community-pdfs" | null
  malware_status?: "pending" | "clean" | "suspicious" | "blocked" | "unknown" | null
  processing_status?: "queued" | "processing" | "completed" | "failed" | null
}

/**
 * Apply the complete public catalogue policy to a Supabase `pdfs` query.
 *
 * Keep this at the query boundary (rather than filtering rows after fetching):
 * the service-role client is used by a number of SSR pages and must never
 * accidentally serialize an unpublished row.
 */
// Supabase's generated relationship types can recursively expand when a
// generic builder is passed through a helper. Keep the boundary intentionally
// narrow to avoid making every caller instantiate the full database schema.
export function applyPublicPdfVisibility(query: any, now: Date = new Date()): any {
  return query
    .eq("visibility", "public")
    .eq("publish_status", "published")
    .eq("malware_status", "clean")
    // Community uploads additionally remain hidden until processing finishes.
    .or("storage_bucket.is.null,storage_bucket.neq.community-pdfs,and(storage_bucket.eq.community-pdfs,processing_status.eq.completed)")
    .or(`scheduled_at.is.null,scheduled_at.lte.${now.toISOString()}`)
}

export function canViewPDF(pdf: PDFPolicyRecord, isAdmin: boolean): boolean {
  if (isAdmin) return true
  if (pdf.publish_status && pdf.publish_status !== "published") return false
  if (pdf.malware_status !== "clean") return false
  if (!communityPdfPassesSafety(pdf)) return false
  if (pdf.visibility !== "public") return false
  return !pdf.scheduled_at || Date.parse(pdf.scheduled_at) <= Date.now()
}

export function canDownloadPDF(pdf: PDFPolicyRecord): boolean {
  return pdf.allow_download !== false
}

export function communityPdfPassesSafety(pdf: PDFPolicyRecord): boolean {
  return pdf.storage_bucket !== "community-pdfs" ||
    (pdf.malware_status === "clean" && pdf.processing_status === "completed")
}

export async function getPDFRequestIdentity(request: Request): Promise<{
  isAdmin: boolean
  isAuthenticated: boolean
  userId: string | null
}> {
  const isAdmin = verifyAdminToken(extractToken(request))
  if (isAdmin) return { isAdmin: true, isAuthenticated: true, userId: null }

  const supabase = await createClient()
  if (!supabase) return { isAdmin: false, isAuthenticated: false, userId: null }

  const { data, error } = await supabase.auth.getUser()
  return { isAdmin: false, isAuthenticated: !error && Boolean(data.user), userId: !error ? data.user?.id || null : null }
}