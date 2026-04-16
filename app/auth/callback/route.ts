import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const error_description = searchParams.get("error_description")
  const next = searchParams.get("next") ?? "/"

  console.log("[v0] OAuth Callback - URL:", request.url)
  console.log("[v0] OAuth Callback - Code:", code ? "present" : "missing")
  console.log("[v0] OAuth Callback - Error:", error, error_description)

  // Determine public-facing origin (Replit proxies via x-forwarded-host)
  const forwardedHost = request.headers.get("x-forwarded-host")
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  let publicOrigin: string
  if (forwardedHost) {
    publicOrigin = `${forwardedProto}://${forwardedHost}`
  } else if (siteUrl && !siteUrl.includes("localhost")) {
    publicOrigin = siteUrl
  } else {
    publicOrigin = origin
  }

  console.log("[v0] Public Origin:", publicOrigin)

  // Handle OAuth errors
  if (error) {
    console.log("[v0] OAuth error received:", error, error_description)
    return NextResponse.redirect(
      `${publicOrigin}/?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || "Unknown error")}`
    )
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

    console.log("[v0] Exchanging code for session...")
    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.log("[v0] Code exchange error:", exchangeError)
      return NextResponse.redirect(`${publicOrigin}/?error=auth&error_description=${encodeURIComponent(exchangeError.message)}`)
    }

    console.log("[v0] Session created successfully, user:", data.user?.email)
    return NextResponse.redirect(`${publicOrigin}${next}`)
  }

  console.log("[v0] No code provided in callback")
  return NextResponse.redirect(`${publicOrigin}/?error=auth&error_description=${encodeURIComponent("No authorization code received")}`)
}
