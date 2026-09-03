import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    // Authorization headers remain supported for existing clients; the HttpOnly
    // session cookie is used when no JavaScript-visible token is available.
    // The body token is retained only for legacy clients during migration.
    const body = await request.json().catch(() => ({}))
    const { token } = body as { token?: string }
    return NextResponse.json({ valid: verifyAdminToken(extractToken(request) ?? token) })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
