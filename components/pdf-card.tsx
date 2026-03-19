import Link from "next/link"
import { FileText, Download, Calendar, Eye } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function PDFCard({ pdf }: PDFCardProps) {
  return (
    <Link href={`/pdf/${pdf.id}`}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 border-border/50 bg-card">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 flex items-center justify-center">
          <FileText className="h-16 w-16 text-primary/60 transition-transform group-hover:scale-110" />
          {pdf.category && (
            <Badge
              className="absolute top-3 left-3 text-xs"
              style={{
                backgroundColor: pdf.category.color,
                color: "#fff",
              }}
            >
              {pdf.category.name}
            </Badge>
          )}
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground line-clamp-2 text-balance group-hover:text-primary transition-colors">
            {pdf.title}
          </h3>
          {pdf.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {pdf.description}
            </p>
          )}
        </CardContent>
        
        <CardFooter className="px-4 pb-4 pt-0 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {pdf.view_count || 0} views
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {pdf.download_count}
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
