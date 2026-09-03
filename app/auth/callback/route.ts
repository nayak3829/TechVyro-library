import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { safeInternalPath } from "@/lib/auth-redirect"

const CANONICAL_SITE_URL = "https://techvyro-library.replit.app"

function getPublicOrigin(request: NextRequest): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    CANONICAL_SITE_URL,
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

  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_SITE_URL
  if (configuredSite) {
    try {
      return new URL(configuredSite).origin
    } catch {
      // Fall through to the request origin.
    }
  }
  return requestOrigin
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const error_description = searchParams.get("error_description")
  const next = safeInternalPath(searchParams.get("next"))
  const publicOrigin = getPublicOrigin(request)

  if (error) {
    const loginUrl = new URL("/login", publicOrigin)
    loginUrl.searchParams.set("error", error_description || error)
    if (next !== "/") loginUrl.searchParams.set("redirect", next)
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      const loginUrl = new URL("/login", publicOrigin)
      loginUrl.searchParams.set("error", "This authentication link is invalid or has expired.")
      if (next !== "/") loginUrl.searchParams.set("redirect", next)
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.redirect(new URL(next, publicOrigin))
  }

  const loginUrl = new URL("/login", publicOrigin)
  loginUrl.searchParams.set("error", "No authentication code was provided.")
  return NextResponse.redirect(loginUrl)
}
