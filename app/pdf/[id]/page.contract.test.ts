import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("PDF page public SEO contract", () => {
  it("selects persisted SEO fields without loosening the public visibility query", async () => {
    const source = await readFile("app/pdf/[id]/page.tsx", "utf8");
    expect(source).toContain("seo_title, seo_description");
    expect(source).toContain("seo_keywords");
    expect(source).toContain("applyPublicPdfVisibility");
    expect(source).toContain("return publicPdfMetadata(pdf)");
  });
});