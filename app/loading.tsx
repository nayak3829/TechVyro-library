"use client"

import { TechVyroLoader } from "@/components/ui/page-loader"

export default function Loading() {
  return (
    <div role="status" aria-label="Loading TechVyro" className="fixed inset-0 z-[290] flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.12),transparent_42%)]" />
      <TechVyroLoader text="Loading TechVyro..." className="relative" />
    </div>
  )
}
