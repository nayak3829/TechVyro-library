import { Suspense } from "react"
import type { Metadata } from "next"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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
import type { PDF, Category, HomepageQuiz } from "@/lib/types"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"
import { getPublicPdfStats } from "@/lib/public-pdf-stats"
import { getRecentDownloadCount } from "@/lib/analytics-events"
import { getQuizList } from "@/lib/quiz-cache"
import {
  DEFAULT_HOMEPAGE_SETTINGS,
  DEFAULT_HERO_SETTINGS,
  isSafeHttpUrl,
  normalizeHeroSettings,
  normalizeHomepageSettings,
  type HeroSettings,
  type HomepageTextSettings,
} from "@/lib/homepage-settings"

export const revalidate = 60
export const metadata: Metadata = {
  title: "TechVyro | Free PDFs, Quizzes & Mock Tests",
  description: "Browse free study PDFs, quizzes, and mock tests for competitive exams and academic subjects.",
  alternates: { canonical: "/" },
}

const DEFAULT_WHATSAPP_URL = "https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37"
const HOMEPAGE_PDF_LIMIT = 60

async function readSiteSetting(key: string) {
  async function query() {
    const supabase = createAdminClient()
    return supabase.from("site_settings").select("value").eq("key", key).maybeSingle()
  }

  let result = await query()
  if (result.error?.message.includes("JWT issued at future")) {
    await new Promise(resolve => setTimeout(resolve, 750))
    result = await query()
  }
  return result
}

async function getGeneralSettings(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {}
  const { data, error } = await readSiteSetting("general_settings")
  if (error) {
    console.error("[homepage] failed to load general settings:", error.message)
    return {}
  }
  return (data?.value as Record<string, string>) ?? {}
}

async function getHomepageSettings(): Promise<HomepageTextSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_HOMEPAGE_SETTINGS
  const { data, error } = await readSiteSetting("homepage_settings")
  if (error) {
    console.error("[homepage] failed to load homepage settings:", error.message)
    return DEFAULT_HOMEPAGE_SETTINGS
  }
  return normalizeHomepageSettings(data?.value)
}

async function getHeroSettings(): Promise<HeroSettings> {
  if (!isSupabaseConfigured()) return DEFAULT_HERO_SETTINGS
  const { data, error } = await readSiteSetting("hero_settings")
  if (error) {
    console.error("[homepage] failed to load hero settings:", error.message)
    return DEFAULT_HERO_SETTINGS
  }
  return normalizeHeroSettings(data?.value)
}

async function getPDFs(): Promise<PDF[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  if (!supabase) return []
  const { data, error } = await applyPublicPdfVisibility(supabase
    .from("pdfs")
    .select(`
      id, title, description, file_size, page_count, category_id, download_count,
      view_count, average_rating, review_count, created_at, updated_at,
      visibility, allow_download, tags, thumbnail_path,
      content_type, content_category, content_subcategory, subject,
      category:categories(id, name, slug, color, created_at)
    `)
    )
    .order("created_at", { ascending: false })
    .limit(HOMEPAGE_PDF_LIMIT)
  if (error) {
    console.error("[homepage] failed to load PDFs:", error.message)
    return []
  }
  return (data || []).map((pdf: { id: string; thumbnail_path?: string | null } & Record<string, unknown>) => ({
    ...pdf,
    thumbnail_url: `/api/pdfs/${pdf.id}/thumbnail`,
    thumbnail_path: undefined,
  })) as unknown as PDF[]
}

async function getCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, color, created_at")
    .order("name")
  if (error) {
    console.error("[homepage] failed to load categories:", error.message)
    return []
  }
  return data || []
}

async function getStats() {
  const supabase = createAdminClient()
  const [pdfStats, categoryCount, weeklyDownloads] = await Promise.all([
    getPublicPdfStats(supabase),
    supabase.from("categories").select("id", { count: "exact", head: true }),
    getRecentDownloadCount(7),
  ])
  if (pdfStats.error || categoryCount.error) {
    console.error("[homepage] failed to load aggregate stats:", pdfStats.error?.message || categoryCount.error?.message)
  }
  return {
    totalPdfs: pdfStats.data?.totalPdfs ?? 0,
    totalCategories: categoryCount.count ?? 0,
    totalDownloads: pdfStats.data?.totalDownloads ?? 0,
    totalViews: pdfStats.data?.totalViews ?? 0,
    avgRating: pdfStats.data?.avgRating ?? 0,
    thisWeekUploads: pdfStats.data?.thisWeekUploads ?? 0,
    thisWeekDownloads: weeklyDownloads.count,
  }
}

async function getHomepageQuizzes(): Promise<HomepageQuiz[]> {
  try {
    const quizzes = (await getQuizList()).filter(
      quiz => quiz.enabled && quiz.hasContent && quiz.visibility === "public"
    )
    return quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      section: quiz.section,
      difficulty: quiz.difficulty,
      time_limit: quiz.time_limit,
      questions: quiz.questions.map(question => ({
        id: typeof question.id === "string" ? question.id : "",
      })),
      enabled: quiz.enabled,
      created_at: quiz.created_at,
    }))
  } catch (error) {
    console.error("[homepage] failed to load quizzes:", error)
    return []
  }
}

const HOMEPAGE_PDF_SELECT = `
  id, title, description, file_size, page_count, category_id, download_count,
  view_count, average_rating, review_count, created_at, updated_at,
  visibility, allow_download, tags, thumbnail_path,
  content_type, content_category, content_subcategory, subject,
  category:categories(id, name, slug, color, created_at)
`

