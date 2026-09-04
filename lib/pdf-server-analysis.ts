import { PDFDocument } from "pdf-lib"
import sharp from "sharp"
import { inspectPdfSafety } from "@/lib/pdf-safety"

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
  const safety = inspectPdfSafety(bytes)
  const tags = serverPdfTags(title, category)
  const description = `${title} — ${pageCount} page PDF study material available on TechVyro.`
  const safeCategory = escapeXml((category || "STUDY MATERIAL").replace(/[^\x20-\x7E]/g, "").slice(0, 30))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#172554"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
    <rect width="720" height="960" fill="url(#g)"/><text x="360" y="170" text-anchor="middle" fill="#bfdbfe" font-size="40" font-weight="700">TECHVYRO</text>
    <text x="360" y="430" text-anchor="middle" fill="white" font-size="92" font-weight="700">PDF</text>
    <text x="360" y="535" text-anchor="middle" fill="#bfdbfe" font-size="42" font-weight="700">${safeCategory}</text>
    <text x="360" y="850" text-anchor="middle" fill="#dbeafe" font-size="30">${pageCount} pages</text>
  </svg>`
  const thumbnail = await sharp(Buffer.from(svg)).webp({ quality: 84 }).toBuffer()
  return {
    pageCount,
    ...safety,
    tags,
    description,
    slug: serverPdfSlug(title, hash),
    thumbnail,
  }
}