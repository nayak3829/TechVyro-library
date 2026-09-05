import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { loginHref } from "@/lib/auth-redirect"
import { isPrivateIndexRoute } from "@/lib/seo-routes"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname
  const isQuizPlayRoute = /^\/quiz\/[^/]+(?:\/play)?\/?$/.test(pathname) &&
    pathname !== "/quiz/leaderboard" &&
    pathname !== "/quiz/leaderboard/"
  const isPrivateRoute = isPrivateIndexRoute(pathname)

  const applyRobotsHeader = <T extends NextResponse>(response: T): T => {
    if (isPrivateRoute) response.headers.set("X-Robots-Tag", "noindex, nofollow")
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return applyRobotsHeader(supabaseResponse)
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  let user: { id: string } | null = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch (error) {
    const authError = error as { code?: unknown; message?: unknown }
    const isInvalidRefreshToken =
      authError.code === "refresh_token_not_found" ||
      (typeof authError.message === "string" && /invalid refresh token|refresh token not found/i.test(authError.message))

    if (isInvalidRefreshToken) {
      request.cookies.getAll()
        .filter(({ name }) => name.startsWith("sb-") && name.includes("auth-token"))
        .forEach(({ name }) => {
          request.cookies.delete(name)
          supabaseResponse.cookies.set(name, "", { path: "/", maxAge: 0 })
        })
    } else {
      console.error("[middleware] Failed to validate auth session", error)
    }
  }

  const isProtectedRoute =
    pathname.startsWith("/profile") ||
    isQuizPlayRoute ||
    pathname === "/test-series/play"

  if (isProtectedRoute && !user) {
    const loginUrl = new URL(
      loginHref(`${pathname}${request.nextUrl.search}`),
      request.nextUrl.origin,
    )
    const redirectResponse = NextResponse.redirect(loginUrl)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return applyRobotsHeader(redirectResponse)
  }

  return applyRobotsHeader(supabaseResponse)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}