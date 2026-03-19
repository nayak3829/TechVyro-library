import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { PDFGrid } from "@/components/pdf-grid"
import type { PDF, Category } from "@/lib/types"

export const revalidate = 60

async function getPDFs(): Promise<PDF[]> {
  // Don't attempt to fetch if not configured
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
  // Don't attempt to fetch if not configured
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

export default async function HomePage() {
  const configured = isSupabaseConfigured()
  const [pdfs, categories] = configured 
    ? await Promise.all([getPDFs(), getCategories()])
    : [[], []]

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <section className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent text-balance">
            PDF Library
          </h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Browse, download, and share PDF documents from our curated collection
          </p>
        </section>

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

        <PDFGrid pdfs={pdfs} categories={categories} />
      </main>
      
      <footer className="border-t border-border/40 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          PDF Library - Your digital document collection
        </div>
      </footer>
    </div>
  )
}
