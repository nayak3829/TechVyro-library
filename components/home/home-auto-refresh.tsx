"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Wifi } from "lucide-react"
import { toast } from "sonner"

const REFRESH_INTERVAL = 2 * 60 * 1000

export function HomeAutoRefresh() {
  const router = useRouter()
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [show, setShow] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isFirstRef = useRef(true)

  useEffect(() => {
    setLastRefresh(new Date())
    const showTimer = setTimeout(() => setShow(true), 3000)

    timerRef.current = setInterval(async () => {
      setIsRefreshing(true)
      setRefreshCount(c => c + 1)

      try {
        const res = await fetch("/api/homepage-data", { cache: "no-store" })
        if (res.ok && !isFirstRef.current) {
          toast.success("Content updated", {
            description: "Latest PDFs and stats loaded",
            duration: 3000,
            icon: <Wifi className="h-4 w-4" />,
          })
        }
        isFirstRef.current = false
      } catch {}

      router.refresh()
      setTimeout(() => {
        setIsRefreshing(false)
        setLastRefresh(new Date())
      }, 1200)
    }, REFRESH_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      clearTimeout(showTimer)
    }
  }, [router])

  if (!show || !lastRefresh) return null

  return (
    <div className="fixed bottom-[84px] left-4 md:bottom-6 md:left-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-card/95 backdrop-blur-xl border border-border/50 shadow-lg text-[11px] text-muted-foreground font-medium animate-in fade-in slide-in-from-bottom-2 duration-500">
      <span className={`h-1.5 w-1.5 rounded-full ${isRefreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
      {isRefreshing ? (
        <span className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Syncing…
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          Live · {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {refreshCount > 0 && <span className="text-emerald-500 ml-0.5">✓</span>}
        </span>
      )}
    </div>
  )
}
