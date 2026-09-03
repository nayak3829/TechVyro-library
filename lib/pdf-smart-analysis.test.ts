import { describe, expect, it } from "vitest";
import {
  cleanPdfFilename,
  copyrightMarkers,
  detectPdfLanguage,
  detectPiiWarnings,
  detectSuspiciousMarkers,
  analyzePdfFile,
  extractKeywords,
  slugifyPdfTitle,
  textFingerprint,
} from "./pdf-smart-analysis";

describe("PDF smart analysis pure helpers", () => {
  it("cleans filenames and makes stable SEO slugs", () => {
    expect(cleanPdfFilename("  2024_exam-results_final.pdf ")).toBe("2024 exam results final");
    expect(slugifyPdfTitle("Résumé: A Practical Guide")).toBe("resume-a-practical-guide");
  });

  it("uses deterministic language and keyword heuristics", () => {
    expect(detectPdfLanguage("The course and the lesson are for students")).toBe("en");
    expect(extractKeywords("Budget budget forecast revenue revenue planning")).toEqual(["budget", "revenue", "forecast", "planning"]);
  });

  it("reports marker names without exposing PII snippets", () => {
    const bytes = new TextEncoder().encode("/JavaScript /OpenAction /Launch /EmbeddedFile /URI (https://example.com) /Encrypt");
    expect(detectSuspiciousMarkers(bytes)).toEqual(["JavaScript", "OpenAction", "Launch", "EmbeddedFile", "external URI", "encryption"]);
    expect(detectPiiWarnings("Contact sam@example.com or call +1 212-555-0199")).toEqual(["email address", "phone number"]);
  });

  it("normalizes fingerprints and deduplicates copyright markers", () => {
    const fingerprint = textFingerprint("Hello,  WORLD! This is a document.");
    expect(fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(textFingerprint("hello world this is a document")).toBe(fingerprint);
    expect(copyrightMarkers("© 2024 Northwind. Copyright 2024 Northwind. © 2024 Northwind.")).toEqual(["© 2024 Northwind", "Copyright 2024 Northwind"]);
  });

  it("stops before analysis when cancellation is already requested", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(analyzePdfFile(
      new File(["%PDF-1.7"], "cancelled.pdf", { type: "application/pdf" }),
      { signal: controller.signal },
    )).rejects.toMatchObject({ name: "AbortError" });
  });
});