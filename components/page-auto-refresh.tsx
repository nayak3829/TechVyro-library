"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Wifi } from "lucide-react"
import { toast } from "sonner"

interface PageAutoRefreshProps {
  interval?: number
  label?: string
  onRefresh?: () => Promise<void>
  showToast?: boolean
}

export function PageAutoRefresh({
  interval = 2 * 60 * 1000,
  label = "Live",
  onRefresh,
  showToast = false,
}: PageAutoRefreshProps) {
  const router = useRouter()
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [show, setShow] = useState(false)
  const [count, setCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const firstRef = useRef(true)

  const doRefresh = useCallback(async () => {
    setIsRefreshing(true)
    setCount(c => c + 1)
    try {
      if (onRefresh) {
        await onRefresh()
      } else {
        router.refresh()
      }
      if (!firstRef.current && showToast) {
        toast.success("Content updated", { duration: 2500, icon: <Wifi className="h-4 w-4" /> })
      }
      firstRef.current = false
    } catch {}
    setTimeout(() => {
      setIsRefreshing(false)
      setLastRefresh(new Date())
    }, 800)
  }, [router, onRefresh, showToast])

  useEffect(() => {
    setLastRefresh(new Date())
    const showTimer = setTimeout(() => setShow(true), 2500)
    timerRef.current = setInterval(doRefresh, interval)
    return () => {
      clearInterval(timerRef.current!)
      clearTimeout(showTimer)
    }
  }, [doRefresh, interval])

  if (!show || !lastRefresh) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg text-[11px] text-muted-foreground font-medium animate-in fade-in slide-in-from-bottom-2 duration-500 select-none">
      <span className={`h-1.5 w-1.5 rounded-full ${isRefreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
      {isRefreshing ? (
        <span className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Syncing…
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          {label} · {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {count > 0 && <span className="text-emerald-500 ml-0.5 text-[10px]">✓</span>}
        </span>
      )}
    </div>
  )
}
