export interface PublicPdfStats {
  totalPdfs: number
  totalDownloads: number
  totalViews: number
  avgRating: number
  thisWeekUploads: number
}

export async function getPublicPdfStats(supabase: any): Promise<{
  data: PublicPdfStats | null
  error: { message: string } | null
}> {
  const { data, error } = await supabase.rpc("get_public_pdf_stats")
  if (error) return { data: null, error }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { data: null, error: { message: "Public PDF stats returned no data" } }
  return {
    data: {
      totalPdfs: Number(row.total_pdfs) || 0,
      totalDownloads: Number(row.total_downloads) || 0,
      totalViews: Number(row.total_views) || 0,
      avgRating: Number(Number(row.avg_rating || 0).toFixed(1)),
      thisWeekUploads: Number(row.this_week_uploads) || 0,
    },
    error: null,
  }
}