/**
 * Browser-safe PDF inspection. This module intentionally does not import PDF.js or
 * Tesseract at module scope: Next can therefore render pages without loading their
 * browser-only workers during SSR.
 */
import { PDFDocument } from "pdf-lib";

export type AnalysisStage =
  | "reading"
  | "hashing"
  | "validating"
  | "metadata"
  | "text"
  | "ocr"
  | "thumbnail"
  | "classifying"
  | "complete";
export type ProgressCallback = (progress: {
  stage: AnalysisStage;
  percent: number;
  message: string;
}) => void;

export interface PdfAnalysisOptions {
  maxBytes?: number;
  maxPages?: number;
  maxTextCharacters?: number;
  maxOcrPages?: number;
  ocrTimeoutMs?: number;
  ocrLanguage?: string;
  onProgress?: ProgressCallback;
  /** A previously computed fingerprint can be supplied by a catalogue to flag duplicates. */
  duplicateFingerprints?: readonly string[];
  createThumbnail?: boolean;
  signal?: AbortSignal;
}

export interface OcrPageResult {
  page: number;
  text: string;
  confidence?: number;
  status: "complete" | "skipped" | "failed" | "timeout";
  reason?: string;
}
export interface PdfAnalysisResult {
  filename: string;
  title: string;
  sizeBytes: number;
  sha256: string;
  valid: boolean;
  pageCount: number;
  encrypted: boolean;
  corrupted: boolean;
  errors: string[];
  metadata: Record<string, string>;
  text: string;
  textCharacters: number;
  language: "en" | "hi" | "es" | "fr" | "de" | "pt" | "unknown";
  ocrNeeded: boolean;
  ocr: OcrPageResult[];
  thumbnail?: Blob | string;
  summary: string;
  tags: string[];
  category: string;
  keywords: string[];
  seoSlug: string;
  seoTitle: string;
  seoDescription: string;
  suspiciousMarkers: string[];
  piiWarnings: string[];
  copyrightMarkers: string[];
  textFingerprint: string;
  nearDuplicate: boolean;
}

export const DEFAULT_PDF_ANALYSIS_LIMITS = {
  maxBytes: 100 * 1024 * 1024,
  maxPages: 250,
  maxTextCharacters: 500_000,
  maxOcrPages: 3,
  ocrTimeoutMs: 20_000,
} as const;

/**
 * These browser assets intentionally use exact versions. The app CSP currently
 * only restricts frame ancestors, so script/worker requests to this CDN are
 * permitted. Keep all worker URLs here so a future CSP change has one review
 * point (it must allow `https://cdn.jsdelivr.net` in worker-src and connect-src).
 */
export const BROWSER_OCR_ASSETS = {
  pdfJsVersion: "4.10.38",
  tesseractVersion: "7.0.0",
  tesseractCoreVersion: "7.0.0",
  languageDataVersion: "4.0.0_best_int",
  pdfWorkerUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs",
  tesseractWorkerUrl: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
  tesseractCoreUrl: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
  languageDataBaseUrl: "https://cdn.jsdelivr.net/npm/@tesseract.js-data",
} as const;

export function getTesseractLanguageDataUrl(language: string): string {
  const safeLanguage = /^[a-z_]+$/i.test(language) ? language.toLowerCase() : "eng";
  return `${BROWSER_OCR_ASSETS.languageDataBaseUrl}/${safeLanguage}/${BROWSER_OCR_ASSETS.languageDataVersion}`;
}

