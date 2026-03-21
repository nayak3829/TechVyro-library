"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Home, Search, Bookmark, TrendingUp, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFavorites } from "@/hooks/use-favorites"

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Search, label: "Search", href: "#content", action: "search" },
  { icon: TrendingUp, label: "Popular", href: "#content", action: "popular" },
  { icon: Bookmark, label: "Saved", href: "#content", action: "saved" },
]

export function MobileNav() {
  const [activeItem, setActiveItem] = useState("Home")
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const { favorites, isLoaded } = useFavorites()

  // Hide nav on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const handleNavClick = (item: typeof navItems[0]) => {
    setActiveItem(item.label)
    
    if (item.action === "search") {
      // Focus on search or scroll to content
      const contentSection = document.getElementById("content")
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: "smooth" })
      }
    } else if (item.action === "saved") {
      // Filter to show saved PDFs
      const contentSection = document.getElementById("content")
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: "smooth" })
      }
    } else if (item.action === "popular") {
      // Scroll to content with popular filter
      const contentSection = document.getElementById("content")
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-background/95 backdrop-blur-xl border-t border-border/50",
        "transition-transform duration-300 ease-in-out",
        !isVisible && "translate-y-full"
      )}
    >
      {/* Gradient line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="flex items-center justify-around px-2 py-2 safe-bottom">
        {navItems.map((item) => {
          const isActive = activeItem === item.label
          const Icon = item.icon
          
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                "min-w-[64px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "scale-110"
                )} />
                {/* Badge for saved items */}
                {item.label === "Saved" && isLoaded && favorites.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {favorites.length > 9 ? "9+" : favorites.length}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
