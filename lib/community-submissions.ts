import "server-only"

import { createHmac } from "node:crypto"
import { isIP } from "node:net"
import { normalizePdfContentMetadata } from "@/lib/pdf-content-metadata"

export const COMMUNITY_MAX_PDF_BYTES = 50 * 1024 * 1024
export const COMMUNITY_PDF_MIME = "application/pdf"
export const COMMUNITY_PATH = /^community\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.pdf$/i
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isSubmissionSecurityConfigured() {
  return Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16)
}

function text(value: unknown, label: string, maximum: number, optional = false) {
  if ((value === undefined || value === null || value === "") && optional) return null
  if (typeof value !== "string") throw new Error(`${label} is required`)
  const normalized = value.trim().replace(/\s+/g, " ")
  if (!normalized || normalized.length > maximum || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw new Error(`${label} must be between 1 and ${maximum} characters`)
  }
  return normalized
}

export function normalizeCommunityEmail(value: unknown) {
  const email = text(value, "Email", 254)!.toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email is invalid")
  return email
}
export const normalizeCommunityName = (value: unknown) => text(value, "Name", 120)!
export const normalizeCommunityTitle = (value: unknown) => text(value, "Title", 200)!
export const normalizeCommunityDescription = (value: unknown) => text(value, "Description", 300, true)
export const normalizeCommunityNote = (value: unknown) => text(value, "Submitter note", 1000, true)

export function privacyHash(kind: "email" | "ip", value: string) {
  const secret = process.env.SESSION_SECRET
  if (!isSubmissionSecurityConfigured() || !secret) throw new Error("Submission security is not configured")
  return createHmac("sha256", secret).update(`community:${kind}:${value}`).digest("hex")
}

function validIp(value: string | null) {
  if (!value) return null
  const candidate = value.trim().replace(/^\[|\]$/g, "")
  return isIP(candidate) ? candidate : null
}

export function getCommunityRequestIp(request: Request) {
  // Replit's edge supplies this single-value header. Avoid the leftmost XFF
  // value, which clients can spoof; the final hop is the conservative fallback.
  const replit = validIp(request.headers.get("x-replit-user-ip"))
  if (replit) return replit
  const real = validIp(request.headers.get("x-real-ip"))
  if (real) return real
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map(v => validIp(v)).filter(Boolean)
  return forwarded?.at(-1) || "unknown"
}

export function hasPdfSignature(bytes: Uint8Array) {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
}

export function validateUploadRequest(body: Record<string, unknown>) {
  const email = normalizeCommunityEmail(body.email)
  const filename = text(body.filename, "Filename", 255)!
  const mime = typeof body.mime === "string" ? body.mime.trim().toLowerCase() : ""
  const fileSize = body.fileSize
  if (!filename.toLowerCase().endsWith(".pdf") || filename.includes("/") || filename.includes("\\") || mime !== COMMUNITY_PDF_MIME) {
    throw new Error("Only PDF files may be uploaded")
  }
  if (!Number.isSafeInteger(fileSize) || Number(fileSize) < 1 || Number(fileSize) > COMMUNITY_MAX_PDF_BYTES) {
    throw new Error("PDF size must be between 1 byte and 50 MB")
  }
  return { email, fileSize: Number(fileSize) }
}

export function normalizeSubmission(body: Record<string, unknown>) {
  if (body.copyrightConfirmed !== true) throw new Error("Copyright confirmation is required")
  return {
    title: normalizeCommunityTitle(body.title),
    description: normalizeCommunityDescription(body.description),
    submitterName: normalizeCommunityName(body.submitterName),
    submitterEmail: normalizeCommunityEmail(body.submitterEmail ?? body.email),
    submitterNote: normalizeCommunityNote(body.submitterNote),
    copyrightConfirmed: true,
    ...normalizePdfContentMetadata(body, { allowSubjectEmpty: true }),
  }
}