const cleanWhitespace = (s: string) => s.replace(/\s+/g, " ").trim();
export function cleanPdfFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  return cleanWhitespace(base).replace(/[^\p{L}\p{N} .(),'&]/gu, "").trim() || "Untitled document";
}
export function slugifyPdfTitle(title: string): string {
  return cleanWhitespace(title).toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "document";
}
export function detectPdfLanguage(text: string): PdfAnalysisResult["language"] {
  const devanagariCharacters = (text.match(/[\u0900-\u097F]/g) || []).length;
  if (devanagariCharacters >= Math.max(4, text.replace(/\s/g, "").length * 0.15)) return "hi";
  const t = ` ${text.toLowerCase()} `;
  const scores: Record<Exclude<PdfAnalysisResult["language"], "unknown">, number> = {
    en: (t.match(/\b(the|and|with|this|from|that|are|for)\b/g) || []).length,
    es: (t.match(/\b(el|la|los|las|que|para|con|una|del)\b/g) || []).length,
    fr: (t.match(/\b(le|la|les|des|une|avec|pour|dans|est)\b/g) || []).length,
    de: (t.match(/\b(der|die|das|und|mit|für|von|ein)\b/g) || []).length,
    pt: (t.match(/\b(o|a|os|as|que|uma|com|para|não|dos)\b/g) || []).length,
    hi: 0,
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] as PdfAnalysisResult["language"] : "unknown";
}
export function detectSuspiciousMarkers(bytes: Uint8Array): string[] {
  const source = new TextDecoder("latin1").decode(bytes);
  const checks: Array<[string, RegExp]> = [
    ["JavaScript", /\/JavaScript\b|\/JS\b/i], ["OpenAction", /\/OpenAction\b/i],
    ["Launch", /\/Launch\b/i], ["EmbeddedFile", /\/EmbeddedFile\b/i],
    ["external URI", /\/URI\s*\(|https?:\/\/|mailto:/i], ["encryption", /\/Encrypt\b/i],
  ];
  return checks.filter(([, re]) => re.test(source)).map(([name]) => name);
}
export function detectPiiWarnings(text: string): string[] {
  const tests: Array<[string, RegExp]> = [
    ["email address", /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
    ["phone number", /(?:\+?\d[\d ()-]{7,}\d)/], ["credit card number", /\b(?:\d[ -]*?){13,19}\b/],
    ["government ID", /\b(?:SSN|social security|passport|tax identification)\b/i],
    ["street address", /\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(?:street|st|road|rd|avenue|ave|lane|ln)\b/i],
  ];
  return tests.filter(([, re]) => re.test(text)).map(([name]) => name);
}
export function copyrightMarkers(text: string): string[] {
  const found = text.match(/(?:©|copyright|all rights reserved|licensed under|creative commons)[^\n.]{0,120}/gi) || [];
  return [...new Set(found.map(cleanWhitespace))].slice(0, 20);
}
export function textFingerprint(text: string): string {
  const words = cleanWhitespace(text).toLowerCase().match(/[\p{L}\p{N}]+/gu)?.slice(0, 10_000) || [];
  if (!words.length) return "0000000000000000";
  const features = words.length < 3
    ? [words.join(" ")]
    : words.slice(0, -2).map((word, index) => `${word} ${words[index + 1]} ${words[index + 2]}`);
  const weights = new Int32Array(64);
  const featureHash = (feature: string, seed: number) => {
    let hash = seed >>> 0;
    for (const character of feature) {
      hash ^= character.codePointAt(0) || 0;
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash;
  };
  for (const feature of features) {
    const lower = featureHash(feature, 2166136261);
    const upper = featureHash(feature, 2246822507);
    for (let bit = 0; bit < 32; bit += 1) {
      weights[bit] += ((lower >>> bit) & 1) === 1 ? 1 : -1;
      weights[bit + 32] += ((upper >>> bit) & 1) === 1 ? 1 : -1;
    }
  }
  let lower = 0;
  let upper = 0;
  for (let bit = 0; bit < 64; bit += 1) {
    if (weights[bit] >= 0) {
      if (bit < 32) lower = (lower | (1 << bit)) >>> 0;
      else upper = (upper | (1 << (bit - 32))) >>> 0;
    }
  }
  return upper.toString(16).padStart(8, "0") + lower.toString(16).padStart(8, "0");
}
export function extractKeywords(text: string, limit = 8): string[] {
  const stop = new Set("the and for with that this from are was were have has not you your about into their they will can a an of to in on is as by or it be".split(" "));
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().match(/[a-zÀ-ÿ]{4,}/g) || []) if (!stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([word]) => word);
}

const stage = (cb: ProgressCallback | undefined, s: AnalysisStage, percent: number, message: string) => cb?.({ stage: s, percent, message });
const asBytes = async (file: File | Blob): Promise<Uint8Array> => new Uint8Array(await file.arrayBuffer());
const digest = async (bytes: Uint8Array) => {
  const hash = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
};
const timeout = <T>(promise: Promise<T>, ms: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
};
const abortError = () => new DOMException("Processing was cancelled", "AbortError");
const isAbortError = (error: unknown) => error instanceof DOMException && error.name === "AbortError";
const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw abortError();
};
const abortable = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) return promise;
  throwIfAborted(signal);
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(abortError());
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
};

async function renderPage(page: any, scale = 1): Promise<HTMLCanvasElement | OffscreenCanvas | null> {
  if (typeof document === "undefined" && typeof OffscreenCanvas === "undefined") return null;
  const viewport = page.getViewport({ scale });
  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(viewport.width, viewport.height);
  canvas.width = viewport.width; canvas.height = viewport.height;
  await page.render({ canvasContext: (canvas as HTMLCanvasElement).getContext("2d"), canvas, viewport }).promise;
  return canvas;
}
async function canvasBlob(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob | string> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type: "image/jpeg", quality: .78 });
  return new Promise((resolve) => (canvas as HTMLCanvasElement).toBlob((b) => resolve(b || ""), "image/jpeg", .78));
}

