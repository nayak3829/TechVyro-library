"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { RefreshCw, Wifi } from "lucide-react"
import { toast } from "sonner"
import useSWR from "swr"
import { useRouter } from "next/navigation"

// Refresh every 5 minutes instead of 2 minutes (less aggressive)
const REFRESH_INTERVAL = 5 * 60 * 1000

interface HomepageData {
  stats: {
    totalPdfs: number
    totalCategories: number
    totalDownloads: number
    totalViews: number
  }
  fetchedAt: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("Homepage refresh failed")
  return res.json()
}

export function HomeAutoRefresh() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [lastStats, setLastStats] = useState<HomepageData["stats"] | null>(null)
  const isFirstRef = useRef(true)
  
  // Use SWR for efficient data fetching with background revalidation
  const { data, isValidating, mutate } = useSWR<HomepageData>(
    "/api/homepage-data",
    fetcher,
    {
      refreshInterval: REFRESH_INTERVAL,
      revalidateOnMount: false,
      revalidateOnFocus: false, // Don't refresh on tab focus
      revalidateOnReconnect: true, // Refresh when coming back online
      dedupingInterval: 60000, // Dedupe requests within 1 minute
    }
  )

  // Check if data actually changed
  const checkForChanges = useCallback((newData: HomepageData) => {
    if (!lastStats) {
      setLastStats(newData.stats)
      return false
    }

    const hasChanges = 
      newData.stats.totalPdfs !== lastStats.totalPdfs ||
      newData.stats.totalDownloads !== lastStats.totalDownloads ||
      newData.stats.totalViews !== lastStats.totalViews

    if (hasChanges) {
      setLastStats(newData.stats)
    }

    return hasChanges
  }, [lastStats])

  // Show notification only when data actually changes
  useEffect(() => {
    if (data && !isFirstRef.current) {
      const hasChanges = checkForChanges(data)
      if (hasChanges) {
        router.refresh()
        toast.success("Content updated", {
          description: "New content available",
          duration: 3000,
          icon: <Wifi className="h-4 w-4" />,
        })
      }
    }
    if (data) {
      isFirstRef.current = false
      setLastStats(data.stats)
    }
  }, [data, checkForChanges, router])

  // Delay showing the indicator
  useEffect(() => {
    const showTimer = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(showTimer)
  }, [])

  // Manual refresh handler (for future use)
  const handleManualRefresh = useCallback(() => {
    void mutate().then(() => router.refresh())
  }, [mutate, router])

  if (!show) return null

  const lastRefreshTime = data?.fetchedAt ? new Date(data.fetchedAt) : null

  return (
    <button
      type="button"
      className="fixed bottom-[84px] left-4 md:bottom-6 md:left-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg text-[11px] text-muted-foreground font-medium animate-in fade-in slide-in-from-bottom-2 duration-500 cursor-pointer hover:bg-card transition-colors"
      onClick={handleManualRefresh}
      title="Click to refresh"
      aria-label={isValidating ? "Refreshing homepage data" : "Refresh homepage data"}
      aria-live="polite"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isValidating ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
      {isValidating ? (
        <span className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Syncing…
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          {lastRefreshTime
            ? `Live · ${lastRefreshTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : "Ready"}
          {data && <span className="text-emerald-500 ml-0.5">✓</span>}
        </span>
      )}
    </button>
  )
}
