import { NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/admin-auth"

export async function POST(request: Request) {
  try {
    return NextResponse.json({ valid: verifyAdminToken(extractToken(request)) })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
