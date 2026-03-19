"use client"

import { useMemo, useState } from "react"
import { PDFCard } from "@/components/pdf-card"
import { SearchBar } from "@/components/search-bar"
import { CategoryFilter } from "@/components/category-filter"
import { Empty } from "@/components/ui/empty"
import { FileText, ArrowUpDown, Clock, Eye, Download, SortAsc, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFavorites } from "@/hooks/use-favorites"
import type { PDF, Category } from "@/lib/types"

type SortOption = "newest" | "oldest" | "most-viewed" | "most-downloaded" | "alphabetical"

interface PDFGridProps {
  pdfs: PDF[]
  categories: Category[]
}

export function PDFGrid({ pdfs, categories }: PDFGridProps) {
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const { favorites, isLoaded } = useFavorites()

  const sortLabels: Record<SortOption, string> = {
    "newest": "Newest First",
    "oldest": "Oldest First",
    "most-viewed": "Most Viewed",
    "most-downloaded": "Most Downloaded",
    "alphabetical": "A-Z",
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar value={search} onChange={setSearch} />
        <div className="flex items-center gap-3">
          {isLoaded && favorites.length > 0 && (
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Heart className={`h-4 w-4 ${showFavoritesOnly ? "fill-current" : ""}`} />
              Favorites ({favorites.length})
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                {sortLabels[sortBy]}
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
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedPdfs.length} {filteredAndSortedPdfs.length === 1 ? "PDF" : "PDFs"}
          </div>
        </div>
      </div>
      
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {filteredAndSortedPdfs.length === 0 ? (
        <Empty
          icon={FileText}
          title="No PDFs found"
          description={search || selectedCategory ? "Try adjusting your search or filter" : "No PDFs have been uploaded yet"}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAndSortedPdfs.map((pdf) => (
            <PDFCard key={pdf.id} pdf={pdf} />
          ))}
        </div>
      )}
    </div>
  )
}
