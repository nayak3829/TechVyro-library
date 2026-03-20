import { Suspense } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { PDFGrid } from "@/components/pdf-grid"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Download, FolderOpen, TrendingUp } from "lucide-react"
import type { PDF, Category } from "@/lib/types"

export const revalidate = 60

async function getPDFs(): Promise<PDF[]> {
  if (!isSupabaseConfigured()) return []
  
  const supabase = await createClient()
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from("pdfs")
    .select(`
      *,
      category:categories(*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching PDFs:", error)
    return []
  }

  return data || []
}

async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return []
  
  const supabase = await createClient()
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  if (error) {
    console.error("[v0] Error fetching categories:", error)
    return []
  }

  return data || []
}

// Calculate stats from PDFs
function getStats(pdfs: PDF[], categories: Category[]) {
  const totalDownloads = pdfs.reduce((sum, pdf) => sum + (pdf.download_count || 0), 0)
  const totalViews = pdfs.reduce((sum, pdf) => sum + (pdf.view_count || 0), 0)
  return {
    totalPdfs: pdfs.length,
    totalCategories: categories.length,
    totalDownloads,
    totalViews,
  }
}

export default async function HomePage() {
  const configured = isSupabaseConfigured()
  const [pdfs, categories] = configured 
    ? await Promise.all([getPDFs(), getCategories()])
    : [[], []]
  
  const stats = getStats(pdfs, categories)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/40">
          {/* Background Pattern - Enhanced */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/8" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,80,200,0.15),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_100%,rgba(239,68,68,0.08),transparent)]" />
          
          {/* Animated grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,transparent_49%,var(--border)_50%,transparent_51%,transparent_100%),linear-gradient(to_bottom,transparent_0%,transparent_49%,var(--border)_50%,transparent_51%,transparent_100%)] bg-[length:4rem_4rem] opacity-[0.03]" />
          
          <div className="container mx-auto px-4 py-12 sm:py-20 relative">
            <div className="max-w-4xl mx-auto text-center space-y-5 sm:space-y-8">
              {/* Logo Badge - Enhanced */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/25 text-xs sm:text-sm font-semibold text-primary shadow-sm">
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary/20">
                  <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
                Free Educational PDF Library
              </div>
              
              {/* Main Heading - Enhanced */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                <span className="text-foreground">Welcome to </span>
                <span className="relative">
                  <span className="bg-gradient-to-r from-[#ef4444] via-primary to-accent bg-clip-text text-transparent">
                    TechVyro
                  </span>
                  <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-[#ef4444] via-primary to-accent rounded-full opacity-50 blur-sm" />
                </span>
              </h1>
              
              {/* Subtitle - Enhanced */}
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed font-medium">
                Discover our curated collection of educational PDFs. Browse categories, search documents, and download with watermark protection.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
                <a 
                  href="#content"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold text-sm sm:text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  Browse PDFs
                </a>
                <a 
                  href="https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border/50 text-foreground font-semibold text-sm sm:text-base hover:bg-muted hover:border-primary/30 transition-all duration-300"
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Join WhatsApp
                </a>
              </div>
            </div>

            {/* Stats Cards - Enhanced with animations */}
            {configured && pdfs.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 mt-10 sm:mt-16 max-w-4xl mx-auto">
                <div className="group relative bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-border/50 text-center hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalPdfs}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total PDFs</p>
                  </div>
                </div>
                
                <div className="group relative bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-border/50 text-center hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 group-hover:scale-110 transition-transform duration-300">
                      <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalCategories}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Categories</p>
                  </div>
                </div>
                
                <div className="group relative bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-border/50 text-center hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 group-hover:scale-110 transition-transform duration-300">
                      <Download className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalDownloads.toLocaleString()}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Downloads</p>
                  </div>
                </div>
                
                <div className="group relative bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-border/50 text-center hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalViews.toLocaleString()}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total Views</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Main Content */}
        <section id="content" className="container mx-auto px-4 py-8 sm:py-12">
          {!configured && (
            <div className="max-w-xl mx-auto mb-8 p-6 rounded-lg border border-amber-500/50 bg-amber-500/10">
              <h2 className="text-lg font-semibold text-amber-600 mb-2">Setup Required</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Add these environment variables to your Vercel project:
              </p>
              <ul className="text-sm font-mono space-y-1 text-muted-foreground">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                <li>SUPABASE_SERVICE_ROLE_KEY</li>
              </ul>
            </div>
          )}

          <Suspense fallback={
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                ))}
              </div>
            </div>
          }>
            <PDFGrid pdfs={pdfs} categories={categories} />
          </Suspense>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="relative border-t border-border/40 bg-gradient-to-b from-muted/30 to-muted/50">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(120,80,200,0.05),transparent)] pointer-events-none" />
        
        <div className="container mx-auto px-4 py-12 sm:py-16 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-12">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <span className="text-xl font-bold">
                    <span className="text-[#ef4444]">Tech</span>
                    <span className="text-foreground">Vyro</span>
                  </span>
                  <p className="text-[10px] text-muted-foreground">PDF Library</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your go-to destination for educational PDFs. Free downloads with watermark protection. Quality content curated for learners.
              </p>
              {/* Social Links inline with brand */}
              <div className="flex gap-2 pt-1">
                <a
                  href="https://www.instagram.com/techvyro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-9 w-9 items-center justify-center rounded-lg bg-card/80 border border-border/50 hover:bg-gradient-to-br hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white hover:border-transparent transition-all duration-300"
                  aria-label="Instagram"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/share/187KsWWacM/?mibextid=wwXIfr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-9 w-9 items-center justify-center rounded-lg bg-card/80 border border-border/50 hover:bg-[#1877f2] hover:text-white hover:border-transparent transition-all duration-300"
                  aria-label="Facebook"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-9 w-9 items-center justify-center rounded-lg bg-card/80 border border-border/50 hover:bg-[#25D366] hover:text-white hover:border-transparent transition-all duration-300"
                  aria-label="WhatsApp Channel"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
                <a
                  href="https://t.me/techvyro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-9 w-9 items-center justify-center rounded-lg bg-card/80 border border-border/50 hover:bg-[#0088cc] hover:text-white hover:border-transparent transition-all duration-300"
                  aria-label="Telegram"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary" />
                Quick Links
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a href="/" className="inline-flex items-center gap-2 hover:text-primary hover:translate-x-1 transition-all duration-200">
                    <span className="h-px w-3 bg-border group-hover:bg-primary transition-colors" />
                    Home
                  </a>
                </li>
                <li>
                  <a href="/admin" className="inline-flex items-center gap-2 hover:text-primary hover:translate-x-1 transition-all duration-200">
                    <span className="h-px w-3 bg-border" />
                    Admin Panel
                  </a>
                </li>
                <li>
                  <a href="https://www.techvyro.in/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-primary hover:translate-x-1 transition-all duration-200">
                    <span className="h-px w-3 bg-border" />
                    Main Website
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-accent" />
                Contact Us
              </h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a 
                    href="mailto:techvyro@gmail.com"
                    className="flex items-center gap-3 hover:text-primary transition-colors group"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border/50 group-hover:border-primary/30 transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    techvyro@gmail.com
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.techvyro.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 hover:text-primary transition-colors group"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border/50 group-hover:border-primary/30 transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </span>
                    www.techvyro.in
                  </a>
                </li>
              </ul>
            </div>

            {/* WhatsApp CTA */}
            <div className="space-y-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#25D366]" />
                Stay Updated
              </h3>
              <p className="text-sm text-muted-foreground">
                Join our WhatsApp channel for exclusive updates, new PDF releases, and tech tips.
              </p>
              <a
                href="https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-medium hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/20 hover:shadow-xl hover:shadow-[#25D366]/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Join Channel
              </a>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <span>&copy; {new Date().getFullYear()}</span>
              <span className="font-semibold">
                <span className="text-[#ef4444]">Tech</span>
                <span className="text-foreground">Vyro</span>
              </span>
              <span>All rights reserved.</span>
            </p>
            <p className="flex items-center gap-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Made with care for education
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
