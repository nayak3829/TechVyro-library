import Link from "next/link"
import { FileText, Download, Eye, Star, Sparkles } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FavoriteButton } from "@/components/favorite-button"
import type { PDF } from "@/lib/types"

interface PDFCardProps {
  pdf: PDF
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

export function PDFCard({ pdf }: PDFCardProps) {
  const isNew = isNewPDF(pdf.created_at)
  
  return (
    <Link href={`/pdf/${pdf.id}`}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/15 hover:-translate-y-1.5 border-border/50 bg-card hover:border-primary/30">
        {/* PDF Preview Area */}
        <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
          {/* Background gradient with pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
          
          {/* PDF Icon with animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-card/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-border/50 group-hover:border-primary/30 group-hover:scale-105 transition-all duration-300 shadow-lg">
                <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
              </div>
            </div>
          </div>

          {/* Category Badge */}
          {pdf.category && (
            <Badge
              className="absolute top-2 left-2 sm:top-3 sm:left-3 text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 font-medium shadow-md"
              style={{
                backgroundColor: pdf.category.color,
                color: "#fff",
              }}
            >
              {pdf.category.name}
            </Badge>
          )}
          
          {/* New Badge */}
          {isNew && (
            <Badge className="absolute top-2 right-10 sm:top-3 sm:right-12 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md">
              <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
              New
            </Badge>
          )}

          {/* Favorite Button */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
            <FavoriteButton pdfId={pdf.id} size="sm" variant="overlay" />
          </div>
          
          {/* Bottom gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
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
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
            {pdf.average_rating ? (
              <span className="flex items-center gap-0.5 sm:gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                <Star className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium text-amber-600 dark:text-amber-400">{pdf.average_rating.toFixed(1)}</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 sm:gap-1">
                <Eye className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                <span>{pdf.view_count || 0}</span>
              </span>
            )}
          </div>
          <span className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
            <Download className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
            <span className="font-medium">{pdf.download_count}</span>
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
