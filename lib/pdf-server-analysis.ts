import { PDFDocument } from "pdf-lib"
import sharp from "sharp"

const SUSPICIOUS_MARKERS = ["/JavaScript", "/JS", "/Launch", "/OpenAction", "/EmbeddedFile", "/RichMedia"]

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character] || character)
}

export function serverPdfSlug(title: string, hash: string) {
  const ascii = title.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90)
  return ascii || `pdf-${hash.slice(0, 12)}`
}

export function serverPdfTags(title: string, category?: string | null) {
  const words = title.toLowerCase().match(/[a-z0-9]{2,}|[\u0900-\u097f]{3,}/g) || []
  return [...new Set([category?.toLowerCase(), ...words].filter(Boolean) as string[])].slice(0, 12)
}

export async function analyzePdfOnServer(bytes: Uint8Array, title: string, hash: string, category?: string | null) {
  const document = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })
  const pageCount = document.getPageCount()
  const buffer = Buffer.from(bytes)
  const suspiciousMarkers = SUSPICIOUS_MARKERS.filter((marker) => buffer.includes(Buffer.from(marker)))
  const tags = serverPdfTags(title, category)
  const description = `${title} — ${pageCount} page PDF study material available on TechVyro.`
  const lines = title.match(/.{1,22}(?:\s|$)|.{1,22}/gu)?.slice(0, 5) || [title]
  const titleSvg = lines.map((line, index) =>
    `<text x="360" y="${400 + index * 70}" text-anchor="middle" fill="white" font-size="48" font-weight="700">${escapeXml(line.trim())}</text>`
  ).join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
    <rect width="720" height="960" fill="url(#g)"/><text x="360" y="170" text-anchor="middle" fill="#bfdbfe" font-size="40" font-weight="700">TECHVYRO</text>
    ${titleSvg}<text x="360" y="850" text-anchor="middle" fill="#dbeafe" font-size="30">PDF · ${pageCount} pages</text>
  </svg>`
  const thumbnail = await sharp(Buffer.from(svg)).jpeg({ quality: 82, progressive: true }).toBuffer()
  return {
    pageCount,
    malwareStatus: suspiciousMarkers.length ? "suspicious" : "clean",
    warnings: suspiciousMarkers.map((marker) => `PDF contains active-content marker ${marker}`),
    tags,
    description,
    slug: serverPdfSlug(title, hash),
    thumbnail,
  }
}