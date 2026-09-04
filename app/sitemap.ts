import { MetadataRoute } from 'next'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { applyPublicPdfVisibility } from '@/lib/pdf-access'

export const revalidate = 300

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.techvyro.in'
  
  // Base pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/quiz`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/test-series`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Get dynamic pages if Supabase is configured
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    
    if (supabase) {
      // Fetch categories
      const { data: categories } = await supabase
        .from('categories')
        .select('slug, created_at')
        .order('name')

      if (categories) {
        const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
          url: `${baseUrl}/category/${category.slug}`,
          lastModified: new Date(category.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }))
        staticPages.push(...categoryPages)
      }

      // Fetch PDFs
      const { data: pdfs } = await applyPublicPdfVisibility(supabase
        .from('pdfs')
        .select('id, updated_at')
        )
        .order('created_at', { ascending: false })
        .limit(500)

      if (pdfs) {
        const pdfPages: MetadataRoute.Sitemap = pdfs.map((pdf: { id: string; updated_at: string }) => ({
          url: `${baseUrl}/pdf/${pdf.id}`,
          lastModified: new Date(pdf.updated_at),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }))
        staticPages.push(...pdfPages)
      }

      // Fetch public quizzes with usable question content
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, created_at, questions')
        .eq('enabled', true)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(500)

      if (quizzes) {
        const quizPages: MetadataRoute.Sitemap = quizzes
          .filter((quiz) => Array.isArray(quiz.questions) && quiz.questions.some(
            (question: unknown) =>
              !!question &&
              typeof question === 'object' &&
              !Array.isArray(question) &&
              typeof (question as { question?: unknown }).question === 'string' &&
              (question as { question: string }).question.trim().length > 0
          ))
          .map((quiz) => ({
            url: `${baseUrl}/quiz/${quiz.id}`,
            lastModified: new Date(quiz.created_at),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
          }))
        staticPages.push(...quizPages)
      }
    }
  }

  return staticPages
}
