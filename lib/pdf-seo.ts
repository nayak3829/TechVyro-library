import type { Metadata } from "next";

export interface PublishedPdfSeoRecord {
  title: string;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
}

const bounded = (value: string | null | undefined, fallback: string, max: number) =>
  (value || "").replace(/\s+/g, " ").trim().slice(0, max) || fallback.slice(0, max);

/** Builds public metadata only from a record already constrained to public/published/due. */
export function publicPdfMetadata(pdf: PublishedPdfSeoRecord): Metadata {
  const title = bounded(pdf.seo_title, pdf.title, 65);
  const description = bounded(pdf.seo_description, pdf.description || `View and download ${pdf.title}`, 160);
  const keywords = [...new Set((pdf.seo_keywords || [])
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 20))];

  return { title: `${title} - PDF Library`, description, ...(keywords.length ? { keywords } : {}) };
}