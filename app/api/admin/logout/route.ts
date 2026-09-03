import { NextResponse } from "next/server"
import {
  ADMIN_SESSION_COOKIE,
  extractToken,
  verifyAdminToken,
} from "@/lib/admin-auth"

export async function POST(request: Request) {
  if (!verifyAdminToken(extractToken(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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