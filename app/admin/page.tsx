"use client"

import { useEffect, useState, Suspense } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ArrowLeft, Plus, Upload, FolderPlus, Trash2, FileText, LogOut, BarChart3, RefreshCw, Settings, Database, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
      console.error("[v0] Error fetching data:", error)
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

  // Quick stats
  const totalViews = pdfs.reduce((sum, pdf) => sum + (pdf.view_count || 0), 0)
  const totalDownloads = pdfs.reduce((sum, pdf) => sum + pdf.download_count, 0)
  const totalStorage = pdfs.reduce((sum, pdf) => sum + (pdf.file_size || 0), 0)

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Library</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm sm:text-base">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-2 sm:px-3"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total PDFs</p>
                  <p className="text-xl sm:text-2xl font-bold">{pdfs.length}</p>
                </div>
                <FileText className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                  <p className="text-xl sm:text-2xl font-bold">{categories.length}</p>
                </div>
                <FolderPlus className="h-8 w-8 text-accent/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalViews.toLocaleString()}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500/30" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Storage Used</p>
                  <p className="text-xl sm:text-2xl font-bold">{formatBytes(totalStorage)}</p>
                </div>
                <Database className="h-8 w-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">Manage Library</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-muted-foreground">
            Upload PDFs, manage categories, and view analytics
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-4 sm:space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50">
            <TabsTrigger value="upload" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 data-[state=active]:bg-background">
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger value="pdfs" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 data-[state=active]:bg-background">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>PDFs</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {pdfs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 data-[state=active]:bg-background">
              <FolderPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Categories</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {categories.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 data-[state=active]:bg-background">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="categories">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderPlus className="h-5 w-5 text-primary" />
                  Categories
                </CardTitle>
                <CardDescription>
                  Create and manage document categories. Categories help organize your PDF library.
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

          <TabsContent value="analytics">
            <AnalyticsDashboard pdfs={pdfs} categories={categories} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
