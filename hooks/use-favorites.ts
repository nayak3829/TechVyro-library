"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)
  const pendingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/favorites")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.favorites)) {
          setFavorites(new Set(data.favorites))
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true))
  }, [])

  const toggleFavorite = useCallback(async (id: string) => {
    if (pendingRef.current.has(id)) return
    pendingRef.current.add(id)

    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    try {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfId: id }),
      })
    } catch {
      setFavorites(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } finally {
      pendingRef.current.delete(id)
    }
  }, [])

  const addFavorite = useCallback((id: string) => {
    setFavorites(prev => new Set([...prev, id]))
  }, [])

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites])

  return { favorites: [...favorites], isLoaded, addFavorite, removeFavorite, toggleFavorite, isFavorite }
}
