import { NextResponse } from "next/server"
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-auth"
import { isRequestOriginAllowed } from "@/lib/request-origin"

export async function POST(request: Request) {
  if (!isRequestOriginAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  })
  return response
}