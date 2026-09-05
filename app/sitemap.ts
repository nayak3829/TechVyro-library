import type { MetadataRoute } from "next"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"
import { applyPublicPdfVisibility } from "@/lib/pdf-access"
import { canonicalUrl } from "@/lib/site-url"
import { PUBLIC_SITEMAP_PATHS } from "@/lib/seo-routes"

export const revalidate = 300

function validDate(value: unknown): Date | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const frequencies: Record<(typeof PUBLIC_SITEMAP_PATHS)[number], {
    changeFrequency: "daily" | "weekly" | "monthly" | "yearly"
    priority: number
  }> = {
    "/": { changeFrequency: "daily", priority: 1 },
    "/browse": { changeFrequency: "daily", priority: 0.9 },
    "/quiz": { changeFrequency: "weekly", priority: 0.8 },
    "/test-series": { changeFrequency: "weekly", priority: 0.8 },
    "/about": { changeFrequency: "monthly", priority: 0.7 },
    "/privacy": { changeFrequency: "yearly", priority: 0.3 },
    "/terms": { changeFrequency: "yearly", priority: 0.3 },
  }
  const pages: MetadataRoute.Sitemap = PUBLIC_SITEMAP_PATHS.map(path => ({
    url: canonicalUrl(path),
    ...frequencies[path],
  }))

  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    if (supabase) {
      const [{ data: categories }, pdfResult] = await Promise.all([
        supabase.from("categories").select("slug, created_at").order("name"),
        applyPublicPdfVisibility(
          supabase.from("pdfs").select("id, created_at, updated_at"),
        ).order("created_at", { ascending: false }).limit(500),
      ])

      for (const category of categories || []) {
        if (typeof category.slug !== "string" || !category.slug) continue
        pages.push({
          url: canonicalUrl(`/category/${encodeURIComponent(category.slug)}`),
          lastModified: validDate(category.created_at),
          changeFrequency: "weekly",
          priority: 0.8,
        })
      }
      for (const pdf of pdfResult.data || []) {
        if (typeof pdf.id !== "string" || !pdf.id) continue
        pages.push({
          url: canonicalUrl(`/pdf/${encodeURIComponent(pdf.id)}`),
          lastModified: validDate(pdf.updated_at) || validDate(pdf.created_at),
          changeFrequency: "monthly",
          priority: 0.6,
        })
      }
    }
  }

  if (isAdminConfigured()) {
    const { data: setting } = await createAdminClient()
      .from("site_settings")
      .select("value, updated_at")
      .eq("key", "folders")
      .maybeSingle()
    const folders = Array.isArray(setting?.value)
      ? setting.value as Array<Record<string, unknown>>
      : []
    for (const folder of folders) {
      if (
        folder.enabled === false ||
        typeof folder.id !== "string" ||
        !folder.id ||
        typeof folder.name !== "string" ||
        !folder.name.trim()
      ) continue
      pages.push({
        url: canonicalUrl(`/subject/${encodeURIComponent(folder.id)}`),
        lastModified: validDate(setting?.updated_at),
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }
  }

  return pages
}