"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Clock, FileText, Play, ArrowRight, Zap, Target, 
  BookOpen, Shield, Train, TrendingUp, Atom, Users,
  GraduationCap
} from "lucide-react"

// Sample test series data - same categories as test-series page
const TEST_SERIES = [
  {
    id: "ssc-cgl-1",
    title: "SSC CGL Full Mock Test",
    category: "SSC",
    totalTests: 25,
    totalQuestions: 375,
    duration: "60 min/test",
    slug: "ssc-cgl-general-knowledge",
    color: "#3b82f6",
    badge: "HOT",
  },
  {
    id: "ibps-po-1",
    title: "IBPS PO Complete Series",
    category: "Banking",
    totalTests: 30,
    totalQuestions: 450,
    duration: "60 min/test",
    slug: "banking-reasoning-aptitude",
    color: "#10b981",
    badge: "POPULAR",
  },
  {
    id: "nda-full-1",
    title: "NDA & NA Mock Test Series",
    category: "Defence",
    totalTests: 20,
    totalQuestions: 600,
    duration: "150 min/test",
    slug: "nda-general-knowledge",
    color: "#ef4444",
  },
  {
    id: "rrb-ntpc-1",
    title: "RRB NTPC Complete Series",
    category: "Railways",
    totalTests: 25,
    totalQuestions: 375,
    duration: "90 min/test",
    slug: "rrb-ntpc-general-knowledge",
    color: "#f97316",
    badge: "POPULAR",
  },
]

const CATEGORIES = [
  { id: "ssc", label: "SSC", icon: Target, color: "#3b82f6", count: 6 },
  { id: "banking", label: "Banking", icon: TrendingUp, color: "#10b981", count: 7 },
  { id: "defence", label: "Defence", icon: Shield, color: "#ef4444", count: 5 },
  { id: "railways", label: "Railways", icon: Train, color: "#f97316", count: 4 },
  { id: "upsc", label: "UPSC", icon: BookOpen, color: "#8b5cf6", count: 4 },
  { id: "jee", label: "JEE/NEET", icon: Atom, color: "#06b6d4", count: 3 },
]

export function TestSeriesSection() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-3 sm:mb-4 bg-violet-500/10 text-violet-600 border-violet-500/20 text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-1.5">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Mock Tests
          </Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2 sm:mb-3">
            Practice Mock Tests
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm max-w-md sm:max-w-xl mx-auto px-2">
            Free unlimited mock tests for all competitive exams - SSC, Banking, NDA, Railways & more
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <Link
                key={cat.id}
                href={`/test-series?category=${cat.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:shadow-sm"
                style={{ 
                  backgroundColor: `${cat.color}10`, 
                  borderColor: `${cat.color}30`,
                  color: cat.color 
                }}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
                <span className="text-[10px] opacity-70">({cat.count})</span>
              </Link>
            )
          })}
        </div>

        {/* Test Series Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {TEST_SERIES.map(series => (
            <Card 
              key={series.id}
              className="group overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border/50 hover:border-violet-400/40 flex flex-col"
            >
              <div className="p-3 sm:p-4 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${series.color}15` }}
                  >
                    <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: series.color }} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge 
                      className="text-[9px] sm:text-[10px] text-white py-0.5 px-1.5"
                      style={{ backgroundColor: series.color }}
                    >
                      {series.category}
                    </Badge>
                    {series.badge && (
                      <Badge className="text-[9px] sm:text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0.5 px-1.5">
                        {series.badge}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-violet-600 transition-colors mb-2 sm:mb-3">
                  {series.title}
                </h3>
                
                {/* Stats */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mb-3 sm:mb-4">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{series.totalTests} Tests</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{series.duration}</span>
                  </div>
                </div>
                
                {/* CTA */}
                <Button 
                  asChild 
                  size="sm" 
                  className="w-full h-8 sm:h-9 text-[11px] sm:text-xs mt-auto bg-violet-600 hover:bg-violet-700"
                >
                  <Link href={`/test-series/series?slug=${series.slug}&apiBase=sample:ssc-banking&title=${encodeURIComponent(series.title)}`}>
                    <Play className="h-3 w-3 mr-1" />
                    Start Now
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center">
          <Button asChild variant="outline" size="sm" className="text-xs sm:text-sm gap-1.5">
            <Link href="/test-series">
              Browse All Mock Tests
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
