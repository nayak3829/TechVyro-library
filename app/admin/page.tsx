"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { 
  ArrowLeft, Plus, Upload, FolderPlus, Trash2, FileText, LogOut, 
  BarChart3, RefreshCw, Settings, Database, Loader2, MessageSquare,
  TrendingUp, Download, Eye, Star, Clock, Users, Zap, HardDrive,
  Activity, AlertCircle, Home, History
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import type { Category, PDF } from "@/lib/types"

// Dynamic imports for heavy components
const PDFUploadForm = dynamic(() => import("@/components/admin/pdf-upload-form").then(mod => ({ default: mod.PDFUploadForm })), {
  loading: () => <ComponentLoader text="Loading uploader..." />,
})

const CategoryManager = dynamic(() => import("@/components/admin/category-manager").then(mod => ({ default: mod.CategoryManager })), {
  loading: () => <ComponentLoader text="Loading categories..." />,
})

const PDFList = dynamic(() => import("@/components/admin/pdf-list").then(mod => ({ default: mod.PDFList })), {
  loading: () => <ComponentLoader text="Loading PDFs..." />,
})

const AnalyticsDashboard = dynamic(() => import("@/components/admin/analytics-dashboard").then(mod => ({ default: mod.AnalyticsDashboard })), {
  loading: () => <ComponentLoader text="Loading analytics..." />,
})

const ReviewsManager = dynamic(() => import("@/components/admin/reviews-manager").then(mod => ({ default: mod.ReviewsManager })), {
  loading: () => <ComponentLoader text="Loading reviews..." />,
})

const SiteSettings = dynamic(() => import("@/components/admin/site-settings").then(mod => ({ default: mod.SiteSettings })), {
  loading: () => <ComponentLoader text="Loading settings..." />,
})

const ActivityLog = dynamic(() => import("@/components/admin/activity-log").then(mod => ({ default: mod.ActivityLog })), {
  loading: () => <ComponentLoader text="Loading activity log..." />,
})

const HomepageManager = dynamic(() => import("@/components/admin/homepage-manager").then(mod => ({ default: mod.HomepageManager })), {
  loading: () => <ComponentLoader text="Loading homepage manager..." />,
})

const FolderManager = dynamic(() => import("@/components/admin/folder-manager").then(mod => ({ default: mod.FolderManager })), {
  loading: () => <ComponentLoader text="Loading folder manager..." />,
})

const QuizManager = dynamic(() => import("@/components/admin/quiz-manager").then(mod => ({ default: mod.QuizManager })), {
  loading: () => <ComponentLoader text="Loading quiz manager..." />,
})