export async function analyzePdfFile(file: File | Blob, options?: PdfAnalysisOptions, callback?: ProgressCallback): Promise<PdfAnalysisResult>;
export async function analyzePdfFile(file: File | Blob, callback?: ProgressCallback): Promise<PdfAnalysisResult>;
export async function analyzePdfFile(file: File | Blob, optionsOrCallback: PdfAnalysisOptions | ProgressCallback = {}, callback?: ProgressCallback): Promise<PdfAnalysisResult> {
  const options: PdfAnalysisOptions = typeof optionsOrCallback === "function"
    ? { onProgress: optionsOrCallback }
    : { ...optionsOrCallback, ...(callback ? { onProgress: callback } : {}) };
  const limits = { ...DEFAULT_PDF_ANALYSIS_LIMITS, ...options };
  const filename = "name" in file ? file.name : "document.pdf";
  throwIfAborted(options.signal);
  stage(options.onProgress, "reading", 2, "Reading PDF");
  if (file.size > limits.maxBytes) throw new Error(`PDF exceeds ${Math.round(limits.maxBytes / 1048576)} MB limit`);
  const bytes = await asBytes(file);
  throwIfAborted(options.signal);
  stage(options.onProgress, "hashing", 10, "Computing SHA-256");
  const sha256 = await digest(bytes);
  throwIfAborted(options.signal);
  const suspiciousMarkers = detectSuspiciousMarkers(bytes);
  const errors: string[] = [];
  let pdf: any;
  let pdfLib: PDFDocument | undefined;
  let encrypted = suspiciousMarkers.includes("encryption");
  try { pdfLib = await abortable(PDFDocument.load(bytes, { throwOnInvalidObject: false, ignoreEncryption: true }), options.signal); }
  catch (error) {
    if (isAbortError(error)) throw error;
    /* PDF.js below provides the more useful password/encryption signal. */
  }
  stage(options.onProgress, "validating", 20, "Validating structure");
  try {
    // Use PDF.js's browser build, never the legacy/Node entry point. Its worker
    // is loaded from the pinned browser-safe asset above.
    const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = BROWSER_OCR_ASSETS.pdfWorkerUrl;
    pdf = await abortable(pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true }).promise, options.signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    const message = error instanceof Error ? error.message : "Unable to parse PDF";
    if (/password|encrypted/i.test(message)) encrypted = true;
    errors.push(message);
  }
  const pageCount = pdf?.numPages ?? pdfLib?.getPageCount() ?? 0;
  if (pageCount > limits.maxPages) errors.push(`Page count exceeds ${limits.maxPages} page limit`);
  const boundedPages = Math.min(pageCount, limits.maxPages);
  const metadata: Record<string, string> = {};
  if (pdfLib) {
    const m: Array<[string, unknown]> = [["title", pdfLib.getTitle()], ["author", pdfLib.getAuthor()], ["subject", pdfLib.getSubject()], ["keywords", pdfLib.getKeywords()], ["creator", pdfLib.getCreator()], ["producer", pdfLib.getProducer()], ["creationDate", pdfLib.getCreationDate()?.toISOString()]];
    for (const [k, v] of m) if (v) metadata[k] = String(v);
  }
  if (pdf) try { Object.assign(metadata, (await pdf.getMetadata()).info); } catch { /* metadata is optional */ }
  stage(options.onProgress, "text", 25, "Extracting text");
  let text = "";
  const poorPages: number[] = [];
  for (let i = 1; i <= boundedPages && text.length < limits.maxTextCharacters; i++) {
    throwIfAborted(options.signal);
    try {
      const content = await pdf.getPage(i).then((p: any) => p.getTextContent());
      const pageText = cleanWhitespace(content.items.map((x: any) => x.str || "").join(" "));
      if (pageText.length < 40) poorPages.push(i);
      text += `${pageText}\n`;
    } catch { errors.push(`Could not extract page ${i}`); }
    stage(options.onProgress, "text", 25 + Math.round((i / Math.max(1, boundedPages)) * 35), `Extracted page ${i} of ${boundedPages}`);
  }
  text = text.slice(0, limits.maxTextCharacters).trim();
  const ocr: OcrPageResult[] = [];
  const ocrNeeded = boundedPages > 0 && poorPages.length / boundedPages > .35;
  if (ocrNeeded && pdf) {
    stage(options.onProgress, "ocr", 62, "Checking image-only pages");
    let worker: { recognize: (image: HTMLCanvasElement | OffscreenCanvas) => Promise<unknown>; terminate: () => Promise<unknown> } | undefined;
    const ocrLanguage = options.ocrLanguage || "eng";
    try {
      // Tesseract's package browser mapping selects its browser worker adapter;
      // explicit URLs below prevent that adapter from falling back to Node paths.
      const { createWorker } = await import("tesseract.js");
      const workerPromise = createWorker(ocrLanguage, undefined, {
        workerPath: BROWSER_OCR_ASSETS.tesseractWorkerUrl,
        corePath: BROWSER_OCR_ASSETS.tesseractCoreUrl,
        langPath: getTesseractLanguageDataUrl(ocrLanguage),
        workerBlobURL: false,
      });
      // A worker may finish booting after the caller's bounded wait expires.
      // Terminate that late worker too, since it never reaches the finally block.
      let creationAbandoned = false;
      void workerPromise.then((lateWorker) => {
        if (creationAbandoned) void lateWorker.terminate();
      }).catch(() => undefined);
      worker = await abortable(timeout(workerPromise, limits.ocrTimeoutMs), options.signal).catch((error) => {
        creationAbandoned = isAbortError(error) || (error instanceof Error && error.message === "timeout");
        throw error;
      });
      for (const pageNumber of poorPages.slice(0, limits.maxOcrPages)) {
        throwIfAborted(options.signal);
        try {
          const canvas = await renderPage(await pdf.getPage(pageNumber), 1.25);
          if (!canvas) { ocr.push({ page: pageNumber, text: "", status: "skipped", reason: "Canvas unavailable" }); continue; }
          const result: any = await abortable(timeout<any>(worker.recognize(canvas), limits.ocrTimeoutMs), options.signal);
          const recognized = cleanWhitespace(result.data?.text || "");
          ocr.push({ page: pageNumber, text: recognized.slice(0, 50_000), confidence: result.data?.confidence, status: "complete" });
          text = `${text}\n${recognized}`.slice(0, limits.maxTextCharacters);
        } catch (error) {
          if (isAbortError(error)) throw error;
          ocr.push({ page: pageNumber, text: "", status: error instanceof Error && error.message === "timeout" ? "timeout" : "failed", reason: error instanceof Error ? error.message : "OCR failed" });
        }
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      ocr.push({ page: poorPages[0] || 1, text: "", status: error instanceof Error && error.message === "timeout" ? "timeout" : "failed", reason: error instanceof Error ? error.message : "OCR unavailable" });
    } finally {
      // Termination also runs after a recognition timeout or a thrown render,
      // avoiding stranded browser workers in long-lived admin sessions.
      if (worker) {
        try { await worker.terminate(); } catch { /* a failed worker is already unusable */ }
      }
    }
  }
  let thumbnail: Blob | string | undefined;
  if (options.createThumbnail !== false && pdf) try {
    throwIfAborted(options.signal);
    stage(options.onProgress, "thumbnail", 78, "Creating thumbnail")
    const canvas = await renderPage(await pdf.getPage(1), .45)
    if (canvas) thumbnail = await canvasBlob(canvas)
    if (!thumbnail) errors.push("Automatic thumbnail could not be generated")
  } catch (error) {
    if (isAbortError(error)) throw error;
    errors.push("Automatic thumbnail could not be generated")
  }
  stage(options.onProgress, "classifying", 88, "Building document profile");
  const title = cleanWhitespace(metadata.title || cleanPdfFilename(filename));
  const keywords = extractKeywords(text);
  const category = keywords.some((x) => /exam|lesson|course|study|quiz/.test(x)) ? "education" : keywords.some((x) => /invoice|payment|revenue|budget/.test(x)) ? "finance" : keywords.some((x) => /policy|agreement|contract|legal/.test(x)) ? "legal" : "document";
  const summary = cleanWhitespace(text).slice(0, 280) || `${title} contains no machine-readable text.`;
  const fingerprint = textFingerprint(text);
  const incompleteOcr = ocr.some((page) => page.status !== "complete");
  if (ocrNeeded && incompleteOcr) errors.push("OCR did not complete for all selected pages");
  const thumbnailReady = options.createThumbnail === false || thumbnail instanceof Blob
  const result: PdfAnalysisResult = { filename, title, sizeBytes: bytes.byteLength, sha256, valid: Boolean(pdf || pdfLib) && thumbnailReady, pageCount, encrypted, corrupted: errors.length > 0, errors, metadata, text, textCharacters: text.length, language: detectPdfLanguage(text), ocrNeeded, ocr, thumbnail, summary, tags: [...new Set([category, ...keywords.slice(0, 5)])], category, keywords, seoSlug: slugifyPdfTitle(title), seoTitle: title.slice(0, 65), seoDescription: summary.slice(0, 160), suspiciousMarkers, piiWarnings: detectPiiWarnings(text), copyrightMarkers: copyrightMarkers(text), textFingerprint: fingerprint, nearDuplicate: Boolean(options.duplicateFingerprints?.includes(fingerprint)) };
  stage(options.onProgress, "complete", 100, incompleteOcr ? "Analysis completed with OCR warnings" : "Analysis complete");
  return result;
}