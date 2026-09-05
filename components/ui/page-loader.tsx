"use client"

import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface PageLoaderProps {
  className?: string
  text?: string
  showLogo?: boolean
}

// Animated dots loader
export function DotsLoader({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={reduceMotion ? { opacity: 0.8 } : {
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

// Spinning ring loader
export function SpinnerLoader({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  }

  return (
    <div
      className={cn(
        "rounded-full border-primary/30 border-t-primary animate-spin motion-reduce:animate-none",
        sizeClasses[size],
        className
      )}
    />
  )
}

// Pulse loader
export function PulseLoader({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <div className={cn("relative", className)}>
      <motion.div
        className="w-12 h-12 rounded-full bg-primary/20"
        animate={reduceMotion ? { opacity: 0.65 } : {
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-primary" />
      </div>
    </div>
  )
}

// TechVyro branded loader
export function TechVyroLoader({ className, text = "Loading..." }: PageLoaderProps) {
  const reduceMotion = useReducedMotion()
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)} aria-busy="true">
      <div className="relative grid h-24 w-24 place-items-center">
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40 motion-reduce:animate-none"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 1.25, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute inset-2 rounded-full border border-primary/20"
          animate={reduceMotion ? { opacity: 0.7 } : { scale: [0.96, 1.04, 0.96], opacity: [0.45, 0.9, 0.45] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <img
          src="/techvyro-logo.jpg"
          alt=""
          width={64}
          height={64}
          className="relative h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/25"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{text}</p>
        <DotsLoader className="mt-2" />
      </div>
    </div>
  )
}

// Full page loader
export function PageLoader({ className, text, showLogo = true }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text || "Loading page"}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm",
        className
      )}
    >
      {showLogo ? (
        <TechVyroLoader text={text} />
      ) : (
        <div className="flex flex-col items-center gap-4">
          <SpinnerLoader size="lg" />
          {text && <p className="text-sm text-muted-foreground">{text}</p>}
        </div>
      )}
    </div>
  )
}

// Skeleton loader for cards
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}

// Progress bar loader
export function ProgressLoader({ progress = 0, className }: { progress?: number; className?: string }) {
  return (
    <div className={cn("w-full max-w-xs", className)}>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-accent"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">{Math.round(progress)}%</p>
    </div>
  )
}

// Shimmer effect loader
export function ShimmerLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        className
      )}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ translateX: ["0%", "200%"] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}

export { PageLoader as default }
