"use client"

import { useMemo, useState } from "react"
import { PDFCard } from "@/components/pdf-card"
import { SearchBar } from "@/components/search-bar"
import { Empty } from "@/components/ui/empty"
import { FileText, ArrowUpDown, Clock, Eye, Download, SortAsc, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PDF } from "@/lib/types"

type SortOption = "newest" | "oldest" | "most-viewed" | "most-downloaded" | "alphabetical"

const ITEMS_PER_PAGE = 20

interface CategoryPDFListProps {
  pdfs: PDF[]
  categoryName: string
}

export function CategoryPDFList({ pdfs, categoryName }: CategoryPDFListProps) {
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [currentPage, setCurrentPage] = useState(1)

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
      return matchesSearch
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
  }, [pdfs, search, sortBy])

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [search, sortBy])

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
    <div className="space-y-4 sm:space-y-6">
      {/* Search and Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 max-w-md">
          <SearchBar value={search} onChange={setSearch} placeholder={`Search in ${categoryName}...`} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm h-9">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">{sortLabels[sortBy]}</span>
                <span className="xs:hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {filteredAndSortedPdfs.length} {filteredAndSortedPdfs.length === 1 ? "PDF" : "PDFs"}
          </span>
        </div>
      </div>

      {/* PDF Grid */}
      {paginatedPdfs.length === 0 ? (
        <Empty
          icon={FileText}
          title="No PDFs found"
          description={search ? "Try a different search term" : `No PDFs in ${categoryName} yet`}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                  className="h-8 w-8 p-0 text-xs sm:text-sm"
                >
                  {page}
                </Button>
              ) : (
                <span key={idx} className="px-1 text-muted-foreground text-sm">...</span>
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
