"use client"

import { TechVyroLoader } from "@/components/ui/page-loader"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <TechVyroLoader text="Loading PDFs..." />
    </div>
  )
}
