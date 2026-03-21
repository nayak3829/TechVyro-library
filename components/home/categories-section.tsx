"use client"

import Link from "next/link"
import { FolderOpen, ChevronRight, FileText, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Category, PDF } from "@/lib/types"

interface CategoriesSectionProps {
  categories: Category[]
  pdfsByCategory: Record<string, PDF[]>
}

export function CategoriesSection({ categories, pdfsByCategory }: CategoriesSectionProps) {
  if (categories.length === 0) return null

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <FolderOpen className="h-4 w-4" />
            Browse by Category
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-3 text-balance">
            Organized Study Materials
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Find PDFs organized by subjects for easier navigation
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((category) => {
            const categoryPdfs = pdfsByCategory[category.id] || []
            const pdfCount = categoryPdfs.length
            const totalDownloads = categoryPdfs.reduce((acc, pdf) => acc + pdf.download_count, 0)
            
            return (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <Card className="group h-full overflow-hidden border-border/50 bg-card hover:shadow-xl hover:border-primary/30 hover:-translate-y-2 transition-all duration-300">
                  {/* Category Header with Color */}
                  <div 
                    className="h-2 w-full"
                    style={{ backgroundColor: category.color }}
                  />
                  
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div 
                        className="shrink-0 h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md"
                        style={{ backgroundColor: category.color }}
                      >
                        <FolderOpen className="h-6 w-6 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-base sm:text-lg truncate group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            <span>{pdfCount} PDFs</span>
                          </div>
                          {totalDownloads > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                              <span>{totalDownloads.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                    </div>
                    
                    {/* Recent PDFs Preview */}
                    {categoryPdfs.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                          Recent Additions
                        </p>
                        <div className="space-y-1.5">
                          {categoryPdfs.slice(0, 2).map((pdf) => (
                            <div key={pdf.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                              <span className="truncate">{pdf.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
