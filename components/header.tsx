"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Settings, Home, ExternalLink, Search, X, Sparkles, Clock, TrendingUp, Filter, ChevronDown, Flame, Download, Star, BookOpen, FolderOpen } from "lucide-react"
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

const FALLBACK_SUGGESTIONS = [
  "NDA Notes", "Mathematics", "Physics", "Chemistry", "English",
  "Computer Science", "Biology", "History", "Geography", "Economics",
  "Previous Year Papers", "CBSE Notes", "JEE", "NEET"
]

interface LiveResult {
  id: string
  title: string
  download_count: number
  view_count: number
}

export function Header() {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isScrolled, setIsScrolled] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [liveResults, setLiveResults] = useState<LiveResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    fetch("/api/categories")
      .then(r => r.json())
      .then(data => {
        const cats: { name: string }[] = data.categories || []
        setCategories(cats.map(c => c.name))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus()
  }, [searchOpen])

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQuery.trim()) {
      setLiveResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pdfs/search?q=${encodeURIComponent(searchQuery.trim())}&limit=5`)
        const data = await res.json()
        setLiveResults(data.pdfs || [])
      } catch {
        setLiveResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, MAX_RECENT_SEARCHES)
    setRecentSearches(updated)
    try { sessionStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)) } catch {}
  }, [recentSearches])

  const clearRecentSearches = () => {
    setRecentSearches([])
    try { sessionStorage.removeItem(RECENT_SEARCHES_KEY) } catch {}
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim())
      setSearchOpen(false)
      setShowSuggestions(false)
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}#content`)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    saveRecentSearch(suggestion)
    setShowSuggestions(false)
    router.push(`/?q=${encodeURIComponent(suggestion)}#content`)
  }

  const handleResultClick = (pdf: LiveResult) => {
    saveRecentSearch(pdf.title)
    setSearchOpen(false)
    setShowSuggestions(false)
    setSearchQuery("")
    router.push(`/pdf/${pdf.id}`)
  }

  const suggestions = categories.length > 0 ? categories : FALLBACK_SUGGESTIONS

  const filteredSuggestions = searchQuery
    ? suggestions.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : suggestions.slice(0, 6)

  const SuggestionsPanel = () => (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
      {recentSearches.length > 0 && !searchQuery && (
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Recent Searches</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={clearRecentSearches}>
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((search, idx) => (
              <button key={idx} onClick={() => handleSuggestionClick(search)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs hover:bg-muted transition-colors">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {searchQuery && liveResults.length > 0 && (
        <div className="p-3 border-b border-border/50">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Live Results
            </span>
            {searching && <span className="inline-block h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
          </div>
          <div className="space-y-1">
            {liveResults.map((pdf) => (
              <button key={pdf.id} onClick={() => handleResultClick(pdf)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left hover:bg-primary/8 transition-colors group">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground group-hover:text-primary transition-colors">{pdf.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Download className="h-2.5 w-2.5" />{pdf.download_count}</span>
                    <span className="flex items-center gap-0.5"><TrendingUp className="h-2.5 w-2.5" />{pdf.view_count}</span>
                  </div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Open</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {searching && liveResults.length === 0 && searchQuery && (
        <div className="p-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Searching...
        </div>
      )}

      {filteredSuggestions.length > 0 && (
        <div className="p-3">
          <span className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            {searchQuery ? (
              <><Search className="h-3 w-3" /> Suggestions</>
            ) : (
              <><FolderOpen className="h-3 w-3" /> Browse by Subject</>
            )}
          </span>
          <div className="space-y-1">
            {filteredSuggestions.map((suggestion, idx) => (
              <button key={idx} onClick={() => handleSuggestionClick(suggestion)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-muted/50 transition-colors">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>{suggestion}</span>
                {!searchQuery && idx < 3 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">Trending</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-border/50 bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground mb-2 block">Quick Filters</span>
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setSelectedFilter(filter.label)
                setShowSuggestions(false)
                document.getElementById("content")?.scrollIntoView({ behavior: "smooth" })
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
  )

  return (
    <header className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
      isScrolled
        ? "border-border/60 bg-background/98 backdrop-blur-xl shadow-sm"
        : "border-border/40 bg-background/95 backdrop-blur-xl"
    } supports-[backdrop-filter]:bg-background/80`}>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between gap-4 px-4">
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

        {/* Desktop Search */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4" ref={suggestionsRef}>
          <div className="relative w-full">
            <form onSubmit={handleSearch} className="relative w-full group">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search PDFs, notes, subjects... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-10 pr-24 h-10 bg-muted/50 border-border/50 focus-visible:ring-primary focus-visible:ring-1 focus-visible:border-primary/50 text-sm rounded-xl transition-all duration-300"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {searching && (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  )}
                  {searchQuery && !searching && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => { setSearchQuery(""); setLiveResults([]) }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs rounded-lg hover:bg-primary/10">
                        <Filter className="h-3 w-3" />
                        <span className="hidden lg:inline">{selectedFilter || "Filter"}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {quickFilters.map((filter) => (
                        <DropdownMenuItem key={filter.id} onClick={() => setSelectedFilter(filter.label)} className="gap-2">
                          <filter.icon className={`h-4 w-4 ${filter.color}`} />
                          {filter.label}
                        </DropdownMenuItem>
                      ))}
                      {categories.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Subjects</DropdownMenuLabel>
                          {categories.slice(0, 5).map(cat => (
                            <DropdownMenuItem key={cat} onClick={() => setSelectedFilter(cat)} className="gap-2">
                              <BookOpen className="h-4 w-4 text-primary/60" />
                              {cat}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
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

            {showSuggestions && <SuggestionsPanel />}
          </div>
        </div>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="ghost" size="sm" className="md:hidden h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary" onClick={() => { setSearchOpen(!searchOpen); setShowSuggestions(true) }}>
            <Search className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" asChild className="hidden lg:flex px-3 gap-2 hover:bg-primary/10 hover:text-primary">
            <Link href="/"><Home className="h-4 w-4" />Home</Link>
          </Button>

          <Button variant="ghost" size="sm" asChild className="hidden lg:flex px-3 gap-2 hover:bg-primary/10 hover:text-primary">
            <a href="https://www.techvyro.in/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />Website
            </a>
          </Button>

          <ThemeToggle />

          <Button variant="outline" size="sm" asChild className="px-2.5 sm:px-3.5 gap-1.5 sm:gap-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <Link href="/admin">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          </Button>
        </nav>
      </div>

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background/98 backdrop-blur-xl border-b border-border/40 p-4 animate-in slide-in-from-top-2 duration-200 z-50">
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
              <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-lg" onClick={() => { setSearchQuery(""); setLiveResults([]) }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>

          {searching && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Searching...
            </div>
          )}

          {liveResults.length > 0 && searchQuery && (
            <div className="mt-3 space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Results</span>
              {liveResults.map(pdf => (
                <button key={pdf.id} onClick={() => { handleResultClick(pdf); setSearchOpen(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left bg-muted/40 hover:bg-muted transition-colors">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 truncate font-medium">{pdf.title}</span>
                  <Download className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">{pdf.download_count}</span>
                </button>
              ))}
            </div>
          )}

          {recentSearches.length > 0 && !searchQuery && (
            <div className="mt-3 pb-3 border-b border-border/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Recent</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearRecentSearches}>Clear</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.slice(0, 3).map((search, idx) => (
                  <button key={idx} onClick={() => handleSuggestionClick(search)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!searchQuery && (
            <div className="mt-3">
              <span className="text-xs font-medium text-muted-foreground mb-2 block">
                {categories.length > 0 ? "Browse Subjects" : "Quick Filters"}
              </span>
              <div className="flex flex-wrap gap-2">
                {categories.length > 0
                  ? categories.slice(0, 8).map(cat => (
                      <button key={cat} onClick={() => { handleSuggestionClick(cat); setSearchOpen(false) }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        <FolderOpen className="h-3 w-3" />
                        {cat}
                      </button>
                    ))
                  : quickFilters.map((filter) => (
                      <button key={filter.id} onClick={() => { setSelectedFilter(filter.label); setSearchOpen(false); document.getElementById("content")?.scrollIntoView({ behavior: "smooth" }) }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${filter.bg} ${filter.color} ${filter.hoverBg} transition-colors`}>
                        <filter.icon className="h-3 w-3" />
                        {filter.label}
                      </button>
                    ))
                }
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
