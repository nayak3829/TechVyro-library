import { Suspense } from "react"
import type { Metadata } from "next"
import dynamic from "next/dynamic"
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
import { PDFGrid } from "@/components/pdf-grid"
import { Footer } from "@/components/footer"
import { Skeleton } from "@/components/ui/skeleton"
import type { PDF, Category, HomepageQuiz } from "@/lib/types"
import { getPublicPdfStats } from "@/lib/public-pdf-stats"
import { getHomepagePdfs } from "@/lib/homepage-pdfs"
import { getRecentDownloadCount } from "@/lib/analytics-events"
import { getPublicQuizList } from "@/lib/quiz-cache"
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
  openGraph: {
    title: "TechVyro | Free PDFs, Quizzes & Mock Tests",
    description: "Browse free study PDFs, quizzes, and mock tests for competitive exams and academic subjects.",
    url: "/",
    type: "website",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TechVyro | Free PDFs, Quizzes & Mock Tests",
    description: "Browse free study PDFs, quizzes, and mock tests for competitive exams and academic subjects.",
    images: ["/og-image.jpg"],
  },
}

const DEFAULT_WHATSAPP_URL = "https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37"
const Chatbot = dynamic(() => import("@/components/chatbot").then(module => module.Chatbot))

async function getHomepageConfiguration(): Promise<{
  generalSettings: Record<string, string>
  homepageSettings: HomepageTextSettings
  heroSettings: HeroSettings
}> {
  if (!isSupabaseConfigured()) {
    return {
      generalSettings: {},
      homepageSettings: DEFAULT_HOMEPAGE_SETTINGS,
      heroSettings: DEFAULT_HERO_SETTINGS,
    }
  }

  async function query() {
    const supabase = createAdminClient()
    return supabase
      .from("site_settings")
      .select("key,value")
      .in("key", ["general_settings", "homepage_settings", "hero_settings"])
  }

  let result = await query()
  if (result.error?.message.includes("JWT issued at future")) {
    await new Promise(resolve => setTimeout(resolve, 750))
    result = await query()
  }
  if (result.error) {
    console.error("[homepage] failed to load site settings:", result.error.message)
    return {
      generalSettings: {},
      homepageSettings: DEFAULT_HOMEPAGE_SETTINGS,
      heroSettings: DEFAULT_HERO_SETTINGS,
    }
  }

  const values = new Map((result.data || []).map(row => [row.key, row.value]))
  return {
    generalSettings: (values.get("general_settings") as Record<string, string>) ?? {},
    homepageSettings: normalizeHomepageSettings(values.get("homepage_settings")),
    heroSettings: normalizeHeroSettings(values.get("hero_settings")),
  }
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
  const [pdfStats, weeklyDownloads] = await Promise.all([
    getPublicPdfStats(supabase),
    getRecentDownloadCount(7),
  ])
  if (pdfStats.error) {
    console.error("[homepage] failed to load aggregate stats:", pdfStats.error.message)
  }
  return {
    totalPdfs: pdfStats.data?.totalPdfs ?? 0,
    totalCategories: 0,
    totalDownloads: pdfStats.data?.totalDownloads ?? 0,
    totalViews: pdfStats.data?.totalViews ?? 0,
    avgRating: pdfStats.data?.avgRating ?? 0,
    thisWeekUploads: pdfStats.data?.thisWeekUploads ?? 0,
    thisWeekDownloads: weeklyDownloads.count,
  }
}

