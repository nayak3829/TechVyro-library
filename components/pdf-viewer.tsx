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
      // Increment download count
      await fetch(`/api/pdfs/${pdf.id}/download`, { method: "POST" })
      
      // Trigger download
      const link = document.createElement("a")
      link.href = pdfUrl
      link.download = pdf.title + ".pdf"
      link.click()
      
      toast.success("Download started!")
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
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* PDF Info Sidebar */}
        <Card className="lg:col-span-1 h-fit border-border/50">
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="flex items-center justify-center aspect-square max-h-40 sm:max-h-none bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 rounded-lg">
              <FileText className="h-14 w-14 sm:h-20 sm:w-20 text-primary/60" />
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground text-balance">
                  {pdf.title}
                </h1>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                  {pdf.average_rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <StarRating rating={pdf.average_rating} size="sm" />
                      <span className="text-muted-foreground">
                        ({pdf.review_count || 0})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {pdf.description && (
                <p className="text-muted-foreground text-pretty">
                  {pdf.description}
                </p>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Uploaded {formatDate(pdf.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>{viewCount} views</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  <span>{pdf.download_count} downloads</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{formatFileSize(pdf.file_size)}</span>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button 
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-sm sm:text-base"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  {downloading ? "..." : "Download"}
                </Button>
                <FavoriteButton pdfId={pdf.id} size="md" />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleShare}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </Button>
              </div>

              {/* Social Share Buttons */}
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-3">Share on</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 gap-1 sm:gap-2 text-xs sm:text-sm"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(pdf.title + " - " + window.location.href)}`, "_blank")}
                  >
                    <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 gap-1 sm:gap-2 text-xs sm:text-sm"
                    onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(pdf.title)}`, "_blank")}
                  >
                    <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                    Telegram
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <Card className="lg:col-span-2 border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-muted/30 px-4 py-2 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Preview</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </Button>
            </div>
            <div className="aspect-[3/4] lg:aspect-[4/5] w-full">
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
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-border/50 bg-background">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <h2 className="font-semibold text-sm sm:text-base text-foreground truncate">
                {pdf.title}
              </h2>
              {pdf.category && (
                <Badge
                  className="hidden sm:flex flex-shrink-0"
                  style={{
                    backgroundColor: pdf.category.color,
                    color: "#fff",
                  }}
                >
                  {pdf.category.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex"
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Downloading..." : "Download"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="sm:hidden h-8 w-8"
                onClick={handleDownload}
                disabled={downloading}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => setIsFullscreen(false)}
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
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
