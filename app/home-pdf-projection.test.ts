import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { decodeHomepagePdfPayload, HOMEPAGE_PDF_LIMIT, HOMEPAGE_PDF_SELECT } from "@/lib/homepage-pdfs"

describe("homepage PDF projection", () => {
  it("keeps the grid fields while omitting server-only and unused card fields", () => {
    expect(HOMEPAGE_PDF_SELECT).toContain("content_type, content_category, content_subcategory, subject")
    expect(HOMEPAGE_PDF_SELECT).not.toContain("thumbnail_path")
    expect(HOMEPAGE_PDF_SELECT).not.toContain("review_count")
    expect(HOMEPAGE_PDF_SELECT).not.toContain("visibility")
    expect(HOMEPAGE_PDF_LIMIT).toBe(60)
  })

  it("resolves compact ranked ID lists without duplicating row payloads", () => {
    const result = decodeHomepagePdfPayload({
      pdfs: [
        { id: "pdf-1", title: "One" },
        { id: "pdf-2", title: "Two" },
      ],
      libraryIds: ["pdf-2", "pdf-1"],
      popularIds: ["pdf-1"],
      trendingIds: ["pdf-1", "missing"],
      topRatedIds: ["pdf-2"],
    })

    expect(result?.pdfs.map(pdf => pdf.id)).toEqual(["pdf-2", "pdf-1"])
    expect(result?.featured.popular).toHaveLength(1)
    expect(result?.featured.trending).toHaveLength(1)
    expect(result?.featured.topRated).toHaveLength(1)
    expect(result?.pdfs[0].thumbnail_url).toBe("/api/pdfs/pdf-2/thumbnail")
  })

  it("uses one RPC, preserves public safety filters, and defers chatbot code", () => {
    const page = readFileSync("app/page.tsx", "utf8")
    const helper = readFileSync("lib/homepage-pdfs.ts", "utf8")
    const migration = readFileSync("scripts/044_homepage_pdf_payload.sql", "utf8")

    expect(helper).toContain('.rpc("get_homepage_pdfs")')
    expect(migration).toContain("p.visibility = 'public'")
    expect(migration).toContain("p.publish_status = 'published'")
    expect(migration).toContain("p.malware_status = 'clean'")
    expect(migration).toContain("p.scheduled_at IS NULL OR p.scheduled_at <= NOW()")
    expect(migration.match(/LIMIT 4/g)).toHaveLength(3)
    expect(migration).toContain("LIMIT 60")
    expect(migration).toContain("auth.role() IS DISTINCT FROM 'service_role'")
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_homepage_pdfs() FROM anon, authenticated")
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_homepage_pdfs() TO service_role")
    expect(migration).not.toMatch(/GRANT EXECUTE[^;]+(?:anon|authenticated)/)
    expect(page).toContain("getHomepagePdfs(createAdminClient())")
    expect(page).toContain('dynamic(() => import("@/components/chatbot")')
    expect(page).not.toContain("HomeAutoRefresh")
  })
})