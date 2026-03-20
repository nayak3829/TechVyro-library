"use client"

import { useState } from "react"
import Link from "next/link"
import { Flame, Clock, TrendingUp, Star, ChevronRight, FileText, Eye, Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PDF } from "@/lib/types"

interface FeaturedSectionProps {
  featured: {
    popular: PDF[]
    trending: PDF[]
    recent: PDF[]
    topRated: PDF[]
  }
}

const tabs = [
  { id: "popular", label: "Popular", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "trending", label: "Trending", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "recent", label: "Recent", icon: Clock, color: "text-green-500", bg: "bg-green-500/10" },
  { id: "topRated", label: "Top Rated", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
]

function FeaturedCard({ pdf, index }: { pdf: PDF; index: number }) {
  return (
    <Link href={`/pdf/${pdf.id}`} className="group">
      <Card className="h-full overflow-hidden border-border/50 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 bg-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Rank Badge */}
            <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl font-bold text-lg sm:text-xl ${
              index === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30" :
              index === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-lg shadow-slate-500/30" :
              index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30" :
              "bg-muted text-muted-foreground"
            }`}>
              {index + 1}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {pdf.title}
                </h3>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>

              {pdf.category && (
                <Badge 
                  variant="secondary" 
                  className="mt-2 text-[10px] sm:text-xs"
                  style={{ backgroundColor: pdf.category.color + "20", color: pdf.category.color }}
                >
                  {pdf.category.name}
                </Badge>
              )}

              {/* Stats */}
              <div className="flex items-center gap-3 sm:gap-4 mt-3 text-[10px] sm:text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {(pdf.view_count || 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {pdf.download_count.toLocaleString()}
                </span>
                {pdf.average_rating && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
                    {pdf.average_rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function FeaturedSection({ featured }: FeaturedSectionProps) {
  const [activeTab, setActiveTab] = useState("popular")
  
  const currentPdfs = featured[activeTab as keyof typeof featured] || []

  if (currentPdfs.length === 0) return null

  return (
    <section className="py-10 sm:py-16 border-b border-border/40">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Featured PDFs
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Discover what others are reading
            </p>
          </div>
          
          <Button variant="ghost" asChild className="hidden sm:flex gap-2 text-primary hover:text-primary hover:bg-primary/10">
            <a href="#content">
              View All
              <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                  isActive 
                    ? `${tab.bg} ${tab.color} shadow-md` 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? tab.color : ""}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentPdfs.slice(0, 4).map((pdf, index) => (
            <FeaturedCard key={pdf.id} pdf={pdf} index={index} />
          ))}
        </div>

        {/* Mobile View All */}
        <div className="mt-6 sm:hidden">
          <Button variant="outline" asChild className="w-full gap-2">
            <a href="#content">
              View All PDFs
              <ChevronRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
