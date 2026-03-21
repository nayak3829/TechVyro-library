"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Home, Search, Bookmark, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFavorites } from "@/hooks/use-favorites"

const navItems = [
  { icon: Home, label: "Home", href: "/", action: "home" },
  { icon: Search, label: "Search", href: "#content", action: "search" },
  { icon: TrendingUp, label: "Popular", href: "#content", action: "popular" },
  { icon: Bookmark, label: "Saved", href: "#content", action: "saved" },
]

export function MobileNav() {
  const [activeItem, setActiveItem] = useState("Home")
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [mounted, setMounted] = useState(false)
  const { favorites, isLoaded } = useFavorites()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Smart scroll hide/show
  useEffect(() => {
    if (!mounted) return
    
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const diff = currentScrollY - lastScrollY
          
          // Only hide if scrolling down significantly
          if (diff > 10 && currentScrollY > 80) {
            setIsVisible(false)
          } else if (diff < -5) {
            setIsVisible(true)
          }
          
          setLastScrollY(currentScrollY)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY, mounted])

  const handleNavClick = useCallback((item: typeof navItems[0]) => {
    setActiveItem(item.label)
    
    if (item.action === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      const contentSection = document.getElementById("content")
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: "smooth" })
      }
    }
  }, [])

  if (!mounted) return null

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-background/98 backdrop-blur-xl border-t border-border/40",
        "transition-transform duration-300 ease-out",
        !isVisible && "translate-y-full"
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      
      <div className="flex items-center justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = activeItem === item.label
          const Icon = item.icon
          
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={(e) => {
                e.preventDefault()
                handleNavClick(item)
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200",
                "min-w-[60px] min-h-[52px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground active:bg-muted/50"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-5 w-5 transition-all duration-200",
                  isActive && "scale-105"
                )} />
                {item.label === "Saved" && isLoaded && favorites.length > 0 && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground notify-dot">
                    {favorites.length > 9 ? "+" : favorites.length}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[10px] leading-tight",
                isActive ? "font-semibold" : "font-medium"
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
