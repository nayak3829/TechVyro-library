import { Suspense } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/home/hero-section"
import { StatsSection } from "@/components/home/stats-section"
import { FeaturedSection } from "@/components/home/featured-section"
import { PDFGrid } from "@/components/pdf-grid"
import { Footer } from "@/components/footer"
import { Skeleton } from "@/components/ui/skeleton"
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

function getStats(pdfs: PDF[], categories: Category[]) {
  const totalDownloads = pdfs.reduce((sum, pdf) => sum + (pdf.download_count || 0), 0)
  const totalViews = pdfs.reduce((sum, pdf) => sum + (pdf.view_count || 0), 0)
  const avgRating = pdfs.filter(p => p.average_rating).length > 0
    ? pdfs.filter(p => p.average_rating).reduce((sum, pdf) => sum + (pdf.average_rating || 0), 0) / pdfs.filter(p => p.average_rating).length
    : 0
  return {
    totalPdfs: pdfs.length,
    totalCategories: categories.length,
    totalDownloads,
    totalViews,
    avgRating,
  }
}

function getFeaturedPDFs(pdfs: PDF[]) {
  const popular = [...pdfs].sort((a, b) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 4)
  const trending = [...pdfs].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 4)
  const recent = [...pdfs].slice(0, 4)
  const topRated = [...pdfs].filter(p => p.average_rating).sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).slice(0, 4)
  return { popular, trending, recent, topRated }
}

export default async function HomePage() {
  const configured = isSupabaseConfigured()
  const [pdfs, categories] = configured 
    ? await Promise.all([getPDFs(), getCategories()])
    : [[], []]
  
  const stats = getStats(pdfs, categories)
  const featured = getFeaturedPDFs(pdfs)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <HeroSection />
        
        {/* Stats Section */}
        {configured && pdfs.length > 0 && (
          <StatsSection stats={stats} />
        )}

        {/* Featured Section */}
        {configured && pdfs.length > 0 && (
          <FeaturedSection featured={featured} />
        )}

        {/* Setup Notice */}
        {!configured && (
          <section className="container mx-auto px-4 py-12">
            <div className="max-w-xl mx-auto p-6 rounded-2xl border border-amber-500/50 bg-amber-500/10">
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
          </section>
        )}

        {/* Main Content - PDF Grid */}
        <section id="content" className="container mx-auto px-4 py-8 sm:py-12">
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
      
      <Footer />
    </div>
  )
}
