import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Credits are stored in user_metadata — no extra table needed, works automatically.
// Structure: { credits: number, is_premium: boolean, referral_code: string, referred_by?: string }

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function defaultMeta(existingMeta: Record<string, unknown> = {}) {
  return {
    credits: 10,
    is_premium: false,
    referral_code: generateReferralCode(),
    referred_by: null,
    ...existingMeta,
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ credits: defaultMeta() })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let admin
    try {
      admin = createAdminClient()
    } catch {
      // Service role key not configured — return defaults from user metadata
      const meta = (user.user_metadata || {}) as Record<string, unknown>
      return NextResponse.json({ credits: defaultMeta(meta) })
    }

    const meta = (user.user_metadata || {}) as Record<string, unknown>

    // Auto-init credits for first-time users
    if (meta.credits === undefined || meta.referral_code === undefined) {
      const newMeta = defaultMeta(meta)
      await admin.auth.admin.updateUserById(user.id, { user_metadata: newMeta })
      return NextResponse.json({ credits: newMeta })
    }

    return NextResponse.json({ credits: meta })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const action = body.action as string
    const admin = createAdminClient()

    const meta = defaultMeta((user.user_metadata || {}) as Record<string, unknown>)

    if (action === "use") {
      if (!meta.is_premium && (meta.credits as number) <= 0) {
        return NextResponse.json({ error: "No credits left. Refer friends to earn more!", credits: 0 }, { status: 402 })
      }

      if (!meta.is_premium) {
        const updated = { ...meta, credits: (meta.credits as number) - 1 }
        await admin.auth.admin.updateUserById(user.id, { user_metadata: updated })
        return NextResponse.json({ success: true, credits: updated })
      }

      return NextResponse.json({ success: true, credits: meta })
    }

    if (action === "referral") {
      const code = (body.code as string)?.trim().toUpperCase()
      if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })
      if (meta.referred_by) return NextResponse.json({ error: "Already used a referral code" }, { status: 400 })
      if (meta.referral_code === code) return NextResponse.json({ error: "Cannot use your own code" }, { status: 400 })

      // Find the referrer by listing all users and checking their metadata
      const { data: { users: allUsers }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
      if (listErr) return NextResponse.json({ error: "Could not verify code" }, { status: 500 })

      const referrer = allUsers.find(u => (u.user_metadata?.referral_code as string)?.toUpperCase() === code)
      if (!referrer) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })

      // Give referrer +5 credits
      const referrerMeta = defaultMeta((referrer.user_metadata || {}) as Record<string, unknown>)
      await admin.auth.admin.updateUserById(referrer.id, {
        user_metadata: { ...referrerMeta, credits: (referrerMeta.credits as number) + 5 }
      })

      // Give current user +5 credits + mark as referred
      const updated = { ...meta, credits: (meta.credits as number) + 5, referred_by: code }
      await admin.auth.admin.updateUserById(user.id, { user_metadata: updated })

      return NextResponse.json({ success: true, credits: updated, bonusEarned: 5 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
