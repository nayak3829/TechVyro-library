import Link from "next/link"
import { FileText, Settings, Home, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      {/* Gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
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
        
        {/* Navigation */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          {/* Home link - visible on desktop */}
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex px-3 gap-2 hover:bg-primary/10 hover:text-primary">
            <Link href="/">
              <Home className="h-4 w-4" />
              Home
            </Link>
          </Button>
          
          {/* Main Website Link */}
          <Button variant="ghost" size="sm" asChild className="hidden md:flex px-3 gap-2 hover:bg-primary/10 hover:text-primary">
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
    </header>
  )
}
