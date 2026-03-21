"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { FileText, Settings, Home, ExternalLink, Search, X, Sparkles, Clock, TrendingUp, Filter, ChevronDown, Flame, Download, Star, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

const RECENT_SEARCHES_KEY = "techvyro_recent_searches"
const MAX_RECENT_SEARCHES = 5

const quickFilters = [
  { id: "popular", label: "Popular", icon: Flame, color: "text-rose-500", bg: "bg-rose-500/10", hoverBg: "hover:bg-rose-500/20" },
  { id: "latest", label: "Latest", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10", hoverBg: "hover:bg-amber-500/20" },
  { id: "top-rated", label: "Top Rated", icon: Star, color: "text-yellow-500", bg: "bg-yellow-500/10", hoverBg: "hover:bg-yellow-500/20" },
  { id: "most-downloaded", label: "Most Downloaded", icon: Download, color: "text-green-500", bg: "bg-green-500/10", hoverBg: "hover:bg-green-500/20" },
]

const subjectSuggestions = [
  "NDA Notes", "Mathematics", "Physics", "Chemistry", "English", 
  "Computer Science", "Biology", "History", "Geography", "Economics",
  "Previous Year Papers", "CBSE Notes", "JEE", "NEET"
]

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isScrolled, setIsScrolled] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (stored) {
      setRecentSearches(JSON.parse(stored))
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
        setShowSuggestions(true)
      }
      if (e.key === "Escape") {
        setSearchOpen(false)
        setSearchQuery("")
        setShowSuggestions(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES)
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }, [recentSearches])

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim())
      // Scroll to content section
      const contentSection = document.getElementById("content")
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: "smooth" })
      }
      setSearchOpen(false)
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    saveRecentSearch(suggestion)
    setShowSuggestions(false)
    const contentSection = document.getElementById("content")
    if (contentSection) {
      contentSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  const filteredSuggestions = searchQuery
    ? subjectSuggestions.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    : subjectSuggestions.slice(0, 6)

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
      isScrolled 
        ? "border-border/60 bg-background/98 backdrop-blur-xl shadow-sm" 
        : "border-border/40 bg-background/95 backdrop-blur-xl"
    } supports-[backdrop-filter]:bg-background/80`}>
      {/* Gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="relative">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <FileText className="h-5 w-5 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold leading-tight tracking-tight">
              <span className="text-[#ef4444]">Tech</span>
              <span className="text-foreground">Vyro</span>
            </span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground -mt-0.5 hidden sm:block font-medium">PDF Library</span>
          </div>
        </Link>
        
        {/* Center Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4" ref={suggestionsRef}>
          <div className="relative w-full">
            <form onSubmit={handleSearch} className="relative w-full group">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search NDA notes, subjects, papers... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-10 pr-24 h-10 bg-muted/50 border-border/50 focus-visible:ring-primary focus-visible:ring-1 focus-visible:border-primary/50 text-sm rounded-xl transition-all duration-300"
                />
                
                {/* Filter Dropdown */}
                <div className="absolute right-2 flex items-center gap-1">
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 gap-1 text-xs rounded-lg hover:bg-primary/10"
                      >
                        <Filter className="h-3 w-3" />
                        <span className="hidden lg:inline">{selectedFilter || "Filter"}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {quickFilters.map((filter) => (
                        <DropdownMenuItem
                          key={filter.id}
                          onClick={() => setSelectedFilter(filter.label)}
                          className="gap-2"
                        >
                          <filter.icon className={`h-4 w-4 ${filter.color}`} />
                          {filter.label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Subjects</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSelectedFilter("Mathematics")}>
                        <BookOpen className="h-4 w-4 mr-2 text-blue-500" />
                        Mathematics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedFilter("Science")}>
                        <BookOpen className="h-4 w-4 mr-2 text-green-500" />
                        Science
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSelectedFilter("English")}>
                        <BookOpen className="h-4 w-4 mr-2 text-purple-500" />
                        English
                      </DropdownMenuItem>
                      {selectedFilter && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedFilter(null)} className="text-destructive">
                            Clear Filter
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                {/* Recent Searches */}
                {recentSearches.length > 0 && !searchQuery && (
                  <div className="p-3 border-b border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Recent Searches</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={clearRecentSearches}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((search, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(search)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs hover:bg-muted transition-colors"
                        >
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto Suggestions */}
                <div className="p-3">
                  <span className="text-xs font-medium text-muted-foreground mb-2 block">
                    {searchQuery ? "Suggestions" : "Popular Searches"}
                  </span>
                  <div className="space-y-1">
                    {filteredSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-muted/50 transition-colors"
                      >
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{suggestion}</span>
                        {!searchQuery && idx < 3 && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Trending</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Filter Pills */}
                <div className="p-3 border-t border-border/50 bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground mb-2 block">Quick Filters</span>
                  <div className="flex flex-wrap gap-2">
                    {quickFilters.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => {
                          setSelectedFilter(filter.label)
                          setShowSuggestions(false)
                          const contentSection = document.getElementById("content")
                          if (contentSection) {
                            contentSection.scrollIntoView({ behavior: "smooth" })
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${filter.bg} ${filter.color} ${filter.hoverBg} transition-colors`}
                      >
                        <filter.icon className="h-3 w-3" />
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {/* Mobile Search Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary"
            onClick={() => {
              setSearchOpen(!searchOpen)
              setShowSuggestions(true)
            }}
          >
            <Search className="h-4 w-4" />
          </Button>
          
          {/* Home link - visible on desktop */}
          <Button variant="ghost" size="sm" asChild className="hidden lg:flex px-3 gap-2 hover:bg-primary/10 hover:text-primary">
            <Link href="/">
              <Home className="h-4 w-4" />
              Home
            </Link>
          </Button>
          
          {/* Main Website Link */}
          <Button variant="ghost" size="sm" asChild className="hidden lg:flex px-3 gap-2 hover:bg-primary/10 hover:text-primary">
            <a href="https://www.techvyro.in/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Website
            </a>
          </Button>
          
          <ThemeToggle />
          
          <Button 
            variant="outline" 
            size="sm" 
            asChild 
            className="px-2.5 sm:px-3.5 gap-1.5 sm:gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
          >
            <Link href="/admin">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </Button>
        </nav>
      </div>
      
      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/98 backdrop-blur-xl border-b border-border/40 p-4 animate-in slide-in-from-top-2 duration-200">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search PDFs, notes, subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-12 bg-muted/50 border-border/50 focus-visible:ring-primary text-base rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-lg"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>
          
          {/* Recent Searches - Mobile */}
          {recentSearches.length > 0 && (
            <div className="mt-3 pb-3 border-b border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Recent</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={clearRecentSearches}
                >
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.slice(0, 3).map((search, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(search)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Quick Filter Chips */}
          <div className="mt-3">
            <span className="text-xs font-medium text-muted-foreground mb-2 block">Quick Filters</span>
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => {
                    setSelectedFilter(filter.label)
                    setSearchOpen(false)
                    const contentSection = document.getElementById("content")
                    if (contentSection) {
                      contentSection.scrollIntoView({ behavior: "smooth" })
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${filter.bg} ${filter.color} ${filter.hoverBg} transition-colors`}
                >
                  <filter.icon className="h-3 w-3" />
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
