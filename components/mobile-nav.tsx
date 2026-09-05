"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Zap, User, FileCheck, Upload } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: Home,      label: "Home",   href: "/" },
  { icon: BookOpen,  label: "Browse", href: "/browse" },
  { icon: FileCheck, label: "Tests",  href: "/test-series" },
  { icon: Zap,       label: "Quiz",   href: "/quiz" },
  { icon: Upload,     label: "Contribute", href: "/submit" },
  { icon: User,      label: "Profile", href: "/profile" },
]

export function MobileNav() {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          const diff = currentScrollY - lastScrollY.current
          const atBottom = currentScrollY + window.innerHeight >= document.documentElement.scrollHeight - 24
          if (atBottom || currentScrollY <= 80) {
            setIsVisible(true)
          } else if (diff > 10) {
            setIsVisible(false)
          } else if (diff < -5) {
            setIsVisible(true)
          }
          lastScrollY.current = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [mounted])

  useEffect(() => {
    setIsVisible(true)
    lastScrollY.current = window.scrollY
  }, [pathname])

  const getIsActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  if (!mounted) return null

  return (
    <nav
      aria-label="Mobile navigation"
      onFocusCapture={() => setIsVisible(true)}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "bg-background/98 backdrop-blur-xl border-t border-border/40",
        "transition-transform duration-300 ease-out",
        !isVisible && "translate-y-full"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="flex items-center justify-around px-1 py-1">
        {navItems.map((item) => {
          const isActive = getIsActive(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200",
        "min-w-0 min-h-[44px] flex-1 px-0.5 py-1",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground active:bg-muted/50 active:scale-95"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200",
                isActive && "bg-primary/15"
              )}>
                <Icon className={cn(
                  "h-[18px] w-[18px] transition-all duration-200",
                  isActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[9px] leading-tight",
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
