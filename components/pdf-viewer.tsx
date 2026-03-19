"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Download, Share2, FileText, Calendar, Eye, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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

  const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/pdfs/${pdf.file_path}`

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
    <div className="space-y-6">
      <Link 
        href="/" 
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* PDF Info Sidebar */}
        <Card className="lg:col-span-1 h-fit border-border/50">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-center aspect-square bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 rounded-lg">
              <FileText className="h-20 w-20 text-primary/60" />
            </div>

            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground text-balance">
                  {pdf.title}
                </h1>
                {pdf.category && (
                  <Badge
                    className="mt-2"
                    style={{
                      backgroundColor: pdf.category.color,
                      color: "#fff",
                    }}
                  >
                    {pdf.category.name}
                  </Badge>
                )}
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

              <div className="flex gap-3 pt-2">
                <Button 
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading ? "Downloading..." : "Download"}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleShare}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PDF Preview */}
        <Card className="lg:col-span-2 border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-muted/30 px-4 py-2 border-b border-border/50 flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Preview</span>
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
    </div>
  )
}
