import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { safeInternalPath } from "@/lib/auth-redirect"
import { getPublicOrigin } from "@/lib/public-site"

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
