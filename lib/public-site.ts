import type { NextRequest } from "next/server"

export const CANONICAL_SITE_ORIGIN = "https://techvyro-library.vercel.app"

export function getPublicOrigin(request: NextRequest): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    CANONICAL_SITE_ORIGIN,
    process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : undefined,
    ...((process.env.REPLIT_DOMAINS || "")
      .split(",")
      .filter(Boolean)
      .map((host) => `https://${host}`)),
  ]

  const allowed = new Set<string>()
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      allowed.add(new URL(candidate).origin)
    } catch {
      // Ignore invalid optional environment configuration.
    }
  }

  const requestOrigin = request.nextUrl.origin
  if (allowed.has(requestOrigin)) return requestOrigin

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https"
  if (forwardedHost) {
    const forwardedOrigin = `${forwardedProto}://${forwardedHost}`
    if (allowed.has(forwardedOrigin)) return forwardedOrigin
  }

  return CANONICAL_SITE_ORIGIN
}