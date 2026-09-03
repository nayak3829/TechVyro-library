"use client"

import { Heart, Bookmark, BookmarkCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useFavorites } from "@/hooks/use-favorites"
import { toast } from "sonner"

interface FavoriteButtonProps {
  pdfId: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "overlay" | "ghost" | "bookmark"
  className?: string
  showLabel?: boolean
}

export function FavoriteButton({ 
  pdfId, 
  size = "md", 
  variant = "default", 
  className,
  showLabel = false 
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoaded } = useFavorites()
  const isFav = isFavorite(pdfId)

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(pdfId)
    
    if (isFav) {
      toast.success("Removed from saved PDFs", {
        description: "You can find your saved PDFs anytime",
        icon: <Bookmark className="h-4 w-4" />,
      })
    } else {
      toast.success("PDF saved for later!", {
        description: "Quick access from your bookmarks",
        icon: <BookmarkCheck className="h-4 w-4 text-primary" />,
      })
    }
  }

  if (!isLoaded) {
    return (
      <Button
        variant={variant === "overlay" ? "secondary" : "ghost"}
        size="icon"
        className={cn(sizeClasses[size], "opacity-50", className)}
        disabled
      >
        <Bookmark className={iconSizes[size]} />
      </Button>
    )
  }

  // Bookmark variant for more prominent save action
  if (variant === "bookmark") {
    return (
      <Button
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        className={cn(
          "gap-2 border-border/50 transition-all duration-300",
          isFav 
            ? "bg-primary/10 border-primary/50 text-primary hover:bg-primary/20" 
            : "hover:border-primary/50 hover:bg-primary/5",
          className
        )}
        onClick={handleClick}
      >
        <Bookmark
          className={cn(
            iconSizes[size],
            "transition-all",
            isFav && "fill-primary text-primary"
          )}
        />
        {showLabel && (
          <span className="text-sm font-medium">
            {isFav ? "Saved" : "Save"}
          </span>
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={variant === "overlay" ? "secondary" : "ghost"}
      size="icon"
      className={cn(
        sizeClasses[size],
        variant === "overlay" && "bg-background/90 backdrop-blur-sm hover:bg-background shadow-md",
        "transition-all duration-300 hover:scale-110",
        isFav && "text-red-500",
        className
      )}
      onClick={handleClick}
    >
      <Heart
        className={cn(
          iconSizes[size],
          "transition-all duration-300",
          isFav && "fill-red-500 text-red-500 scale-110"
        )}
      />
      <span className="sr-only">{isFav ? "Remove from favorites" : "Add to favorites"}</span>
    </Button>
  )
}
