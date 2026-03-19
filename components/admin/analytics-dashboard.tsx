"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Download, FileText, Star, TrendingUp, Users } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import type { PDF, Category } from "@/lib/types"

interface AnalyticsDashboardProps {
  pdfs: PDF[]
  categories: Category[]
}

export function AnalyticsDashboard({ pdfs, categories }: AnalyticsDashboardProps) {
  const stats = useMemo(() => {
    const totalViews = pdfs.reduce((sum, pdf) => sum + (pdf.view_count || 0), 0)
    const totalDownloads = pdfs.reduce((sum, pdf) => sum + pdf.download_count, 0)
    const totalReviews = pdfs.reduce((sum, pdf) => sum + (pdf.review_count || 0), 0)
    const avgRating = pdfs.filter(p => p.average_rating).length > 0
      ? pdfs.filter(p => p.average_rating).reduce((sum, pdf) => sum + (pdf.average_rating || 0), 0) / pdfs.filter(p => p.average_rating).length
      : 0

    return { totalViews, totalDownloads, totalReviews, avgRating }
  }, [pdfs])

  const topPdfs = useMemo(() => {
    return [...pdfs]
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)
      .map(pdf => ({
        name: pdf.title.length > 20 ? pdf.title.slice(0, 20) + "..." : pdf.title,
        views: pdf.view_count || 0,
        downloads: pdf.download_count,
      }))
  }, [pdfs])

  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; count: number; color: string }>()
    
    categories.forEach(cat => {
      categoryMap.set(cat.id, { name: cat.name, count: 0, color: cat.color })
    })
    
    pdfs.forEach(pdf => {
      if (pdf.category_id && categoryMap.has(pdf.category_id)) {
        const cat = categoryMap.get(pdf.category_id)!
        cat.count++
      }
    })

    return Array.from(categoryMap.values()).filter(c => c.count > 0)
  }, [pdfs, categories])

  const chartColors = {
    primary: "#7c3aed",
    secondary: "#06b6d4",
    accent: "#f59e0b",
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all PDFs
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time downloads
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PDFs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pdfs.length}</div>
            <p className="text-xs text-muted-foreground">
              In library
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              From {stats.totalReviews} reviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top PDFs Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top PDFs by Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPdfs.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topPdfs} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="views" fill={chartColors.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              PDFs by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="count"
                    nameKey="name"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No categories with PDFs
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Downloads Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Most Downloaded PDFs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pdfs.length > 0 ? (
              [...pdfs]
                .sort((a, b) => b.download_count - a.download_count)
                .slice(0, 5)
                .map((pdf, index) => (
                  <div key={pdf.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{pdf.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {pdf.view_count || 0} views
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{pdf.download_count}</p>
                      <p className="text-xs text-muted-foreground">downloads</p>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No PDFs uploaded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
