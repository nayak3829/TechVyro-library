import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { readBoundedJson, RequestBodyError } from "@/lib/ai-request-security"

type CreditAccount = {
  credits: number
  is_premium: boolean
  referral_code: string
  referred_by?: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await createAdminClient().rpc("get_user_credit_account", {
      p_user_id: user.id,
    })
    if (error || !data) {
      console.error("[credits] Failed to read account:", error?.message)
      return NextResponse.json({ error: "Could not load credits" }, { status: 500 })
    }
    return NextResponse.json({ credits: data as CreditAccount })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    let body: unknown
    try {
      body = await readBoundedJson(request, 4 * 1024)
    } catch (error) {
      if (error instanceof RequestBodyError) {
        return NextResponse.json({ error: error.message }, { status: error.status })
      }
      throw error
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
    }
    const payload = body as Record<string, unknown>
    const action = payload.action
    const admin = createAdminClient()

    if (action === "use") {
      const { data, error } = await admin.rpc("spend_user_credit", { p_user_id: user.id })
      if (error || !data) {
        console.error("[credits] Spend failed:", error?.message)
        return NextResponse.json({ error: "Could not use a credit" }, { status: 500 })
      }
      const result = data as CreditAccount & { status: string }
      if (result.status === "no_credits") {
        return NextResponse.json(
          { error: "No credits left. Refer friends to earn more!", credits: 0 },
          { status: 402 },
        )
      }
      const { status: _status, ...credits } = result
      return NextResponse.json({ success: true, credits })
    }

    if (action === "referral") {
      const code = typeof payload.code === "string" ? payload.code.trim().toUpperCase() : ""
      if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })

      const { data, error } = await admin.rpc("redeem_user_referral", {
        p_user_id: user.id,
        p_code: code,
      })
      if (error || !data) {
        console.error("[credits] Referral redemption failed:", error?.message)
        return NextResponse.json({ error: "Could not redeem referral code" }, { status: 500 })
      }
      const result = data as CreditAccount & { status: string; bonusEarned?: number }
      if (result.status === "invalid_code") {
        return NextResponse.json({ error: "Invalid referral code" }, { status: 404 })
      }
      if (result.status === "own_code") {
        return NextResponse.json({ error: "Cannot use your own code" }, { status: 400 })
      }
      if (result.status === "already_redeemed") {
        return NextResponse.json({ error: "Already used a referral code" }, { status: 400 })
      }
      const { status: _status, bonusEarned, ...credits } = result
      return NextResponse.json({ success: true, credits, bonusEarned: bonusEarned ?? 5 })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}