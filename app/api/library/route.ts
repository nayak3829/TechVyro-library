import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"

type Activity = {
  pdf_id: string
  last_viewed_at: string | null
  last_downloaded_at: string | null
  view_count: number
  download_count: number
}

export async function GET() {
  const client = await createClient()
  if (!client) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const db = createAdminClient()
  const [favoriteResult, activityResult] = await Promise.all([
    db.from("pdf_favorites").select("pdf_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    db.from("user_pdf_activity").select("pdf_id,last_viewed_at,last_downloaded_at,view_count,download_count")
      .eq("user_id", user.id).or("last_viewed_at.not.is.null,last_downloaded_at.not.is.null").limit(100),
  ])
  if (favoriteResult.error || activityResult.error) {
    return NextResponse.json({ error: "Could not load library" }, { status: 500 })
  }

  const favoriteRows = favoriteResult.data || []
  const activities = (activityResult.data || []) as Activity[]
  const ids = [...new Set([...favoriteRows.map(row => row.pdf_id), ...activities.map(row => row.pdf_id)])]
  if (ids.length === 0) return NextResponse.json({ saved: [], recent: [], downloads: [] })

  let pdfQuery = db.from("pdfs").select("id,title,description,thumbnail_url,page_count,view_count,download_count,updated_at,categories(id,name,color)").in("id", ids)
  pdfQuery = applyPublicPdfVisibility(pdfQuery)
  const { data: pdfs, error: pdfError } = await pdfQuery
  if (pdfError) return NextResponse.json({ error: "Could not load library" }, { status: 500 })
  const byId = new Map((pdfs || []).map(pdf => [pdf.id, pdf]))
  const saved = favoriteRows.flatMap(row => {
    const pdf = byId.get(row.pdf_id)
    return pdf ? [{ ...pdf, savedAt: row.created_at }] : []
  })
  const recent = activities.filter(row => row.last_viewed_at && byId.has(row.pdf_id))
    .sort((a, b) => Date.parse(b.last_viewed_at!) - Date.parse(a.last_viewed_at!)).slice(0, 30)
    .map(row => ({ ...byId.get(row.pdf_id), lastViewedAt: row.last_viewed_at, personalViewCount: row.view_count }))
  const downloads = activities.filter(row => row.last_downloaded_at && byId.has(row.pdf_id))
    .sort((a, b) => Date.parse(b.last_downloaded_at!) - Date.parse(a.last_downloaded_at!)).slice(0, 30)
    .map(row => ({ ...byId.get(row.pdf_id), lastDownloadedAt: row.last_downloaded_at, personalDownloadCount: row.download_count }))
  return NextResponse.json({ saved, recent, downloads })
}