import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"
import { readBoundedJson, RequestBodyError } from "@/lib/ai-request-security"

const DEVICE_COOKIE = "tv_device_id"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

async function getOrCreateDeviceId(): Promise<{ deviceId: string; isNew: boolean }> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(DEVICE_COOKIE)?.value
  if (existing) return { deviceId: existing, isNew: false }
  return { deviceId: randomUUID(), isNew: true }
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    if (!supabase) return null
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id || null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const [{ deviceId }, userId] = await Promise.all([
      getOrCreateDeviceId(),
      getCurrentUserId(),
    ])
    const supabase = createAdminClient()

    let data, error

    if (userId) {
      // Logged-in: fetch by user_id
      const result = await supabase
        .from("pdf_favorites")
        .select("pdf_id")
        .eq("user_id", userId)
      data = result.data
      error = result.error
    } else {
      // Guest: fetch by device_id
      const result = await supabase
        .from("pdf_favorites")
        .select("pdf_id")
        .eq("device_id", deviceId)
      data = result.data
      error = result.error
    }

    if (error) {
      console.error("[favorites] Failed to load favorites:", error.message)
      return NextResponse.json({ error: "Failed to load favorites" }, { status: 500 })
    }

    const response = NextResponse.json({ favorites: (data || []).map((r: { pdf_id: string }) => r.pdf_id) })
    response.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })
    return response
  } catch {
    return NextResponse.json({ error: "Failed to load favorites" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await readBoundedJson(request, 4 * 1024)
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
    const pdfId = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).pdfId
      : null
    if (typeof pdfId !== "string" || !/^[0-9a-f-]{36}$/i.test(pdfId)) {
      return NextResponse.json({ error: "Valid pdfId required" }, { status: 400 })
    }

    const [{ deviceId }, userId] = await Promise.all([
      getOrCreateDeviceId(),
      getCurrentUserId(),
    ])
    const supabase = createAdminClient()

    const { data: action, error } = await supabase.rpc("toggle_pdf_favorite", {
      p_user_id: userId,
      p_device_id: deviceId,
      p_pdf_id: pdfId,
    })
    if (error || (action !== "added" && action !== "removed")) {
      console.error("[favorites] Toggle failed:", error?.message)
      return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 })
    }

    const response = NextResponse.json({ action })
    response.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })
    return response
  } catch {
    return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 })
  }
}
