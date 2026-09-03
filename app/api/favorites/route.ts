import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { randomUUID } from "crypto"

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

    if (error) return NextResponse.json({ favorites: [] })

    const response = NextResponse.json({ favorites: (data || []).map((r: { pdf_id: string }) => r.pdf_id) })
    response.cookies.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })
    return response
  } catch {
    return NextResponse.json({ favorites: [] })
  }
}

export async function POST(request: Request) {
  try {
    const { pdfId } = await request.json()
    if (!pdfId) return NextResponse.json({ error: "pdfId required" }, { status: 400 })

    const [{ deviceId }, userId] = await Promise.all([
      getOrCreateDeviceId(),
      getCurrentUserId(),
    ])
    const supabase = createAdminClient()

    // Check if already favorited
    let existing
    if (userId) {
      const result = await supabase
        .from("pdf_favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("pdf_id", pdfId)
        .maybeSingle()
      existing = result.data
    } else {
      const result = await supabase
        .from("pdf_favorites")
        .select("id")
        .eq("device_id", deviceId)
        .eq("pdf_id", pdfId)
        .maybeSingle()
      existing = result.data
    }

    let action: "added" | "removed"

    if (existing) {
      await supabase.from("pdf_favorites").delete().eq("id", existing.id)
      action = "removed"
    } else {
      await supabase.from("pdf_favorites").insert({
        device_id: deviceId,
        pdf_id: pdfId,
        user_id: userId || null,
      })
      action = "added"
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
