import Link from "next/link"
import { FileText, Settings, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm group-hover:shadow-md transition-shadow">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold leading-tight">
              <span style={{ color: '#ef4444' }}>Tech</span>
              <span className="text-foreground">Vyro</span>
            </span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground -mt-1 hidden sm:block">PDF Library</span>
          </div>
        </Link>
        
        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* Home link - visible on desktop */}
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex px-3 gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Home
            </Link>
          </Button>
          
          <ThemeToggle />
          
          <Button variant="outline" size="sm" asChild className="px-2 sm:px-3 gap-1.5 sm:gap-2 border-border/50 hover:border-primary/50">
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
