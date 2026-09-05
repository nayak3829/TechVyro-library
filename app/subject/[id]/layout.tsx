import "server-only"

import type { Metadata } from "next"
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin"

interface SubjectMetadataProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const clean = (value: unknown, fallback: string, max: number) =>
  (typeof value === "string" ? value : "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max) || fallback

export async function generateMetadata({ params }: SubjectMetadataProps): Promise<Metadata> {
  const { id } = await params
  if (!isAdminConfigured()) return { robots: { index: false, follow: false } }

  const { data } = await createAdminClient()
    .from("site_settings")
    .select("value")
    .eq("key", "folders")
    .maybeSingle()
  const folders = Array.isArray(data?.value) ? data.value as Array<Record<string, unknown>> : []
  const folder = folders.find(item => item.id === id && item.enabled !== false)
  if (!folder) return {
    title: "Subject Not Found | TechVyro",
    robots: { index: false, follow: false },
  }

  const name = clean(folder.name, "Study Subject", 65)
  const title = clean(`${name} Study Materials | TechVyro`, "Study Materials | TechVyro", 65)
  const description = clean(
    folder.description,
    `Browse public PDFs and study resources for ${name} on TechVyro.`,
    160,
  )
  const canonical = `/subject/${encodeURIComponent(id)}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", images: ["/og-image.jpg"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg"] },
  }
}

export default function SubjectLayout({ children }: SubjectMetadataProps) {
  return children
}