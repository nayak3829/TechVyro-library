export const ROBOTS_DISALLOW = [
  "/admin",
  "/api/",
  "/login",
  "/reset-password",
  "/profile",
  "/library",
  "/notifications",
  "/progress",
  "/submit",
  "/quiz/",
  "/test-series/play",
] as const

export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/browse",
  "/quiz",
  "/test-series",
  "/about",
  "/privacy",
  "/terms",
] as const

export function isPrivateIndexRoute(pathname: string): boolean {
  const isQuizDetail = /^\/quiz\/[^/]+(?:\/play)?\/?$/.test(pathname) &&
    pathname !== "/quiz/leaderboard" &&
    pathname !== "/quiz/leaderboard/"
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/library" ||
    pathname.startsWith("/library/") ||
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/progress" ||
    pathname.startsWith("/progress/") ||
    pathname === "/submit" ||
    pathname.startsWith("/submit/") ||
    isQuizDetail ||
    pathname === "/test-series/play" ||
    pathname.startsWith("/test-series/play/")
  )
}