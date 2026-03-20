"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { PDFCard } from "@/components/pdf-card"
import { SearchBar } from "@/components/search-bar"
import { Empty } from "@/components/ui/empty"
import { FileText, ArrowUpDown, Clock, Eye, Download, SortAsc, Heart, ChevronLeft, ChevronRight, FolderOpen, ArrowRight, Grid3X3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFavorites } from "@/hooks/use-favorites"
import type { PDF, Category } from "@/lib/types"

type SortOption = "newest" | "oldest" | "most-viewed" | "most-downloaded" | "alphabetical"

const ITEMS_PER_PAGE = 20

interface PDFGridProps {
  pdfs: PDF[]
  categories: Category[]
}

export function PDFGrid({ pdfs, categories }: PDFGridProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const { favorites, isLoaded } = useFavorites()

  const sortLabels: Record<SortOption, string> = {
    "newest": "Newest",
    "oldest": "Oldest",
    "most-viewed": "Most Viewed",
    "most-downloaded": "Downloads",
    "alphabetical": "A-Z",
  }

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    pdfs.forEach(pdf => {
      if (pdf.category_id) {
        counts[pdf.category_id] = (counts[pdf.category_id] || 0) + 1
      }
    })
    return counts
  }, [pdfs])

  const filteredAndSortedPdfs = useMemo(() => {
    let result = pdfs.filter((pdf) => {
      const matchesSearch = pdf.title.toLowerCase().includes(search.toLowerCase()) ||
        (pdf.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchesCategory = !selectedCategory || pdf.category_id === selectedCategory
      const matchesFavorites = !showFavoritesOnly || favorites.includes(pdf.id)
      return matchesSearch && matchesCategory && matchesFavorites
    })

    switch (sortBy) {
      case "newest":
        result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case "oldest":
        result = [...result].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case "most-viewed":
        result = [...result].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        break
      case "most-downloaded":
        result = [...result].sort((a, b) => b.download_count - a.download_count)
        break
      case "alphabetical":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    return result
  }, [pdfs, search, selectedCategory, sortBy, showFavoritesOnly, favorites])

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [search, selectedCategory, sortBy, showFavoritesOnly])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPdfs.length / ITEMS_PER_PAGE)
  const paginatedPdfs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredAndSortedPdfs.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAndSortedPdfs, currentPage])

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, 3, "...", totalPages)
      } else if (currentPage >= totalPages - 1) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage, "...", totalPages)
      }
    }
    return pages
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Categories Section - Clickable cards that link to category pages */}
      {categories.length > 0 && (
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Categories</h2>
            </div>
            <span className="text-xs text-muted-foreground">{categories.length} categories</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {/* All PDFs Card */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group ${
                selectedCategory === null && !showFavoritesOnly ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
              }`}
              onClick={() => {
                setSelectedCategory(null)
                setShowFavoritesOnly(false)
              }}
            >
              <CardContent className="p-2.5 sm:p-3 text-center">
                <div className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-1.5 sm:mb-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <p className="font-medium text-xs sm:text-sm truncate">All PDFs</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{pdfs.length} files</p>
              </CardContent>
            </Card>

            {/* Category Cards - Now link to dedicated pages */}
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <Card 
                  className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group h-full"
                  style={{
                    borderColor: selectedCategory === category.id ? category.color : undefined,
                  }}
                >
                  <CardContent className="p-2.5 sm:p-3 text-center">
                    <div 
                      className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-1.5 sm:mb-2 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: `${category.color}15` }}
                    >
                      <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: category.color }} />
                    </div>
                    <p className="font-medium text-xs sm:text-sm truncate">{category.name}</p>
                    <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                      <span>{categoryCounts[category.id] || 0} files</span>
                      <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: category.color }} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search and Filters */}
      <section className="space-y-3">
        <SearchBar value={search} onChange={setSearch} />
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Favorites Button */}
          {isLoaded && favorites.length > 0 && (
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly)
                if (!showFavoritesOnly) setSelectedCategory(null)
              }}
            >
              <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
              <span className="hidden xs:inline">Favorites</span>
              <span className="xs:hidden">Fav</span>
              ({favorites.length})
            </Button>
          )}

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
                <span className="sm:hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSortBy("newest")} className="gap-2 text-sm">
                <Clock className="h-4 w-4" /> Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")} className="gap-2 text-sm">
                <Clock className="h-4 w-4" /> Oldest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("most-viewed")} className="gap-2 text-sm">
                <Eye className="h-4 w-4" /> Most Viewed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("most-downloaded")} className="gap-2 text-sm">
                <Download className="h-4 w-4" /> Most Downloaded
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("alphabetical")} className="gap-2 text-sm">
                <SortAsc className="h-4 w-4" /> A-Z
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Results count */}
          <div className="text-xs text-muted-foreground ml-auto">
            {filteredAndSortedPdfs.length} {filteredAndSortedPdfs.length === 1 ? "PDF" : "PDFs"}
            {totalPages > 1 && ` | Page ${currentPage}/${totalPages}`}
          </div>
        </div>
      </section>

      {/* PDF Grid */}
      {paginatedPdfs.length === 0 ? (
        <Empty
          icon={FileText}
          title="No PDFs found"
          description={search || selectedCategory || showFavoritesOnly 
            ? "Try adjusting your search or filters" 
            : "No PDFs have been uploaded yet"}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {paginatedPdfs.map((pdf) => (
            <PDFCard key={pdf.id} pdf={pdf} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-0.5 sm:gap-1">
            {getPageNumbers().map((page, idx) => (
              typeof page === "number" ? (
                <Button
                  key={idx}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {page}
                </Button>
              ) : (
                <span key={idx} className="px-0.5 text-muted-foreground text-xs">...</span>
              )
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
