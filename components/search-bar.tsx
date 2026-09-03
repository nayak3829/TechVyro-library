"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = "Search PDFs by title or description..." }: SearchBarProps) {
  return (
    <div className="relative w-full group">
      {/* Background glow effect on focus */}
      <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />
      
      <div className="relative flex items-center">
        <div className="absolute left-3 sm:left-4 flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 group-focus-within:bg-primary/20 transition-colors">
          <Search className="h-4 w-4 text-primary" />
        </div>
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-14 sm:pl-16 pr-12 h-12 sm:h-14 bg-card border-border/50 focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary/50 text-sm sm:text-base rounded-xl shadow-sm transition-all duration-300"
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </Button>
        )}
      </div>
    </div>
  )
}
