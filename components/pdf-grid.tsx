"use client"

import { useMemo, useState } from "react"
import { PDFCard } from "@/components/pdf-card"
import { SearchBar } from "@/components/search-bar"
import { CategoryFilter } from "@/components/category-filter"
import { Empty } from "@/components/ui/empty"
import { FileText, ArrowUpDown, Clock, Eye, Download, SortAsc, Heart, ChevronLeft, ChevronRight, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    "newest": "Newest First",
    "oldest": "Oldest First",
    "most-viewed": "Most Viewed",
    "most-downloaded": "Most Downloaded",
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

    // Sort
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

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages)
      }
    }
    return pages
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Browse by Category</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                selectedCategory === null ? "ring-2 ring-primary" : "hover:border-primary/50"
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <p className="font-medium text-sm">All PDFs</p>
                <p className="text-xs text-muted-foreground mt-0.5">{pdfs.length} files</p>
              </CardContent>
            </Card>
            {categories.map((category) => (
              <Card 
                key={category.id}
                className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  selectedCategory === category.id ? "ring-2" : "hover:border-primary/50"
                }`}
                style={{
                  borderColor: selectedCategory === category.id ? category.color : undefined,
                  ringColor: selectedCategory === category.id ? category.color : undefined,
                }}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent className="p-3 sm:p-4 text-center">
                  <div 
                    className="h-10 w-10 mx-auto mb-2 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <FolderOpen className="h-5 w-5" style={{ color: category.color }} />
                  </div>
                  <p className="font-medium text-sm truncate">{category.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {categoryCounts[category.id] || 0} files
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Search and Filters */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isLoaded && favorites.length > 0 && (
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              >
                <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
                <span className="hidden xs:inline">Favorites</span> ({favorites.length})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                  <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
                  <span className="sm:hidden">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("newest")} className="gap-2">
                  <Clock className="h-4 w-4" /> Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")} className="gap-2">
                  <Clock className="h-4 w-4" /> Oldest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("most-viewed")} className="gap-2">
                  <Eye className="h-4 w-4" /> Most Viewed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("most-downloaded")} className="gap-2">
                  <Download className="h-4 w-4" /> Most Downloaded
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("alphabetical")} className="gap-2">
                  <SortAsc className="h-4 w-4" /> A-Z
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="text-xs sm:text-sm text-muted-foreground ml-auto">
              {filteredAndSortedPdfs.length} {filteredAndSortedPdfs.length === 1 ? "PDF" : "PDFs"}
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Category Filter Pills */}
      {selectedCategory && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Filtered by:</span>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </div>
      )}

      {/* PDF Grid */}
      {paginatedPdfs.length === 0 ? (
        <Empty
          icon={FileText}
          title="No PDFs found"
          description={search || selectedCategory ? "Try adjusting your search or filter" : "No PDFs have been uploaded yet"}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {paginatedPdfs.map((pdf) => (
            <PDFCard key={pdf.id} pdf={pdf} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Prev</span>
          </Button>
          
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, idx) => (
              typeof page === "number" ? (
                <Button
                  key={idx}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8 p-0 sm:h-9 sm:w-9 text-xs sm:text-sm"
                >
                  {page}
                </Button>
              ) : (
                <span key={idx} className="px-1 text-muted-foreground">...</span>
              )
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
          >
            <span className="hidden sm:inline mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
