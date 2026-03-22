"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Download, Share2, FileText, Calendar, Eye, 
  Check, Maximize2, X, Send, TrendingDown, BarChart3,
  BookOpen, Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ReviewsSection } from "@/components/reviews-section"
import { StarRating } from "@/components/star-rating"
import { FavoriteButton } from "@/components/favorite-button"
import type { PDF } from "@/lib/types"

interface PDFViewerProps {
  pdf: PDF
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown"
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function PDFViewer({ pdf }: PDFViewerProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [viewCount, setViewCount] = useState(pdf.view_count || 0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${pdf.file_path}`
  const categoryColor = pdf.category?.color || "#6366f1"

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen])

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isFullscreen])

  useEffect(() => {
    async function trackView() {
      try {
        await fetch(`/api/pdfs/${pdf.id}/view`, { method: "POST" })
        setViewCount(prev => prev + 1)
      } catch {}
    }
    trackView()
  }, [pdf.id])

  async function handleDownload() {
    setDownloading(true)
    try {
      const response = await fetch(`/api/pdfs/${pdf.id}/download-watermarked`)
      if (!response.ok) throw new Error("Failed to download PDF")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = pdf.title + "_TechVyro.pdf"
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match) filename = match[1]
      }
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success("Download started with TechVyro watermark!")
    } catch {
      toast.error("Failed to download PDF")
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    const shareUrl = window.location.href
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement("textarea")
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </div>
        <span>Back to Library</span>
      </Link>

      <div className="grid gap-5 sm:gap-8 md:grid-cols-3">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border-border/50 overflow-hidden shadow-lg">
            {/* Color top accent */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${categoryColor}, ${categoryColor}88)` }} />

            {/* Preview header */}
            <div
              className="relative aspect-[4/3] flex items-center justify-center overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${categoryColor}18 0%, ${categoryColor}08 100%)` }}
            >
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 30%, ${categoryColor}25, transparent 60%)` }} />
              <div className="relative">
                <div className="absolute -inset-4 rounded-2xl blur-2xl opacity-40" style={{ backgroundColor: categoryColor }} />
                <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl p-5 border border-border/50 shadow-2xl">
                  <FileText className="h-14 w-14 sm:h-16 sm:w-16" style={{ color: categoryColor }} />
                </div>
              </div>
              {pdf.category && (
                <Badge
                  className="absolute top-3 left-3 text-xs px-2.5 py-1 font-bold shadow-md border-0"
                  style={{ backgroundColor: categoryColor, color: "#fff" }}
                >
                  {pdf.category.name}
                </Badge>
              )}
            </div>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Title + Rating */}
              <div className="space-y-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-foreground leading-tight">
                  {pdf.title}
                </h1>
                {pdf.average_rating && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={pdf.average_rating} size="sm" />
                    <span className="text-xs text-muted-foreground">({pdf.review_count || 0} reviews)</span>
                  </div>
                )}
              </div>

              {pdf.description && (
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed line-clamp-3">
                  {pdf.description}
                </p>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: <Eye className="h-4 w-4" />, color: "#3b82f6", label: "Views", value: viewCount.toLocaleString() },
                  { icon: <Download className="h-4 w-4" />, color: "#22c55e", label: "Downloads", value: (pdf.download_count || 0).toLocaleString() },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-3 text-center border border-border/50 bg-muted/30">
                    <div className="flex items-center justify-center h-7 w-7 mx-auto mb-1 rounded-lg" style={{ backgroundColor: `${s.color}15` }}>
                      <span style={{ color: s.color }}>{s.icon}</span>
                    </div>
                    <p className="text-base font-extrabold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2.5 py-2 border-b border-border/30">
                  <Calendar className="h-3.5 w-3.5 shrink-0" style={{ color: categoryColor }} />
                  <span>Uploaded {formatDate(pdf.created_at)}</span>
                </div>
                <div className="flex items-center gap-2.5 py-2 border-b border-border/30">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>Size: {formatFileSize(pdf.file_size)}</span>
                </div>
                <div className="flex items-center gap-2.5 py-2">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-green-500" />
                  <span>Watermarked download</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 gap-2 font-semibold shadow-lg transition-all duration-300"
                  style={{ background: `linear-gradient(135deg, ${categoryColor}, ${categoryColor}cc)` }}
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "Downloading..." : "Download"}
                </Button>
                <FavoriteButton pdfId={pdf.id} size="md" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  className="hover:border-primary/50 hover:bg-primary/5"
                >
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
                </Button>
              </div>

              {/* Social share */}
              <div className="pt-3 border-t border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Share PDF</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 gap-1.5 text-xs hover:bg-[#25D366]/10 hover:border-[#25D366]/50 hover:text-[#25D366] transition-colors"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(pdf.title + " - " + window.location.href)}`, "_blank")}
                  >
                    <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 gap-1.5 text-xs hover:bg-[#0088cc]/10 hover:border-[#0088cc]/50 hover:text-[#0088cc] transition-colors"
                    onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(pdf.title)}`, "_blank")}
                  >
                    <Send className="h-3.5 w-3.5 shrink-0" />
                    Telegram
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Preview Panel */}
        <Card className="md:col-span-2 border-border/50 overflow-hidden shadow-xl">
          <CardContent className="p-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-muted/60 to-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400/70" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/70" />
                  <div className="h-3 w-3 rounded-full bg-green-400/70" />
                </div>
                <div className="hidden sm:block h-4 w-px bg-border/50" />
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-foreground">Document Preview</p>
                  <p className="text-[10px] text-muted-foreground">Scroll to read · Fullscreen for best experience</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(true)}
                className="gap-2 text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
            </div>

            <div className="aspect-[3/4] lg:aspect-[4/5] w-full bg-muted/10">
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full border-0"
                title={pdf.title}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews */}
      <ReviewsSection pdfId={pdf.id} />

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border/50 bg-background/95 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${categoryColor}20` }}>
                <FileText className="h-4 w-4" style={{ color: categoryColor }} />
              </div>
              <h2 className="font-bold text-foreground text-sm sm:text-base truncate">{pdf.title}</h2>
              {pdf.category && (
                <Badge className="hidden sm:flex text-xs border-0" style={{ backgroundColor: categoryColor, color: "#fff" }}>
                  {pdf.category.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className="h-8 px-2 sm:px-3 text-xs sm:text-sm gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{downloading ? "Downloading..." : "Download"}</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="h-[calc(100vh-53px)] w-full">
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title={`${pdf.title} - Fullscreen`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
