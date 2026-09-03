import { describe, expect, it } from "vitest";
import { BROWSER_OCR_ASSETS, DEFAULT_PDF_ANALYSIS_LIMITS, getTesseractLanguageDataUrl } from "./pdf-smart-analysis";
import { publicPdfMetadata } from "./pdf-seo";

describe("PDF browser-worker configuration", () => {
  it("pins browser-only worker assets and bounds OCR to three pages", () => {
    expect(DEFAULT_PDF_ANALYSIS_LIMITS.maxOcrPages).toBe(3);
    expect(BROWSER_OCR_ASSETS.pdfWorkerUrl).toBe("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs");
    expect(BROWSER_OCR_ASSETS.tesseractWorkerUrl).toContain("tesseract.js@7.0.0");
    expect(getTesseractLanguageDataUrl("../eng")).toContain("/eng/");
  });
});

describe("public PDF SEO metadata", () => {
  it("prefers persisted SEO fields and safely falls back to public content", () => {
    expect(publicPdfMetadata({
      title: "Original PDF",
      description: "Public description",
      seo_title: "Search title",
      seo_description: "Search description",
      seo_keywords: ["exam", " revision ", "exam", ""],
    })).toMatchObject({
      title: "Search title - PDF Library",
      description: "Search description",
      keywords: ["exam", "revision"],
    });
    expect(publicPdfMetadata({ title: "Original PDF", description: null })).toMatchObject({
      title: "Original PDF - PDF Library",
      description: "View and download Original PDF",
    });
  });
});