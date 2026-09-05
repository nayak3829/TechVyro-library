import type { Metadata } from "next";

export interface PublishedPdfSeoRecord {
  id?: string;
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
  const title = bounded(pdf.seo_title, pdf.title, 51);
  const description = bounded(pdf.seo_description, pdf.description || `View and download ${pdf.title}`, 160);
  const keywords = [...new Set((pdf.seo_keywords || [])
    .filter((keyword): keyword is string => typeof keyword === "string")
    .map((keyword) => keyword.replace(/\s+/g, " ").trim().slice(0, 50))
    .filter(Boolean)
    .slice(0, 20))];

  const metadataTitle = `${title} - PDF Library`;
  const safeId = typeof pdf.id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(pdf.id)
    ? pdf.id
    : null;
  const canonical = safeId ? `/pdf/${encodeURIComponent(safeId)}` : undefined;
  const image = safeId ? `/api/pdfs/${encodeURIComponent(safeId)}/thumbnail` : "/og-image.jpg";

  return {
    title: metadataTitle,
    description,
    ...(keywords.length ? { keywords } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      title: metadataTitle,
      description,
      ...(canonical ? { url: canonical } : {}),
      type: "article",
      images: [{ url: image, alt: `${title} PDF` }],
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description,
      images: [image],
    },
  };
}