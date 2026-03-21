"use client"

import { useMemo, useState, useCallback } from "react"
import Link from "next/link"
import { PDFCard } from "@/components/pdf-card"
import { SearchBar } from "@/components/search-bar"
import { Empty } from "@/components/ui/empty"
import { 
  FileText, ArrowUpDown, Clock, Eye, Download, SortAsc, Heart, 
  ChevronLeft, ChevronRight, FolderOpen, ArrowRight, Grid3X3,
  LayoutGrid, List, Filter, X, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useFavorites } from "@/hooks/use-favorites"
import type { PDF, Category } from "@/lib/types"

type SortOption = "newest" | "oldest" | "most-viewed" | "most-downloaded" | "alphabetical" | "rating"
type ViewMode = "grid" | "compact"

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
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const { favorites, isLoaded } = useFavorites()

  const sortLabels: Record<SortOption, { label: string; icon: typeof Clock }> = {
    "newest": { label: "Newest", icon: Clock },
    "oldest": { label: "Oldest", icon: Clock },
    "most-viewed": { label: "Most Viewed", icon: Eye },
    "most-downloaded": { label: "Downloads", icon: Download },
    "alphabetical": { label: "A-Z", icon: SortAsc },
    "rating": { label: "Top Rated", icon: Sparkles },
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
      case "rating":
        result = [...result].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
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

  const clearAllFilters = useCallback(() => {
    setSearch("")
    setSelectedCategory(null)
    setShowFavoritesOnly(false)
    setSortBy("newest")
  }, [])

  const activeFiltersCount = [
    search,
    selectedCategory,
    showFavoritesOnly,
    sortBy !== "newest"
  ].filter(Boolean).length

  // Category selection card
  const CategoryCard = ({ category, isSelected, count, onClick }: { 
    category?: Category
    isSelected: boolean
    count: number
    onClick: () => void
  }) => (
    <Card 
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group ${
        isSelected 
          ? "ring-2 ring-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md" 
          : "hover:border-primary/50 hover:shadow-primary/10"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4 text-center">
        <div className="relative h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3">
          <div 
            className="absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity"
            style={{ backgroundColor: category?.color || "hsl(var(--primary))" }}
          />
          <div 
            className="relative h-full w-full rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md"
            style={{ backgroundColor: category?.color || "hsl(var(--primary))" }}
          >
            {category ? (
              <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            ) : (
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            )}
          </div>
        </div>
        <p className="font-semibold text-xs sm:text-sm truncate">{category?.name || "All PDFs"}</p>
        <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
          <span>{count} files</span>
          {category && (
            <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" style={{ color: category.color }} />
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">PDF Library</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">{pdfs.length} documents available</p>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="space-y-4 sm:space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground">Browse Categories</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{categories.length} categories available</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
            {/* All PDFs Card */}
            <CategoryCard
              isSelected={selectedCategory === null && !showFavoritesOnly}
              count={pdfs.length}
              onClick={() => {
                setSelectedCategory(null)
                setShowFavoritesOnly(false)
              }}
            />

            {/* Category Cards */}
            {categories.map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <CategoryCard
                  category={category}
                  isSelected={selectedCategory === category.id}
                  count={categoryCounts[category.id] || 0}
                  onClick={() => {}}
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Search and Filters */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          
          {/* Mobile Filter Button + Results */}
          <div className="flex sm:hidden items-center gap-2">
            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-10 flex-1">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/10 text-primary">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader>
                <SheetTitle>Filter & Sort</SheetTitle>
                <SheetDescription>Customize how PDFs are displayed</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Sort Options */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Sort By</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(sortLabels).map(([key, { label, icon: Icon }]) => (
                      <Button
                        key={key}
                        variant={sortBy === key ? "default" : "outline"}
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => {
                          setSortBy(key as SortOption)
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Favorites Toggle */}
                {isLoaded && favorites.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Quick Filters</h4>
                    <Button
                      variant={showFavoritesOnly ? "default" : "outline"}
                      className={`w-full justify-start gap-2 ${
                        showFavoritesOnly ? "bg-gradient-to-r from-pink-500 to-rose-500 border-0" : ""
                      }`}
                      onClick={() => {
                        setShowFavoritesOnly(!showFavoritesOnly)
                        if (!showFavoritesOnly) setSelectedCategory(null)
                      }}
                    >
                      <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
                      Favorites Only ({favorites.length})
                    </Button>
                  </div>
                )}

                {/* Clear All */}
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      clearAllFilters()
                      setMobileFiltersOpen(false)
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
            
            {/* Mobile Results Count */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <span className="font-semibold text-foreground">{filteredAndSortedPdfs.length}</span>
              <span>PDFs</span>
            </div>
          </div>
          
          {/* Desktop Filter Bar */}
          <div className="hidden sm:flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Favorites Button */}
            {isLoaded && favorites.length > 0 && (
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                className={`gap-1.5 text-xs h-9 px-3 transition-all duration-300 ${
                  showFavoritesOnly 
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 border-0 shadow-md shadow-pink-500/20" 
                    : "hover:border-pink-500/50 hover:text-pink-500"
                }`}
                onClick={() => {
                  setShowFavoritesOnly(!showFavoritesOnly)
                  if (!showFavoritesOnly) setSelectedCategory(null)
                }}
              >
                <Heart className={`h-3.5 w-3.5 ${showFavoritesOnly ? "fill-current" : ""}`} />
                Favorites
                <span className="bg-background/20 px-1.5 py-0.5 rounded-md text-[10px] font-semibold">
                  {favorites.length}
                </span>
              </Button>
            )}

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 px-3 hover:border-primary/50">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortLabels[sortBy].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("newest")} className="gap-2 text-sm cursor-pointer">
                  <Clock className="h-4 w-4 text-primary" /> Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("oldest")} className="gap-2 text-sm cursor-pointer">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Oldest First
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("most-viewed")} className="gap-2 text-sm cursor-pointer">
                  <Eye className="h-4 w-4 text-blue-500" /> Most Viewed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("most-downloaded")} className="gap-2 text-sm cursor-pointer">
                  <Download className="h-4 w-4 text-green-500" /> Most Downloaded
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("rating")} className="gap-2 text-sm cursor-pointer">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Top Rated
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("alphabetical")} className="gap-2 text-sm cursor-pointer">
                  <SortAsc className="h-4 w-4 text-accent" /> A-Z
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border border-border/50 rounded-lg p-0.5">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "compact" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("compact")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-9 px-3 text-muted-foreground hover:text-destructive"
                onClick={clearAllFilters}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}

            {/* Results count */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto bg-muted/50 px-3 py-1.5 rounded-lg">
              <span className="font-medium text-foreground">{filteredAndSortedPdfs.length}</span>
              <span>{filteredAndSortedPdfs.length === 1 ? "PDF" : "PDFs"}</span>
              {totalPages > 1 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span>Page <span className="font-medium text-foreground">{currentPage}</span>/{totalPages}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(search || selectedCategory || showFavoritesOnly) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Active filters:</span>
            {search && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Search: {search.slice(0, 15)}{search.length > 15 ? "..." : ""}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary" className="gap-1 pr-1">
                {categories.find(c => c.id === selectedCategory)?.name}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setSelectedCategory(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {showFavoritesOnly && (
              <Badge variant="secondary" className="gap-1 pr-1 bg-pink-500/10 text-pink-600">
                Favorites
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => setShowFavoritesOnly(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}

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
          <div className={
            viewMode === "grid" 
              ? "grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          }>
            {paginatedPdfs.map((pdf) => (
              <PDFCard key={pdf.id} pdf={pdf} compact={viewMode === "compact"} />
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
              className="h-9 w-9 p-0"
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
                    className={`h-9 w-9 p-0 text-xs ${currentPage === page ? "bg-primary shadow-md shadow-primary/20" : ""}`}
                  >
                    {page}
                  </Button>
                ) : (
                  <span key={idx} className="px-1 text-muted-foreground text-xs">...</span>
                )
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
