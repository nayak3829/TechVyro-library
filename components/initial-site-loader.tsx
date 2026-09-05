"use client"

import { useEffect, useRef, useState } from "react"
import { TechVyroLoader } from "@/components/ui/page-loader"

const MIN_VISIBLE_MS = 550
const EXIT_MS = 250
const FAILSAFE_MS = 3500

export function InitialSiteLoader() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "hidden">("visible")
  const startedAt = useRef(0)
  const finishing = useRef(false)

  useEffect(() => {
    startedAt.current = Date.now()
    let exitTimer: ReturnType<typeof setTimeout> | undefined
    let hideTimer: ReturnType<typeof setTimeout> | undefined

    const finish = () => {
      if (finishing.current) return
      finishing.current = true
      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt.current))
      exitTimer = setTimeout(() => {
        setPhase("leaving")
        hideTimer = setTimeout(() => setPhase("hidden"), EXIT_MS)
      }, remaining)
    }

    // Hydration means the interactive shell is ready. Do not wait for every
    // image, analytics script, or streamed section to fire window.load.
    const firstFrame = requestAnimationFrame(() => {
      requestAnimationFrame(finish)
    })

    const failsafe = setTimeout(finish, FAILSAFE_MS)
    return () => {
      cancelAnimationFrame(firstFrame)
      clearTimeout(failsafe)
      if (exitTimer) clearTimeout(exitTimer)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [])

  if (phase === "hidden") return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="TechVyro is loading"
      className={`fixed inset-0 z-[300] flex items-center justify-center bg-background transition-opacity duration-250 ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.12),transparent_42%)]" />
      <TechVyroLoader text="Preparing your study library..." className="relative" />
    </div>
  )
}