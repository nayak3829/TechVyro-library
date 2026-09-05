"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, Bookmark, Clock3, Download, Eye, FileText, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { loginHref } from "@/lib/auth-redirect"

type LibraryPdf = {
  id: string
  title: string
  description?: string | null
  thumbnail_url?: string | null
  page_count?: number | null
  view_count?: number
  download_count?: number
  categories?: { name?: string; color?: string } | null
  savedAt?: string
  lastViewedAt?: string
  lastDownloadedAt?: string
  personalViewCount?: number
  personalDownloadCount?: number
}
type LibraryData = { saved: LibraryPdf[]; recent: LibraryPdf[]; downloads: LibraryPdf[] }
type Tab = keyof LibraryData

const EMPTY: LibraryData = { saved: [], recent: [], downloads: [] }
const tabs: Array<{ id: Tab; label: string; icon: typeof Bookmark }> = [
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "recent", label: "Recently viewed", icon: Clock3 },
  { id: "downloads", label: "Downloads", icon: Download },
]

function when(value?: string) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
}

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<LibraryData>(EMPTY)
  const [tab, setTab] = useState<Tab>("saved")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadLibrary = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/library", { cache: "no-store" })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || "Could not load your library")
      setData({ saved: body.saved || [], recent: body.recent || [], downloads: body.downloads || [] })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your library")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (authLoading) return
    if (user) void loadLibrary()
    else setLoading(false)
  }, [authLoading, user, loadLibrary])

  async function removeSaved(pdfId: string) {
    const response = await fetch("/api/favorites", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pdfId }),
    })
    if (response.ok) setData(current => ({ ...current, saved: current.saved.filter(pdf => pdf.id !== pdfId) }))
  }

  if (authLoading) return <><Header /><main className="grid min-h-[70vh] place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></main><Footer /></>
  if (!user) return <><Header /><main className="container mx-auto min-h-[70vh] px-4 py-20"><div className="mx-auto max-w-lg rounded-3xl border bg-card p-8 text-center shadow-sm"><BookOpen className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-4 text-3xl font-bold">Your study library</h1><p className="mt-2 text-muted-foreground">Sign in to keep saved PDFs, recent reading, and downloads together across devices.</p><Button asChild className="mt-6"><Link href={loginHref("/library")}>Sign in to My Library</Link></Button></div></main><Footer /></>

  const items = data[tab]
  return <><Header /><main className="min-h-[75vh] bg-gradient-to-b from-primary/5 via-background to-background py-10 sm:py-14">
    <div className="container mx-auto px-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-primary">Personal study shelf</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">My Library</h1><p className="mt-2 text-muted-foreground">Everything you saved, opened, or downloaded—ready to continue.</p></div>
        <Button variant="outline" onClick={() => void loadLibrary()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
      </div>
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Library sections">
        {tabs.map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} aria-label={`${item.label}, ${data[item.id].length} items`} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${tab === item.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40"}`}><item.icon className="h-4 w-4" />{item.label}<span aria-hidden="true" className={`rounded-full px-2 py-0.5 text-xs ${tab === item.id ? "bg-white/20" : "bg-muted"}`}>{data[item.id].length}</span></button>)}
      </div>
      {error && <div role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {loading ? <div className="grid place-items-center py-24"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div> : items.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed bg-card/60 px-6 py-16 text-center"><FileText className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-4 text-xl font-bold">Nothing here yet</h2><p className="mt-2 text-sm text-muted-foreground">{tab === "saved" ? "Save a PDF to build your personal collection." : tab === "recent" ? "PDFs you open while signed in will appear here." : "Your successful PDF downloads will appear here."}</p><Button asChild variant="outline" className="mt-5"><Link href="/#content">Explore PDFs</Link></Button></div> :
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map(pdf => <article key={pdf.id} className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <Link href={`/pdf/${pdf.id}`} className="block aspect-[16/9] overflow-hidden bg-muted"><img src={pdf.thumbnail_url || `/api/pdfs/${pdf.id}/thumbnail`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /></Link>
          <div className="p-4"><p className="text-xs font-semibold text-primary">{pdf.categories?.name || "Study PDF"}</p><Link href={`/pdf/${pdf.id}`} className="mt-1 block line-clamp-2 font-bold hover:text-primary">{pdf.title}</Link><p className="mt-2 line-clamp-2 min-h-10 text-xs text-muted-foreground">{pdf.description || "Continue studying this document."}</p>
            <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Eye className="h-3 w-3" />{pdf.view_count || 0}</span><span className="flex items-center gap-1"><Download className="h-3 w-3" />{pdf.download_count || 0}</span>{pdf.page_count ? <span>{pdf.page_count} pages</span> : null}</div>
            <div className="mt-4 flex items-center justify-between border-t pt-3"><span className="text-[11px] text-muted-foreground">{tab === "saved" ? `Saved ${when(pdf.savedAt)}` : tab === "recent" ? `Viewed ${when(pdf.lastViewedAt)}` : `Downloaded ${when(pdf.lastDownloadedAt)}`}</span>{tab === "saved" && <button onClick={() => void removeSaved(pdf.id)} aria-label={`Remove ${pdf.title} from saved`} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}</div>
          </div>
        </article>)}
      </div>}
    </div>
  </main><Footer /></>
}