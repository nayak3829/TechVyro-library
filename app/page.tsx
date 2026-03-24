import { Suspense } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/home/hero-section"
import { StatsSection } from "@/components/home/stats-section"
import { FeaturedSection } from "@/components/home/featured-section"
import { CategoriesSection } from "@/components/home/categories-section"
import { QuizSection } from "@/components/home/quiz-section"
import { TestSeriesSection } from "@/components/home/test-series-section"
import { TestimonialsSection } from "@/components/home/testimonials-section"
import { RecentlyViewedSection } from "@/components/home/recently-viewed-section"
import { SubjectsSection } from "@/components/home/subjects-section"
import { HomeAutoRefresh } from "@/components/home/home-auto-refresh"
import { Chatbot } from "@/components/chatbot"
import { PDFGrid } from "@/components/pdf-grid"
import { Footer } from "@/components/footer"
import { Skeleton } from "@/components/ui/skeleton"
import type { PDF, Category } from "@/lib/types"

export const revalidate = 60

const DEFAULT_WHATSAPP_URL = "https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37"

interface HomepageSettings {
  libraryBadge: string
  libraryTitle: string
  librarySubtitle: string
  ctaBadge: string
  ctaTitle: string
  ctaDescription: string
  ctaPrimaryBtn: string
  ctaSecondaryBtn: string
}

const DEFAULT_HOMEPAGE: HomepageSettings = {
  libraryBadge: "Full Library",
  libraryTitle: "Explore All PDFs",
  librarySubtitle: "Filter by category or search for specific materials",
  ctaBadge: "Start Today — It's Free",
  ctaTitle: "Ready to Start Learning?",
  ctaDescription: "Join thousands of students who trust TechVyro for quality study materials. Everything you need, completely free.",
  ctaPrimaryBtn: "Browse All PDFs",
  ctaSecondaryBtn: "Get Updates on WhatsApp",
}

async function getGeneralSettings(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {}
  const supabase = await createClient()
  if (!supabase) return {}
  const { data } = await supabase.from("site_settings").select("value").eq("key", "general_settings").single()
  return (data?.value as Record<string, string>) ?? {}
}

async function getHomepageSettings(): Promise<HomepageSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_HOMEPAGE
  const supabase = await createClient()
  if (!supabase) return DEFAULT_HOMEPAGE
  const { data } = await supabase.from("site_settings").select("value").eq("key", "homepage_settings").single()
  if (!data?.value) return DEFAULT_HOMEPAGE
  return { ...DEFAULT_HOMEPAGE, ...(data.value as Partial<HomepageSettings>) }
}

async function getPDFs(): Promise<PDF[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("pdfs")
    .select(`*, category:categories(*)`)
    .order("created_at", { ascending: false })
  if (error) return []
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
  if (error) return []
  return data || []
}

function getStats(pdfs: PDF[], categories: Category[]) {
  const totalDownloads = pdfs.reduce((sum, pdf) => sum + (pdf.download_count || 0), 0)
  const totalViews = pdfs.reduce((sum, pdf) => sum + (pdf.view_count || 0), 0)
  const avgRating = pdfs.filter(p => p.average_rating).length > 0
    ? pdfs.filter(p => p.average_rating).reduce((sum, pdf) => sum + (pdf.average_rating || 0), 0) / pdfs.filter(p => p.average_rating).length
    : 0
  return { totalPdfs: pdfs.length, totalCategories: categories.length, totalDownloads, totalViews, avgRating }
}

function getFeaturedPDFs(pdfs: PDF[]) {
  const popular = [...pdfs].sort((a, b) => (b.download_count || 0) - (a.download_count || 0)).slice(0, 4)
  const trending = [...pdfs].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 4)
  const recent = [...pdfs].slice(0, 4)
  const topRated = [...pdfs].filter(p => p.average_rating).sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).slice(0, 4)
  return { popular, trending, recent, topRated }
}

