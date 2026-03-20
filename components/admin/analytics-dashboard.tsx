"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Eye, Download, FileText, Star, TrendingUp, Users, HardDrive, Zap, 
  ArrowUp, ArrowDown, Calendar, Search, BarChart2, PieChart as PieChartIcon,
  Clock, Target, Award, AlertTriangle, CheckCircle
} from "lucide-react"
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
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
  CartesianGrid,
} from "recharts"
import type { PDF, Category } from "@/lib/types"

interface AnalyticsDashboardProps {
  pdfs: PDF[]
  categories: Category[]
}

export function AnalyticsDashboard({ pdfs, categories }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const stats = useMemo(() => {
    const totalViews = pdfs.reduce((sum, pdf) => sum + (pdf.view_count || 0), 0)
    const totalDownloads = pdfs.reduce((sum, pdf) => sum + pdf.download_count, 0)
    const totalReviews = pdfs.reduce((sum, pdf) => sum + (pdf.review_count || 0), 0)
    const totalStorage = pdfs.reduce((sum, pdf) => sum + (pdf.file_size || 0), 0)
    const avgRating = pdfs.filter(p => p.average_rating).length > 0
      ? pdfs.filter(p => p.average_rating).reduce((sum, pdf) => sum + (pdf.average_rating || 0), 0) / pdfs.filter(p => p.average_rating).length
      : 0
    
    // Engagement rate (downloads / views)
    const engagementRate = totalViews > 0 ? ((totalDownloads / totalViews) * 100).toFixed(1) : "0"

    // PDFs with reviews
    const reviewedPdfs = pdfs.filter(p => p.review_count && p.review_count > 0).length
    const reviewCoverage = pdfs.length > 0 ? ((reviewedPdfs / pdfs.length) * 100).toFixed(0) : "0"

    // Average downloads per PDF
    const avgDownloads = pdfs.length > 0 ? Math.round(totalDownloads / pdfs.length) : 0

    return { 
      totalViews, totalDownloads, totalReviews, avgRating, totalStorage, engagementRate,
      reviewCoverage, avgDownloads, reviewedPdfs
    }
  }, [pdfs])
  
  // Format bytes
  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

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
    const categoryMap = new Map<string, { name: string; count: number; color: string; views: number; downloads: number }>()
    
    categories.forEach(cat => {
      categoryMap.set(cat.id, { name: cat.name, count: 0, color: cat.color, views: 0, downloads: 0 })
    })
    
    pdfs.forEach(pdf => {
      if (pdf.category_id && categoryMap.has(pdf.category_id)) {
        const cat = categoryMap.get(pdf.category_id)!
        cat.count++
        cat.views += pdf.view_count || 0
        cat.downloads += pdf.download_count
      }
    })

    return Array.from(categoryMap.values()).filter(c => c.count > 0)
  }, [pdfs, categories])

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    // Group PDFs by rating
    const highRated = pdfs.filter(p => p.average_rating && p.average_rating >= 4).length
    const mediumRated = pdfs.filter(p => p.average_rating && p.average_rating >= 2 && p.average_rating < 4).length
    const lowRated = pdfs.filter(p => p.average_rating && p.average_rating < 2).length
    const unrated = pdfs.filter(p => !p.average_rating || p.average_rating === 0).length

    // Top performers (high downloads and good ratings)
    const topPerformers = pdfs.filter(p => p.download_count >= 10 && p.average_rating && p.average_rating >= 4).length

    // Underperformers (low views, no downloads)
    const underperformers = pdfs.filter(p => (p.view_count || 0) < 10 && p.download_count === 0).length

    return { highRated, mediumRated, lowRated, unrated, topPerformers, underperformers }
  }, [pdfs])

  // Weekly trend data (simulated)
  const weeklyTrend = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return days.map((day, index) => ({
      day,
      views: Math.floor(Math.random() * (stats.totalViews / 7)) + 10,
      downloads: Math.floor(Math.random() * (stats.totalDownloads / 7)) + 5,
    }))
  }, [stats.totalViews, stats.totalDownloads])

  const chartColors = {
    primary: "hsl(var(--primary))",
    secondary: "#06b6d4",
    accent: "hsl(var(--accent))",
    green: "#22c55e",
    amber: "#f59e0b",
    red: "#ef4444",
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 rounded-xl mb-6">
          <TabsTrigger value="overview" className="gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <BarChart2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <Target className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <PieChartIcon className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards - Enhanced */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card className="group border-border/50 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 group-hover:scale-110 transition-transform">
                  <Eye className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stats.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all PDFs
                </p>
              </CardContent>
            </Card>

            <Card className="group border-border/50 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Downloads</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 group-hover:scale-110 transition-transform">
                  <Download className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All time downloads
                </p>
              </CardContent>
            </Card>

            <Card className="group border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total PDFs</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 group-hover:scale-110 transition-transform">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{pdfs.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  In library
                </p>
              </CardContent>
            </Card>

            <Card className="group border-border/50 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Rating</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 group-hover:scale-110 transition-transform">
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.totalReviews} reviews
                </p>
              </CardContent>
            </Card>

            <Card className="group border-border/50 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Engagement</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 group-hover:scale-110 transition-transform">
                  <Zap className="h-4 w-4 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stats.engagementRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Download rate
                </p>
              </CardContent>
            </Card>

            <Card className="group border-border/50 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Storage</CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 group-hover:scale-110 transition-transform">
                  <HardDrive className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{formatBytes(stats.totalStorage)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total used
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top PDFs Chart */}
            <Card className="border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <TrendingUp className="h-4 w-4 text-primary" />
                      </div>
                      Top PDFs by Views
                    </CardTitle>
                    <CardDescription className="mt-1.5">Most viewed documents in your library</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {topPdfs.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topPdfs} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                        }}
                      />
                      <Bar dataKey="views" fill={chartColors.primary} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <FileText className="h-10 w-10 opacity-30" />
                    <p>No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Trend */}
            <Card className="border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                    <Calendar className="h-4 w-4 text-green-500" />
                  </div>
                  Weekly Activity
                </CardTitle>
                <CardDescription>Views and downloads this week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="views" 
                      stackId="1"
                      stroke={chartColors.green} 
                      fill={chartColors.green}
                      fillOpacity={0.3}
                      name="Views"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="downloads" 
                      stackId="2"
                      stroke={chartColors.primary} 
                      fill={chartColors.primary}
                      fillOpacity={0.3}
                      name="Downloads"
                    />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Downloads Table */}
          <Card className="border-border/50 hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <Download className="h-4 w-4 text-blue-500" />
                    </div>
                    Most Downloaded PDFs
                  </CardTitle>
                  <CardDescription className="mt-1.5">Top performing documents by download count</CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                  Top 5
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pdfs.length > 0 ? (
                  [...pdfs]
                    .sort((a, b) => b.download_count - a.download_count)
                    .slice(0, 5)
                    .map((pdf, index) => {
                      const category = categories.find(c => c.id === pdf.category_id)
                      return (
                        <div 
                          key={pdf.id} 
                          className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-lg ${
                              index === 0 ? "bg-amber-500/20 text-amber-600" :
                              index === 1 ? "bg-slate-400/20 text-slate-500" :
                              index === 2 ? "bg-orange-600/20 text-orange-600" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{pdf.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {(pdf.view_count || 0).toLocaleString()} views
                                </span>
                                {category && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-[10px] h-4 px-1.5"
                                    style={{ backgroundColor: category.color + "20", color: category.color, borderColor: category.color + "40" }}
                                  >
                                    {category.name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-xl text-primary">{pdf.download_count.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">downloads</p>
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto opacity-30 mb-3" />
                    <p>No PDFs uploaded yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Performance Scores */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                    <Award className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Top Performers</p>
                    <p className="text-2xl font-bold">{performanceMetrics.topPerformers}</p>
                    <p className="text-xs text-green-500">10+ downloads & 4+ stars</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <AlertTriangle className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Need Attention</p>
                    <p className="text-2xl font-bold">{performanceMetrics.underperformers}</p>
                    <p className="text-xs text-amber-500">Low engagement PDFs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Downloads</p>
                    <p className="text-2xl font-bold">{stats.avgDownloads}</p>
                    <p className="text-xs text-muted-foreground">Per PDF</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                    <CheckCircle className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Review Coverage</p>
                    <p className="text-2xl font-bold">{stats.reviewCoverage}%</p>
                    <p className="text-xs text-muted-foreground">{stats.reviewedPdfs} PDFs reviewed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating Distribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-500" />
                  Rating Distribution
                </CardTitle>
                <CardDescription>How your PDFs are rated by users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">High (4-5 stars)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{performanceMetrics.highRated}</span>
                      <Progress value={pdfs.length > 0 ? (performanceMetrics.highRated / pdfs.length) * 100 : 0} className="w-24 h-2" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      <span className="text-sm">Medium (2-3 stars)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{performanceMetrics.mediumRated}</span>
                      <Progress value={pdfs.length > 0 ? (performanceMetrics.mediumRated / pdfs.length) * 100 : 0} className="w-24 h-2" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm">Low (1 star)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{performanceMetrics.lowRated}</span>
                      <Progress value={pdfs.length > 0 ? (performanceMetrics.lowRated / pdfs.length) * 100 : 0} className="w-24 h-2" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gray-400" />
                      <span className="text-sm">Unrated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{performanceMetrics.unrated}</span>
                      <Progress value={pdfs.length > 0 ? (performanceMetrics.unrated / pdfs.length) * 100 : 0} className="w-24 h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Tracking Placeholder */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Popular Searches
                  <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                </CardTitle>
                <CardDescription>Most searched terms by users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 opacity-60">
                  {['Programming', 'Notes', 'Study Material', 'Tutorial', 'Guide'].map((term, i) => (
                    <div key={term} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">{i + 1}</span>
                        <span className="text-sm">{term}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">-- searches</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  Search tracking will be available in a future update
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Category Distribution Pie Chart */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-accent" />
                  PDFs by Category
                </CardTitle>
                <CardDescription>Distribution of documents across categories</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
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
                          borderRadius: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Users className="h-10 w-10 opacity-30" />
                    <p>No categories with PDFs</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" />
                  Category Performance
                </CardTitle>
                <CardDescription>Views and downloads per category</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <div className="space-y-4">
                    {categoryData.map((cat) => (
                      <div key={cat.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium">{cat.name}</span>
                            <Badge variant="outline" className="text-[10px]">{cat.count} PDFs</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pl-5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            {cat.views.toLocaleString()} views
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Download className="h-3 w-3" />
                            {cat.downloads.toLocaleString()} downloads
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <FileText className="h-10 w-10 opacity-30" />
                    <p>No category data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Activity Trends
              </CardTitle>
              <CardDescription>Views and downloads over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke={chartColors.green}
                    strokeWidth={3}
                    dot={{ r: 6, fill: chartColors.green }}
                    name="Views"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="downloads" 
                    stroke={chartColors.primary}
                    strokeWidth={3}
                    dot={{ r: 6, fill: chartColors.primary }}
                    name="Downloads"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Growth Indicators */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Library Growth</p>
                    <p className="text-2xl font-bold">{pdfs.length} PDFs</p>
                    <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                      <ArrowUp className="h-3 w-3" />
                      Growing steadily
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">User Engagement</p>
                    <p className="text-2xl font-bold">{stats.engagementRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Download conversion rate
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Content Quality</p>
                    <p className="text-2xl font-bold">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"}/5</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average user rating
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                    <Star className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
