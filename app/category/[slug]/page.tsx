import { Suspense } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { CategoryPDFList } from "@/components/category-pdf-list"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, FolderOpen } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { PDF, Category } from "@/lib/types"

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

  if (error) {
    console.error("[v0] Error fetching category:", error)
    return null
  }

  return data
}

async function getCategoryPDFs(categoryId: string): Promise<PDF[]> {
  if (!isSupabaseConfigured()) return []
  
  const supabase = await createClient()
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from("pdfs")
    .select(`
      *,
      category:categories(*)
    `)
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching PDFs:", error)
    return []
  }

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

  if (error) {
    console.error("[v0] Error fetching categories:", error)
    return []
  }

  return data || []
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  
  if (!category) {
    return { title: "Category Not Found | TechVyro" }
  }
  
  return {
    title: `${category.name} | TechVyro PDF Library`,
    description: `Browse all PDFs in the ${category.name} category on TechVyro`,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  
  if (!category) {
    notFound()
  }
  
  const [pdfs, allCategories] = await Promise.all([
    getCategoryPDFs(category.id),
    getAllCategories()
  ])

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Breadcrumb */}
        <div className="mb-4 sm:mb-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        {/* Category Header */}
        <section className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: category.color }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {category.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {pdfs.length} {pdfs.length === 1 ? "PDF" : "PDFs"} available
              </p>
            </div>
          </div>
        </section>

        {/* Other Categories Pills */}
        {allCategories.length > 1 && (
          <section className="mb-6 sm:mb-8">
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">Other Categories:</p>
            <div className="flex flex-wrap gap-2">
              {allCategories
                .filter(c => c.id !== category.id)
                .map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors hover:opacity-80"
                    style={{ 
                      backgroundColor: `${cat.color}15`,
                      color: cat.color,
                      border: `1px solid ${cat.color}30`
                    }}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </Link>
                ))}
            </div>
          </section>
        )}

        {/* PDFs */}
        <Suspense fallback={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        }>
          <CategoryPDFList pdfs={pdfs} categoryName={category.name} />
        </Suspense>
      </main>
    </div>
  )
}
