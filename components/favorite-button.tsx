"use client"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useFavorites } from "@/hooks/use-favorites"
import { toast } from "sonner"

interface FavoriteButtonProps {
  pdfId: string
  size?: "sm" | "md" | "lg"
  variant?: "default" | "overlay"
  className?: string
}

export function FavoriteButton({ pdfId, size = "md", variant = "default", className }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoaded } = useFavorites()
  const isFav = isFavorite(pdfId)

  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  }

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite(pdfId)
    toast.success(isFav ? "Removed from favorites" : "Added to favorites")
  }

  if (!isLoaded) {
    return (
      <Button
        variant={variant === "overlay" ? "secondary" : "ghost"}
        size="icon"
        className={cn(sizeClasses[size], "opacity-50", className)}
        disabled
      >
        <Heart className={iconSizes[size]} />
      </Button>
    )
  }

  return (
    <Button
      variant={variant === "overlay" ? "secondary" : "ghost"}
      size="icon"
      className={cn(
        sizeClasses[size],
        variant === "overlay" && "bg-background/80 backdrop-blur-sm hover:bg-background/90",
        className
      )}
      onClick={handleClick}
    >
      <Heart
        className={cn(
          iconSizes[size],
          "transition-all",
          isFav && "fill-red-500 text-red-500"
        )}
      />
      <span className="sr-only">{isFav ? "Remove from favorites" : "Add to favorites"}</span>
    </Button>
  )
}