function groupPdfsByCategory(pdfs: PDF[]): Record<string, PDF[]> {
  return pdfs.reduce((acc, pdf) => {
    if (pdf.category_id) {
      if (!acc[pdf.category_id]) acc[pdf.category_id] = []
      acc[pdf.category_id].push(pdf)
    }
    return acc
  }, {} as Record<string, PDF[]>)
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const configured = isSupabaseConfigured()
  const [pdfs, categories, generalSettings, homepageSettings] = configured
    ? await Promise.all([getPDFs(), getCategories(), getGeneralSettings(), getHomepageSettings()])
    : [[], [], {}, DEFAULT_HOMEPAGE]

  const whatsappUrl = (generalSettings as Record<string, string>).whatsappChannelUrl || DEFAULT_WHATSAPP_URL

  const stats = getStats(pdfs, categories)
  const featured = getFeaturedPDFs(pdfs)
  const pdfsByCategory = groupPdfsByCategory(pdfs)
  const { q: initialSearch = "" } = await searchParams

  const hp = homepageSettings

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* 1. HERO SECTION */}
        <HeroSection />

        {/* 2. RECENTLY VIEWED (client-side localStorage) */}
        <RecentlyViewedSection />

        {/* 3. SUBJECTS SECTION */}
        <SubjectsSection />

        {/* 4. STATS SECTION */}
        {configured && pdfs.length > 0 && (
          <StatsSection stats={stats} />
        )}

        {/* 3. FEATURED PDFs */}
        {configured && pdfs.length > 0 && (
          <FeaturedSection featured={featured} />
        )}

        {/* 4. CATEGORIES / FOLDERS */}
        {configured && categories.length > 0 && (
          <CategoriesSection categories={categories} pdfsByCategory={pdfsByCategory} />
        )}

        {/* 5. QUIZ SECTION */}
        <QuizSection />

        {/* 5.5. TEST SERIES SECTION */}
        <TestSeriesSection />

        {/* 6. ALL PDFs GRID */}
        <section id="content" className="py-14 sm:py-18 lg:py-22 bg-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(120,80,200,0.04),transparent)]" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {hp.libraryBadge}
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-3 tracking-tight">
                {hp.libraryTitle}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                {hp.librarySubtitle}
              </p>
            </div>

            {!configured && (
              <div className="max-w-md mx-auto p-6 rounded-xl border border-amber-500/50 bg-amber-500/10 mb-8">
                <h2 className="text-base font-semibold text-amber-600 mb-2">Setup Required</h2>
                <p className="text-xs text-muted-foreground mb-3">
                  Add environment variables to your project:
                </p>
                <ul className="text-xs font-mono space-y-1 text-muted-foreground">
                  <li>NEXT_PUBLIC_SUPABASE_URL</li>
                  <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                  <li>SUPABASE_SERVICE_ROLE_KEY</li>
                </ul>
              </div>
            )}

            <Suspense fallback={
              <div className="space-y-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-16 sm:h-20 rounded-lg" />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                  ))}
                </div>
              </div>
            }>
              <PDFGrid pdfs={pdfs} categories={categories} initialSearch={initialSearch} />
            </Suspense>
          </div>
        </section>

        {/* 7. TESTIMONIALS */}
        <TestimonialsSection />

        {/* 8. BOTTOM CTA */}
        <section className="relative py-20 sm:py-24 lg:py-32 overflow-hidden bg-background">
          {/* Sophisticated layered bg */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(120,80,200,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_10%_0%,rgba(239,68,68,0.06),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(120,80,200,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(120,80,200,0.022)_1px,transparent_1px)] bg-[size:72px_72px]" />
          {/* Glow orbs */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

          <div className="container mx-auto px-4 relative">
            <div className="max-w-2xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {hp.ctaBadge}
              </div>

              {/* Headline */}
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-5 tracking-tight leading-[1.1] text-balance">
                {hp.ctaTitle.includes("Learning") ? (
                  <>
                    {hp.ctaTitle.split("Learning")[0]}
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Learning?</span>
                  </>
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: hp.ctaTitle }} />
                )}
              </h3>

              <p className="text-muted-foreground text-sm sm:text-base mb-10 max-w-lg mx-auto leading-relaxed">
                {hp.ctaDescription}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="#content"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-92 transition-all duration-200 shadow-2xl shadow-primary/25 hover:-translate-y-0.5"
                >
                  {hp.ctaPrimaryBtn}
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm text-foreground text-sm font-semibold hover:border-[#25D366]/50 hover:bg-[#25D366]/5 transition-all duration-200"
                >
                  <svg className="h-5 w-5 text-[#25D366] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {hp.ctaSecondaryBtn}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <HomeAutoRefresh />
      <Chatbot />
    </div>
  )
}
