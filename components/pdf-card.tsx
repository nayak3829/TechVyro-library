"use client"

import Link from "next/link"
import { FileText, Download, Eye, Star, Sparkles, Calendar, TrendingUp, Award, Flame, Clock, Bookmark, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FavoriteButton } from "@/components/favorite-button"
import { toast } from "sonner"
import type { PDF } from "@/lib/types"

interface PDFCardProps {
  pdf: PDF
  compact?: boolean
  showRank?: boolean
  rank?: number
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown"
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

function isNewPDF(dateString: string): boolean {
  const uploadDate = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 7
}

function isMostDownloaded(downloadCount: number): boolean {
  return downloadCount >= 200
}

function isTopRated(rating: number | null): boolean {
  return rating !== null && rating >= 4.5
}

function isPopular(downloadCount: number, viewCount: number): boolean {
  return downloadCount >= 50 || viewCount >= 200
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

// Quick download handler
function handleQuickDownload(e: React.MouseEvent, pdf: PDF) {
  e.preventDefault()
  e.stopPropagation()
  
  if (pdf.file_url) {
    // Open in new tab for download
    window.open(pdf.file_url, '_blank')
    toast.success(`Downloading "${pdf.title}"`)
  }
}

export function PDFCard({ pdf, compact = false, showRank = false, rank }: PDFCardProps) {
  const isNew = isNewPDF(pdf.created_at)
  const isMostDL = isMostDownloaded(pdf.download_count)
  const isTop = isTopRated(pdf.average_rating)
  const isPop = isPopular(pdf.download_count, pdf.view_count || 0)
  
  // Determine the primary badge to show
  const getBadge = () => {
    if (isNew) return { label: "New", icon: Sparkles, gradient: "from-amber-500 to-orange-500" }
    if (isTop) return { label: "Top Rated", icon: Star, gradient: "from-yellow-500 to-amber-500" }
    if (isMostDL) return { label: "Most Downloaded", icon: Download, gradient: "from-green-500 to-emerald-500" }
    if (isPop) return { label: "Popular", icon: Flame, gradient: "from-rose-500 to-pink-500" }
    return null
  }
  
  const badge = getBadge()
  
  if (compact) {
    return (
      <Link href={`/pdf/${pdf.id}`}>
        <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 border-border/50 bg-card hover:border-primary/30">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              {/* PDF Icon */}
              <div className="relative shrink-0">
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 group-hover:from-primary/25 group-hover:to-accent/20 group-hover:scale-105 transition-all duration-300">
                  <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                {badge && (
                  <div className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r ${badge.gradient} shadow-md`}>
                    <badge.icon className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {pdf.title}
                  </h3>
                  <FavoriteButton pdfId={pdf.id} size="sm" variant="ghost" />
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {pdf.category && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        backgroundColor: pdf.category.color + "20",
                        color: pdf.category.color,
                      }}
                    >
                      {pdf.category.name}
                    </Badge>
                  )}
                  {badge && (
                    <Badge className={`text-[10px] px-1.5 py-0 bg-gradient-to-r ${badge.gradient} text-white border-0`}>
                      {badge.label}
                    </Badge>
                  )}
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {(pdf.view_count || 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {pdf.download_count.toLocaleString()}
                  </span>
                  {pdf.average_rating && (
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
                      {pdf.average_rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  return (
    <Link href={`/pdf/${pdf.id}`}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/25 hover:-translate-y-2 hover:scale-[1.03] border-border/50 bg-card hover:border-primary/50">
        {/* PDF Preview Area */}
        <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
          {/* Background gradient with pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 group-hover:from-primary/25 group-hover:via-accent/20 group-hover:to-primary/15 transition-all duration-500" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
          
          {/* PDF Icon with enhanced animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-6 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/40 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-card/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-border/50 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-2xl">
                <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-primary group-hover:text-primary/90 transition-colors" />
              </div>
            </div>
          </div>

          {/* Category Badge */}
          {pdf.category && (
            <Badge
              className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 font-medium shadow-lg border-0"
              style={{
                backgroundColor: pdf.category.color,
                color: "#fff",
              }}
            >
              {pdf.category.name}
            </Badge>
          )}
          
          {/* Status Badge - Top Right */}
          {badge && (
            <Badge className={`absolute top-2 right-10 sm:top-3 sm:right-12 text-[9px] sm:text-[10px] px-2 py-0.5 bg-gradient-to-r ${badge.gradient} text-white border-0 shadow-lg flex items-center gap-1`}>
              <badge.icon className="h-2.5 w-2.5" />
              {badge.label}
            </Badge>
          )}

          {/* Favorite/Bookmark Button */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
            <FavoriteButton pdfId={pdf.id} size="sm" variant="overlay" />
          </div>
          
          {/* Bottom gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-card via-card/90 to-transparent" />
          
          {/* Quick Actions Overlay on Hover */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            {/* Stats */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-card/95 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-medium shadow-md">
                <Download className="h-3 w-3 text-green-500" />
                <span>{pdf.download_count.toLocaleString()}</span>
              </div>
              {pdf.average_rating && (
                <div className="flex items-center gap-0.5 bg-card/95 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-medium shadow-md">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>{pdf.average_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            
            {/* Quick Download Button */}
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-[10px] font-medium bg-green-500/90 hover:bg-green-500 text-white border-0 shadow-md"
              onClick={(e) => handleQuickDownload(e, pdf)}
            >
              <Download className="h-3 w-3 mr-1" />
              Quick DL
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <CardContent className="p-2.5 sm:p-4">
          <h3 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-2 text-balance group-hover:text-primary transition-colors leading-tight">
            {pdf.title}
          </h3>
          {pdf.description && (
            <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground line-clamp-2 hidden sm:block leading-relaxed">
              {pdf.description}
            </p>
          )}
        </CardContent>
        
        {/* Footer Stats */}
        <CardFooter className="px-2.5 sm:px-4 pb-2.5 sm:pb-4 pt-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            {pdf.average_rating ? (
              <span className="flex items-center gap-0.5 sm:gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                <Star className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium text-amber-600 dark:text-amber-400">{pdf.average_rating.toFixed(1)}</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 sm:gap-1 bg-muted/50 px-1.5 py-0.5 rounded-md">
                <Eye className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                <span>{(pdf.view_count || 0).toLocaleString()}</span>
              </span>
            )}
          </div>
          <span className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-muted-foreground bg-green-500/10 px-1.5 py-0.5 rounded-md">
            <Download className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-green-500" />
            <span className="font-medium text-green-600 dark:text-green-400">{pdf.download_count.toLocaleString()}</span>
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
