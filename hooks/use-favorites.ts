"use client"

import { useState, useEffect, useCallback } from "react"

const FAVORITES_KEY = "pdf_favorites"

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(FAVORITES_KEY)
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)))
      }
    } catch {
    }
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      try {
        sessionStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]))
      } catch {
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])

  return { favorites: [...favorites], isLoaded, addFavorite, removeFavorite, toggleFavorite, isFavorite }
}
