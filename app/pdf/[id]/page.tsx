import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { PDFViewer } from "@/components/pdf-viewer"
import type { PDF } from "@/lib/types"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPDF(id: string): Promise<PDF | null> {
  const supabase = await createClient()
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from("pdfs")
    .select(`
      *,
      category:categories(*)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("[v0] Error fetching PDF:", error)
    return null
  }

  return data
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const pdf = await getPDF(id)
  
  if (!pdf) {
    return { title: "PDF Not Found" }
  }

  return {
    title: `${pdf.title} - PDF Library`,
    description: pdf.description || `View and download ${pdf.title}`,
  }
}

export default async function PDFDetailPage({ params }: PageProps) {
  const { id } = await params
  const pdf = await getPDF(id)

  if (!pdf) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <PDFViewer pdf={pdf} />
      </main>
    </div>
  )
}
