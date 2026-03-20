"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Share2, FileText, Calendar, Eye, Check, Maximize2, X, Star, Send } from "lucide-react"
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

  // Close fullscreen on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen])

  // Prevent body scroll when fullscreen is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isFullscreen])

  // Track view on component mount
  useEffect(() => {
    async function trackView() {
      try {
        await fetch(`/api/pdfs/${pdf.id}/view`, { method: "POST" })
        setViewCount((prev) => prev + 1)
      } catch (error) {
        console.error("[v0] Failed to track view:", error)
      }
    }
    trackView()
  }, [pdf.id])

  async function handleDownload() {
    setDownloading(true)
    try {
      // Download watermarked PDF
      const response = await fetch(`/api/pdfs/${pdf.id}/download-watermarked`)
      
      if (!response.ok) {
        throw new Error("Failed to download PDF")
      }
      
      // Get the blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      
      // Get filename from Content-Disposition header or use default
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
    } catch (error) {
      console.error("[v0] Download error:", error)
      toast.error("Failed to download PDF")
    } finally {
      setDownloading(false)
    }
  }

  async function handleShare() {
    const shareUrl = window.location.href

    // Always fallback to clipboard copy - Web Share API is unreliable in iframes/preview environments
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success("Link copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
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
    <div className="space-y-5 sm:space-y-8">
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

      <div className="grid gap-5 sm:gap-8 lg:grid-cols-3">
        {/* PDF Info Sidebar */}
        <Card className="lg:col-span-1 h-fit border-border/50 overflow-hidden">
          {/* PDF Preview Header */}
          <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 blur-xl" />
              <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl p-5 border border-border/50 shadow-xl">
                <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
              </div>
            </div>
            {pdf.category && (
              <Badge
                className="absolute top-3 left-3 text-xs px-2.5 py-1 font-medium shadow-md"
                style={{
                  backgroundColor: pdf.category.color,
                  color: "#fff",
                }}
              >
                {pdf.category.name}
              </Badge>
            )}
          </div>
          
          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="space-y-3">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground text-balance leading-tight">
                {pdf.title}
              </h1>
              {pdf.average_rating && (
                <div className="flex items-center gap-2">
                  <StarRating rating={pdf.average_rating} size="sm" />
                  <span className="text-sm text-muted-foreground">
                    ({pdf.review_count || 0} reviews)
                  </span>
                </div>
              )}
            </div>

            {pdf.description && (
              <p className="text-muted-foreground text-pretty text-sm leading-relaxed">
                {pdf.description}
              </p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center h-8 w-8 mx-auto mb-1.5 rounded-lg bg-blue-500/10">
                  <Eye className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-lg font-bold text-foreground">{viewCount}</p>
                <p className="text-[10px] text-muted-foreground">Views</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center h-8 w-8 mx-auto mb-1.5 rounded-lg bg-green-500/10">
                  <Download className="h-4 w-4 text-green-500" />
                </div>
                <p className="text-lg font-bold text-foreground">{pdf.download_count}</p>
                <p className="text-[10px] text-muted-foreground">Downloads</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-3 py-2 border-b border-border/30">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Uploaded {formatDate(pdf.created_at)}</span>
              </div>
              <div className="flex items-center gap-3 py-2">
                <FileText className="h-4 w-4 text-accent" />
                <span>Size: {formatFileSize(pdf.file_size)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Downloading..." : "Download PDF"}
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

            {/* Social Share Buttons */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Share this PDF</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 gap-2 hover:bg-[#25D366]/10 hover:border-[#25D366]/50 hover:text-[#25D366] transition-colors"
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(pdf.title + " - " + window.location.href)}`, "_blank")}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-10 gap-2 hover:bg-[#0088cc]/10 hover:border-[#0088cc]/50 hover:text-[#0088cc] transition-colors"
                  onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(pdf.title)}`, "_blank")}
                >
                  <Send className="h-4 w-4" />
                  Telegram
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <Card className="lg:col-span-2 border-border/50 overflow-hidden shadow-xl">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-muted/50 to-muted/30 px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Eye className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Document Preview</span>
                  <p className="text-[10px] text-muted-foreground">Scroll to read or open in fullscreen</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(true)}
                className="gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
              >
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline">Fullscreen</span>
              </Button>
            </div>
            <div className="aspect-[3/4] lg:aspect-[4/5] w-full bg-muted/20">
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                className="w-full h-full border-0"
                title={pdf.title}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Section */}
      <ReviewsSection pdfId={pdf.id} />

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground truncate max-w-md">
                {pdf.title}
              </h2>
              {pdf.category && (
                <Badge
                  style={{
                    backgroundColor: pdf.category.color,
                    color: "#fff",
                  }}
                >
                  {pdf.category.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Downloading..." : "Download"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="h-[calc(100vh-57px)] w-full">
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
