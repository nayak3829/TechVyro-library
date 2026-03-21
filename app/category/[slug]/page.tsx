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
      
      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-10">
        {/* Breadcrumb */}
        <div className="mb-5 sm:mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Category Header - Enhanced */}
        <section className="mb-8 sm:mb-10">
          <div className="relative p-6 sm:p-8 rounded-2xl overflow-hidden" style={{ backgroundColor: `${category.color}08` }}>
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse at 100% 0%, ${category.color}20, transparent 50%)` }} />
            
            <div className="relative flex items-center gap-4 sm:gap-5">
              <div className="relative">
                <div className="absolute -inset-2 rounded-2xl blur-lg opacity-40" style={{ backgroundColor: category.color }} />
                <div 
                  className="relative h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: category.color }}
                >
                  <FolderOpen className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-1">
                  {category.name}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  <span className="font-semibold" style={{ color: category.color }}>{pdfs.length}</span> {pdfs.length === 1 ? "PDF" : "PDFs"} available in this category
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Other Categories Pills - Enhanced */}
        {allCategories.length > 1 && (
          <section className="mb-8 sm:mb-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1 w-1 rounded-full bg-primary" />
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Browse Other Categories</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {allCategories
                .filter(c => c.id !== category.id)
                .map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="group inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    style={{ 
                      backgroundColor: `${cat.color}10`,
                      color: cat.color,
                      border: `1px solid ${cat.color}25`
                    }}
                  >
                    <div className="h-2.5 w-2.5 rounded-full group-hover:scale-110 transition-transform" style={{ backgroundColor: cat.color }} />
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
