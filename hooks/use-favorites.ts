"use client"

import { useState, useEffect, useCallback } from "react"

const FAVORITES_KEY = "pdf_favorites"

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY)
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)))
      }
    } catch (error) {
      console.error("Failed to load favorites:", error)
    }
    setIsLoaded(true)
  }, [])

  // Save favorites to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]))
      } catch (error) {
        console.error("Failed to save favorites:", error)
      }
    }
  }, [favorites, isLoaded])

  const addFavorite = useCallback((id: string) => {
    setFavorites((prev) => new Set([...prev, id]))
  }, [])

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const isFavorite = useCallback((id: string) => {
    return favorites.has(id)
  }, [favorites])

  return {
    favorites: [...favorites],
    isLoaded,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  }
}