function ComponentLoader({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  async function fetchData() {
    try {
      const [catsRes, pdfsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/pdfs"),
      ])
      
      const catsData = await catsRes.json()
      const pdfsData = await pdfsRes.json()
      
      setCategories(catsData.categories || [])
      setPdfs(pdfsData.pdfs || [])
    } catch (error) {
      toast.error("Failed to fetch data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  function handleRefresh() {
    setRefreshing(true)
    fetchData()
    toast.success("Data refreshed!")
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_token")
    window.location.reload()
  }

  function handleUploadSuccess() {
    fetchData()
  }

  function handleCategoryChange() {
    fetchData()
  }

  function handlePDFDelete() {
    fetchData()
  }

  function handlePDFUpdate() {
    fetchData()
  }

  // Calculated stats
  const totalViews = pdfs.reduce((sum, pdf) => sum + (pdf.view_count || 0), 0)
  const totalDownloads = pdfs.reduce((sum, pdf) => sum + pdf.download_count, 0)
  const totalStorage = pdfs.reduce((sum, pdf) => sum + (pdf.file_size || 0), 0)
  const totalReviews = pdfs.reduce((sum, pdf) => sum + (pdf.review_count || 0), 0)
  const avgRating = pdfs.filter(p => p.average_rating).length > 0
    ? pdfs.filter(p => p.average_rating).reduce((sum, pdf) => sum + (pdf.average_rating || 0), 0) / pdfs.filter(p => p.average_rating).length
    : 0
  const engagementRate = totalViews > 0 ? ((totalDownloads / totalViews) * 100) : 0

  // Recent activity (last 7 days)
  const recentPdfs = pdfs.filter(pdf => {
    const uploadDate = new Date(pdf.created_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return uploadDate >= weekAgo
  })

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline font-medium">Back to Library</span>
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 blur opacity-50" />
              <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
                <Settings className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-base">Admin Dashboard</span>
              <p className="text-[10px] text-muted-foreground -mt-0.5">TechVyro Library</p>
            </div>
            <span className="sm:hidden font-semibold text-sm">Admin</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-2 sm:px-3 h-9 hover:bg-primary/5 hover:border-primary/50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              className="px-2 sm:px-3 h-9 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            Manage your PDF library, analytics, and settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-y-8">
          <TabsList className="flex flex-wrap h-auto gap-1.5 p-1.5 bg-muted/50 rounded-xl">
            <TabsTrigger value="overview" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="pdfs" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>PDFs</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary">
                {pdfs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="structure" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Structure</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Categories</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-accent/10 text-accent">
                {categories.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Quizzes</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="homepage" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Homepage</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Activity</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              <StatCard 
                label="Total PDFs" 
                value={pdfs.length} 
                icon={FileText}
                color="primary"
              />
              <StatCard 
                label="Categories" 
                value={categories.length} 
                icon={FolderPlus}
                color="accent"
              />
              <StatCard 
                label="Total Views" 
                value={totalViews} 
                icon={Eye}
                color="green"
              />
              <StatCard 
                label="Downloads" 
                value={totalDownloads} 
                icon={Download}
                color="blue"
              />
              <StatCard 
                label="Reviews" 
                value={totalReviews} 
                icon={MessageSquare}
                color="purple"
              />
              <StatCard 
                label="Storage" 
                value={formatBytes(totalStorage)} 
                icon={HardDrive}
                color="orange"
                isString
              />
            </div>

            {/* Quick Actions & Insights */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Quick Actions */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Frequently used actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full justify-start gap-3" 
                    variant="outline"
                    onClick={() => setActiveTab("upload")}
                  >
                    <Upload className="h-4 w-4 text-primary" />
                    Upload New PDF
                  </Button>
                  <Button 
                    className="w-full justify-start gap-3" 
                    variant="outline"
                    onClick={() => setActiveTab("categories")}
                  >
                    <FolderPlus className="h-4 w-4 text-accent" />
                    Add Category
                  </Button>
                  <Button 
                    className="w-full justify-start gap-3" 
                    variant="outline"
                    onClick={() => setActiveTab("analytics")}
                  >
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    View Analytics
                  </Button>
                  <Button 
                    className="w-full justify-start gap-3" 
                    variant="outline"
                    onClick={() => setActiveTab("reviews")}
                  >
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    Moderate Reviews
                  </Button>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Performance
                  </CardTitle>
                  <CardDescription>Key performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Engagement Rate</span>
                      <span className="font-medium">{engagementRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(engagementRate, 100)} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Average Rating</span>
                      <span className="font-medium flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {avgRating > 0 ? avgRating.toFixed(1) : "N/A"}
                      </span>
                    </div>
                    <Progress value={avgRating * 20} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Category Coverage</span>
                      <span className="font-medium">{categories.length > 0 ? Math.round((pdfs.filter(p => p.category_id).length / pdfs.length) * 100) : 0}%</span>
                    </div>
                    <Progress value={categories.length > 0 && pdfs.length > 0 ? (pdfs.filter(p => p.category_id).length / pdfs.length) * 100 : 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Recent Uploads
                  </CardTitle>
                  <CardDescription>PDFs added in the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentPdfs.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent uploads</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentPdfs.slice(0, 4).map((pdf) => (
                        <div key={pdf.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{pdf.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(pdf.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {recentPdfs.length > 4 && (
                        <Button 
                          variant="ghost" 
                          className="w-full text-xs h-8"
                          onClick={() => setActiveTab("pdfs")}
                        >
                          View all {recentPdfs.length} recent uploads
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Performing PDFs */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top Performing PDFs
                </CardTitle>
                <CardDescription>Most downloaded and viewed documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[...pdfs]
                    .sort((a, b) => b.download_count - a.download_count)
                    .slice(0, 6)
                    .map((pdf, index) => {
                      const category = categories.find(c => c.id === pdf.category_id)
                      return (
                        <div 
                          key={pdf.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                            index === 0 ? "bg-amber-500/20 text-amber-600" :
                            index === 1 ? "bg-slate-400/20 text-slate-500" :
                            index === 2 ? "bg-orange-600/20 text-orange-600" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            #{index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{pdf.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                {pdf.download_count}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {pdf.view_count || 0}
                              </span>
                            </div>
                          </div>
                          {category && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] h-5 shrink-0"
                              style={{ backgroundColor: category.color + "20", color: category.color, borderColor: category.color + "40" }}
                            >
                              {category.name}
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload New PDFs
                </CardTitle>
                <CardDescription>
                  Add new PDF documents to your library. Supports parallel uploads up to 50MB each.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PDFUploadForm 
                  categories={categories} 
                  onSuccess={handleUploadSuccess}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* PDFs Tab */}
          <TabsContent value="pdfs">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  All PDFs
                </CardTitle>
                <CardDescription>
                  View, edit, and manage all uploaded PDFs. Use search and filters to find specific files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PDFList 
                  pdfs={pdfs} 
                  categories={categories}
                  loading={loading}
                  onDelete={handlePDFDelete}
                  onUpdate={handlePDFUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Structure Tab - Folder > Category > Section */}
          <TabsContent value="structure">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderPlus className="h-5 w-5 text-primary" />
                  Content Structure
                </CardTitle>
                <CardDescription>
                  Create hierarchical structure: Folders contain Categories, and Categories contain Sections. 
                  This structure is displayed on the homepage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FolderManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Database Categories
                </CardTitle>
                <CardDescription>
                  Manage database categories for PDFs. These are linked to actual PDF files in the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryManager 
                  categories={categories}
                  onChange={handleCategoryChange}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quiz Management
                </CardTitle>
                <CardDescription>
                  Create and manage quizzes. Import from HTML or create from scratch. 
                  Quizzes display with TechVyro branding.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuizManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Manage Reviews
                </CardTitle>
                <CardDescription>
                  View, filter, and moderate user reviews. Delete inappropriate or spam reviews.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReviewsManager pdfs={pdfs} categories={categories} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard pdfs={pdfs} categories={categories} />
          </TabsContent>

          {/* Homepage Manager Tab */}
          <TabsContent value="homepage">
            <HomepageManager pdfs={pdfs} categories={categories} />
          </TabsContent>

          {/* Activity Log Tab */}
          <TabsContent value="activity">
            <ActivityLog pdfs={pdfs} categories={categories} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <SiteSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color,
  isString = false
}: { 
  label: string
  value: number | string
  icon: typeof FileText
  color: "primary" | "accent" | "green" | "blue" | "purple" | "orange"
  isString?: boolean
}) {
  const colorClasses = {
    primary: "border-primary/40 hover:shadow-primary/10 from-primary/20 to-primary/10 text-primary",
    accent: "border-accent/40 hover:shadow-accent/10 from-accent/20 to-accent/10 text-accent",
    green: "border-green-500/40 hover:shadow-green-500/10 from-green-500/20 to-green-500/10 text-green-500",
    blue: "border-blue-500/40 hover:shadow-blue-500/10 from-blue-500/20 to-blue-500/10 text-blue-500",
    purple: "border-purple-500/40 hover:shadow-purple-500/10 from-purple-500/20 to-purple-500/10 text-purple-500",
    orange: "border-orange-500/40 hover:shadow-orange-500/10 from-orange-500/20 to-orange-500/10 text-orange-500",
  }

  return (
    <Card className={`group border-border/50 hover:${colorClasses[color].split(' ')[0]} hover:shadow-lg ${colorClasses[color].split(' ')[1]} transition-all duration-300`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              {isString ? value : (typeof value === 'number' ? value.toLocaleString() : value)}
            </p>
          </div>
          <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorClasses[color].split(' ').slice(2, 4).join(' ')} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${colorClasses[color].split(' ')[4]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
