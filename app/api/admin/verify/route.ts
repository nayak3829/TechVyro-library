import { NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token } = body as { token?: string }
    return NextResponse.json({ valid: verifyAdminToken(token) })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
