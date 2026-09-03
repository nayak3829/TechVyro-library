"use client"

import * as React from "react"
import { motion, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface DockItem {
  icon: LucideIcon
  label: string
  href?: string
  onClick?: () => void
}

interface FloatingDockProps {
  className?: string
  items: DockItem[]
}

interface DockIconButtonProps {
  icon: LucideIcon
  label: string
  href?: string
  onClick?: () => void
  className?: string
}

const floatingAnimation: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-2, 2, -2],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

const DockIconButton = React.forwardRef<HTMLButtonElement, DockIconButtonProps>(
  ({ icon: Icon, label, href, onClick, className }, ref) => {
    const content = (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "relative group p-3 rounded-lg",
          "hover:bg-muted transition-colors",
          className
        )}
      >
        <Icon className="w-5 h-5 text-foreground" />
        <span
          className={cn(
            "absolute -top-8 left-1/2 -translate-x-1/2",
            "px-2 py-1 rounded text-xs",
            "bg-popover text-popover-foreground border border-border shadow-md",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity whitespace-nowrap pointer-events-none"
          )}
        >
          {label}
        </span>
      </motion.button>
    )

    if (href) {
      return (
        <a href={href} className="contents">
          {content}
        </a>
      )
    }

    return content
  }
)
DockIconButton.displayName = "DockIconButton"

const FloatingDock = React.forwardRef<HTMLDivElement, FloatingDockProps>(
  ({ items, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("fixed bottom-6 left-1/2 -translate-x-1/2 z-50", className)}
      >
        <motion.div
          initial="initial"
          animate="animate"
          variants={floatingAnimation}
          className={cn(
            "flex items-center gap-1 p-2 rounded-2xl",
            "backdrop-blur-lg border shadow-lg",
            "bg-background/90 border-border",
            "hover:shadow-xl transition-shadow duration-300"
          )}
        >
          {items.map((item) => (
            <DockIconButton key={item.label} {...item} />
          ))}
        </motion.div>
      </div>
    )
  }
)
FloatingDock.displayName = "FloatingDock"

export { FloatingDock, type DockItem }