function mapHomepagePdfs(data: Array<{ id: string } & Record<string, unknown>> | null): PDF[] {
  return (data || []).map(pdf => ({
    ...pdf,
    thumbnail_url: `/api/pdfs/${pdf.id}/thumbnail`,
    thumbnail_path: undefined,
  })) as unknown as PDF[]
}

async function getFeaturedPDFs() {
  if (!isSupabaseConfigured()) return { popular: [], trending: [], recent: [], topRated: [] }
  const supabase = await createClient()
  if (!supabase) return { popular: [], trending: [], recent: [], topRated: [] }
  const query = () => applyPublicPdfVisibility(supabase.from("pdfs").select(HOMEPAGE_PDF_SELECT))
  const [popular, trending, recent, topRated] = await Promise.all([
    query().gt("download_count", 0).order("download_count", { ascending: false }).limit(4),
    query().gt("view_count", 0).order("view_count", { ascending: false }).limit(4),
    query().order("updated_at", { ascending: false }).limit(4),
    query().gt("average_rating", 0).order("average_rating", { ascending: false }).limit(4),
  ])
  for (const [label, result] of Object.entries({ popular, trending, recent, topRated })) {
    if (result.error) console.error(`[homepage] failed to load ${label} PDFs:`, result.error.message)
  }
  return {
    popular: mapHomepagePdfs(popular.data),
    trending: mapHomepagePdfs(trending.data),
    recent: mapHomepagePdfs(recent.data),
    topRated: mapHomepagePdfs(topRated.data),
  }
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
  const [pdfs, categories, generalSettings, homepageSettings, heroSettings, stats, homepageQuizzes, featured] = configured
    ? await Promise.all([
        getPDFs(),
        getCategories(),
        getGeneralSettings(),
        getHomepageSettings(),
        getHeroSettings(),
        getStats(),
        getHomepageQuizzes(),
        getFeaturedPDFs(),
      ])
    : [[], [], {}, DEFAULT_HOMEPAGE_SETTINGS, DEFAULT_HERO_SETTINGS, {
        totalPdfs: 0, totalCategories: 0, totalDownloads: 0, totalViews: 0,
        avgRating: 0, thisWeekUploads: 0, thisWeekDownloads: 0,
      }, [], { popular: [], trending: [], recent: [], topRated: [] }]

  const configuredWhatsapp = (generalSettings as Record<string, unknown>).whatsappChannelUrl
  const whatsappUrl = typeof configuredWhatsapp === "string" && isSafeHttpUrl(configuredWhatsapp)
    ? configuredWhatsapp || DEFAULT_WHATSAPP_URL
    : DEFAULT_WHATSAPP_URL

  const quizStats = {
    totalQuizzes: homepageQuizzes.length,
    totalQuestions: homepageQuizzes.reduce((total, quiz) => total + quiz.questions.length, 0),
  }
  const pdfsByCategory = groupPdfsByCategory(pdfs)
  const { q: initialSearch = "" } = await searchParams

  const hp = homepageSettings

  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />

      <main>
        {/* 1. HERO SECTION */}
        <HeroSection
          settings={heroSettings}
          totalPdfs={stats.totalPdfs}
          totalQuizzes={quizStats.totalQuizzes}
          totalQuestions={quizStats.totalQuestions}
          recentPdfs={featured.recent.slice(0, 3).map(pdf => ({
            id: pdf.id,
            title: pdf.title,
            updated_at: pdf.updated_at,
          }))}
        />

        {/* Continue from local study history */}
        <RecentlyViewedSection
          pdfs={pdfs.map(pdf => ({ id: pdf.id, title: pdf.title }))}
          quizzes={homepageQuizzes.map(quiz => ({ id: quiz.id, title: quiz.title }))}
        />

        {/* Start with navigation, then surface discoveries */}
        <SubjectsSection />

        {/* Exam and subject structure */}
        {configured && categories.length > 0 && (
          <CategoriesSection categories={categories} pdfsByCategory={pdfsByCategory} />
        )}

        {/* Practice */}
        <QuizSection initialQuizzes={homepageQuizzes} />

        {/* Timed preparation */}
        <TestSeriesSection />

        {/* Genuinely sorted, data-backed recent and popular resources */}
        {configured && pdfs.length > 0 && (
          <FeaturedSection featured={featured} initialQuizzes={homepageQuizzes} />
        )}

        {/* 6. ALL PDFs GRID */}
        <section id="content" className="relative overflow-hidden bg-background py-16 sm:py-20 lg:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(49,72,120,0.07),transparent)]" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {hp.libraryBadge}
              </div>
              <h2 className="study-display text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl lg:text-5xl mb-3">
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
              <PDFGrid pdfs={pdfs} categories={categories} initialSearch={initialSearch} totalPdfs={stats.totalPdfs} />
            </Suspense>
          </div>
        </section>

        {configured && pdfs.length > 0 && <StatsSection stats={stats} />}

        <TestimonialsSection />

        <section className="relative overflow-hidden bg-background py-20 sm:py-24 lg:py-32">
          {/* Sophisticated layered bg */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(49,72,120,0.14),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_10%_0%,rgba(183,129,48,0.09),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(49,72,120,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(49,72,120,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
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
              <h3 className="study-display mb-5 text-4xl font-bold leading-[1.04] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl text-balance">
                {hp.ctaTitle}
              </h3>

              <p className="text-muted-foreground text-sm sm:text-base mb-10 max-w-lg mx-auto leading-relaxed">
                {hp.ctaDescription}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="#content"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-92 transition-all duration-200 shadow-xl shadow-primary/20 hover:-translate-y-0.5"
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
