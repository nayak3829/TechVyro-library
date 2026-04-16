import { NextResponse } from "next/server"
import { createAdminToken, checkRateLimit, resetRateLimit, getClientIp } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const rateCheck = await checkRateLimit(ip)

  if (!rateCheck.allowed) {
    const retryAfterSecs = Math.ceil(rateCheck.retryAfterMs / 1000)
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${Math.ceil(retryAfterSecs / 60)} minute(s).` },
      { status: 429, headers: { "Retry-After": String(retryAfterSecs) } }
    )
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { password } = body as { password?: string }

    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 })
    }

    if (!password || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    await resetRateLimit(ip)
    const token = createAdminToken(adminPassword)
    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ error: "An error occurred" }, { status: 500 })
  }
}
