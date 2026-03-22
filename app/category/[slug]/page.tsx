import { Suspense } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { CategoryPDFList } from "@/components/category-pdf-list"
import { PageAutoRefresh } from "@/components/page-auto-refresh"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, FolderOpen, BookOpen, TrendingUp, Search } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { PDF, Category } from "@/lib/types"

export const revalidate = 30

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single()
  if (error) return null
  return data
}

async function getCategoryPDFs(categoryId: string): Promise<PDF[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from("pdfs")
    .select(`*, category:categories(*)`)
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })
  if (error) return []
  return data || []
}

async function getAllCategories(): Promise<Category[]> {
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

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: "Category Not Found | TechVyro" }
  return {
    title: `${category.name} | TechVyro PDF Library`,
    description: `Browse all PDFs in the ${category.name} category on TechVyro`,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const [pdfs, allCategories] = await Promise.all([
    getCategoryPDFs(category.id),
    getAllCategories()
  ])

  const totalDownloads = pdfs.reduce((sum, p) => sum + (p.download_count || 0), 0)
  const totalViews = pdfs.reduce((sum, p) => sum + (p.view_count || 0), 0)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Immersive hero banner */}
      <section
        className="relative overflow-hidden border-b border-border/50"
        style={{ background: `linear-gradient(135deg, ${category.color}12 0%, ${category.color}06 50%, transparent 100%)` }}
      >
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
          backgroundSize: "28px 28px"
        }} />
        {/* Glow orbs */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30" style={{ backgroundColor: category.color }} />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full blur-3xl opacity-20" style={{ backgroundColor: category.color }} />

        <div className="relative container mx-auto px-4 py-8 sm:py-12">
          {/* Breadcrumb */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/80 group-hover:bg-primary/10 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Back to Home</span>
          </Link>

          {/* Hero content */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
            {/* Icon */}
            <div className="relative shrink-0">
              <div className="absolute -inset-3 rounded-3xl blur-xl opacity-40" style={{ backgroundColor: category.color }} />
              <div
                className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{ backgroundColor: category.color }}
              >
                <FolderOpen className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
            </div>

            {/* Text + stats */}
            <div className="flex-1">
              <div
                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-2"
                style={{ backgroundColor: `${category.color}20`, color: category.color }}
              >
                <BookOpen className="h-3 w-3" />
                Category
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mb-1">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-sm text-muted-foreground mb-3 max-w-xl">{category.description}</p>
              )}

              {/* Mini stats strip */}
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold" style={{ color: category.color }}>{pdfs.length}</span>
                  <span className="text-xs text-muted-foreground">PDFs</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-sm font-semibold text-foreground">{totalDownloads.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">downloads</span>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-sm font-semibold text-foreground">{totalViews.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">views</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10">

        {/* Other categories — horizontal scroll */}
        {allCategories.length > 1 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-1 w-4 rounded-full" style={{ backgroundColor: category.color }} />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Other Categories</p>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {allCategories
                .filter(c => c.id !== category.id)
                .map(cat => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="shrink-0 group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border"
                    style={{
                      backgroundColor: `${cat.color}10`,
                      color: cat.color,
                      borderColor: `${cat.color}25`
                    }}
                  >
                    <div className="h-2 w-2 rounded-full group-hover:scale-125 transition-transform" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* PDF grid */}
        <Suspense fallback={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        }>
          <CategoryPDFList pdfs={pdfs} categoryName={category.name} />
        </Suspense>
      </main>
      <PageAutoRefresh interval={60000} label="Live" showToast={false} />
    </div>
  )
}
