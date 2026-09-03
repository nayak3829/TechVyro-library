"use client"

import { useState, useEffect, useCallback } from "react"

let cachedFavorites: string[] | null = null
let isLoaded = false
let pendingPromise: Promise<string[]> | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

async function loadFavorites(): Promise<string[]> {
  if (isLoaded && cachedFavorites !== null) return cachedFavorites
  if (pendingPromise) return pendingPromise

  pendingPromise = fetch("/api/favorites")
    .then(r => r.json())
    .then(data => {
      cachedFavorites = Array.isArray(data.favorites) ? data.favorites : []
      isLoaded = true
      pendingPromise = null
      notify()
      return cachedFavorites!
    })
    .catch(() => {
      pendingPromise = null
      isLoaded = true
      cachedFavorites = cachedFavorites ?? []
      return cachedFavorites
    })

  return pendingPromise
}

export function useFavorites() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const rerender = () => forceUpdate(n => n + 1)
    listeners.add(rerender)
    loadFavorites()
    return () => { listeners.delete(rerender) }
  }, [])

  const toggleFavorite = useCallback(async (id: string) => {
    const prev = cachedFavorites ?? []
    const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    cachedFavorites = next
    notify()

    try {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfId: id }),
      })
    } catch {
      cachedFavorites = prev
      notify()
    }
  }, [])

  const addFavorite = useCallback((id: string) => {
    if (!cachedFavorites?.includes(id)) {
      cachedFavorites = [...(cachedFavorites ?? []), id]
      notify()
    }
  }, [])

  const removeFavorite = useCallback((id: string) => {
    cachedFavorites = (cachedFavorites ?? []).filter(f => f !== id)
    notify()
  }, [])

  const isFavorite = useCallback((id: string) => (cachedFavorites ?? []).includes(id), [])

  const favorites = cachedFavorites ?? []

  return { favorites, isLoaded, addFavorite, removeFavorite, toggleFavorite, isFavorite }
}