async function getHomepageQuizData(): Promise<{
  quizzes: HomepageQuiz[]
  totalQuizzes: number
  totalQuestions: number
}> {
  try {
    const quizzes = await getPublicQuizList()
    const projected = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      section: quiz.section,
      difficulty: quiz.difficulty,
      time_limit: quiz.time_limit,
      question_count: quiz.question_count,
      enabled: quiz.enabled,
      created_at: quiz.created_at,
    }))
    const candidates = [
      ...projected.slice(0, 4),
      ...[...projected].sort((a, b) => b.question_count - a.question_count).slice(0, 4),
      ...[...projected].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 4),
      ...[...projected].sort((a, b) => {
        const order: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
        return (order[a.difficulty.toLowerCase()] ?? 3) - (order[b.difficulty.toLowerCase()] ?? 3)
      }).slice(0, 4),
    ]
    return {
      quizzes: [...new Map(candidates.map(quiz => [quiz.id, quiz])).values()],
      totalQuizzes: projected.length,
      totalQuestions: projected.reduce((total, quiz) => total + quiz.question_count, 0),
    }
  } catch (error) {
    console.error("[homepage] failed to load quizzes:", error)
    return { quizzes: [], totalQuizzes: 0, totalQuestions: 0 }
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

async function HomepageDataContent({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const configured = isSupabaseConfigured()
  const [pdfData, categories, configuration, rawStats, quizData] = configured
    ? await Promise.all([
        getHomepagePdfs(createAdminClient()),
        getCategories(),
        getHomepageConfiguration(),
        getStats(),
        getHomepageQuizData(),
      ])
    : [{ pdfs: [], featured: { popular: [], trending: [], recent: [], topRated: [] } }, [], {
        generalSettings: {},
        homepageSettings: DEFAULT_HOMEPAGE_SETTINGS,
        heroSettings: DEFAULT_HERO_SETTINGS,
      }, {
        totalPdfs: 0, totalCategories: 0, totalDownloads: 0, totalViews: 0,
        avgRating: 0, thisWeekUploads: 0, thisWeekDownloads: 0,
      }, { quizzes: [], totalQuizzes: 0, totalQuestions: 0 }]

  const pdfs = pdfData.pdfs
  const { generalSettings, homepageSettings, heroSettings } = configuration
  const homepageQuizzes = quizData.quizzes
  const stats = { ...rawStats, totalCategories: categories.length }
  const featured = {
    ...pdfData.featured,
    recent: [...pdfs]
      .sort((a, b) => Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at))
      .slice(0, 4),
  }

  const configuredWhatsapp = (generalSettings as Record<string, unknown>).whatsappChannelUrl
  const whatsappUrl = typeof configuredWhatsapp === "string" && isSafeHttpUrl(configuredWhatsapp)
    ? configuredWhatsapp || DEFAULT_WHATSAPP_URL
    : DEFAULT_WHATSAPP_URL

  const quizStats = {
    totalQuizzes: quizData.totalQuizzes,
    totalQuestions: quizData.totalQuestions,
  }
  const pdfsByCategory = groupPdfsByCategory(pdfs)
  const { q: initialSearch = "" } = await searchParams

  const hp = homepageSettings

  return (
    <>
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
        <div className="home-below-fold">
          <RecentlyViewedSection
            pdfs={pdfs.map(pdf => ({ id: pdf.id, title: pdf.title }))}
            quizzes={homepageQuizzes.map(quiz => ({ id: quiz.id, title: quiz.title }))}
          />
        </div>

        {/* Start with navigation, then surface discoveries */}
        <div className="home-below-fold">
          <SubjectsSection />
        </div>

        {/* Exam and subject structure */}
        {configured && categories.length > 0 && (
          <div className="home-below-fold">
            <CategoriesSection categories={categories} pdfsByCategory={pdfsByCategory} />
          </div>
        )}

        {/* Practice */}
        <div className="home-below-fold">
          <QuizSection initialQuizzes={homepageQuizzes} />
        </div>

        {/* Timed preparation */}
        <div className="home-below-fold">
          <TestSeriesSection />
        </div>

        {/* Genuinely sorted, data-backed recent and popular resources */}
        {configured && pdfs.length > 0 && (
          <div className="home-below-fold">
            <FeaturedSection featured={featured} initialQuizzes={homepageQuizzes} />
          </div>
        )}

        {/* 6. ALL PDFs GRID */}
        <section id="content" className="home-below-fold-large relative overflow-hidden bg-background py-16 sm:py-20 lg:py-24">
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

        {configured && pdfs.length > 0 && (
          <div className="home-below-fold">
            <StatsSection stats={stats} />
          </div>
        )}

        <div className="home-below-fold">
          <TestimonialsSection />
        </div>

        <section className="home-below-fold relative overflow-hidden bg-background py-20 sm:py-24 lg:py-32">
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
    </>
  )
}

function HomepageStreamFallback() {
  return (
    <main role="status" aria-label="Loading homepage content" aria-busy="true">
      <section className="relative min-h-[620px] overflow-hidden bg-background px-4 py-20 sm:py-24">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(49,72,120,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(49,72,120,0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="container relative mx-auto grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <Skeleton className="h-8 w-56 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-14 w-full max-w-xl rounded-xl sm:h-20" />
              <Skeleton className="h-14 w-4/5 max-w-lg rounded-xl sm:h-20" />
            </div>
            <div className="space-y-3 pt-4">
              <Skeleton className="h-5 w-full max-w-xl" />
              <Skeleton className="h-5 w-3/4 max-w-md" />
            </div>
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-12 w-44 rounded-xl" />
              <Skeleton className="h-12 w-40 rounded-xl" />
            </div>
          </div>
          <Skeleton className="hidden aspect-[1.18/1] w-full rounded-3xl lg:block" />
        </div>
      </section>
      <section className="border-y bg-muted/20 py-14">
        <div className="container mx-auto flex gap-4 overflow-hidden px-4">
          {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-64 min-w-[270px] flex-1 rounded-2xl" />)}
        </div>
      </section>
    </main>
  )
}

export default function HomePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <Header />
      <Suspense fallback={<HomepageStreamFallback />}>
        <HomepageDataContent searchParams={searchParams} />
      </Suspense>
      <Footer />
      <Chatbot />
    </div>
  )
}
