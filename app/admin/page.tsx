"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Upload, FolderPlus, Trash2, FileText, LogOut, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PDFUploadForm } from "@/components/admin/pdf-upload-form"
import { CategoryManager } from "@/components/admin/category-manager"
import { PDFList } from "@/components/admin/pdf-list"
import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard"
import type { Category, PDF } from "@/lib/types"

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [pdfs, setPdfs] = useState<PDF[]>([])
  const [loading, setLoading] = useState(true)

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Library
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your PDF library, upload new documents, and organize categories
          </p>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload PDF
            </TabsTrigger>
            <TabsTrigger value="pdfs" className="gap-2">
              <FileText className="h-4 w-4" />
              Manage PDFs ({pdfs.length})
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Categories ({categories.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AnalyticsDashboard pdfs={pdfs} categories={categories} />
          </TabsContent>

          <TabsContent value="upload">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Upload New PDF</CardTitle>
                <CardDescription>
                  Add a new PDF document to your library
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
                <CardTitle>All PDFs</CardTitle>
                <CardDescription>
                  View and manage all uploaded PDFs
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
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  Create and manage document categories
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
        </Tabs>
      </main>
    </div>
  )
}
