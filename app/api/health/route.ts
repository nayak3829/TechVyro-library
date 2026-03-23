import { NextResponse } from "next/server"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    supabase: {
      configured: false,
      connected: false,
      tables: [] as string[],
    },
    environment: {
      admin_password: Boolean(process.env.ADMIN_PASSWORD),
      telegram_token: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      openai_key: Boolean(process.env.OPENAI_API_KEY),
    },
  }

  // Check Supabase
  checks.supabase.configured = isSupabaseConfigured()
  
  if (checks.supabase.configured) {
    try {
      const supabase = await createClient()
      if (supabase) {
        // Test connection by fetching categories
        const { data, error } = await supabase.from("categories").select("id").limit(1)
        if (!error) {
          checks.supabase.connected = true
          checks.supabase.tables.push("categories")
        }

        // Check other tables
        const tables = ["pdfs", "quizzes", "reviews", "quiz_results", "site_settings", "pdf_favorites"]
        for (const table of tables) {
          const { error: tableError } = await supabase.from(table).select("id").limit(1)
          if (!tableError) {
            checks.supabase.tables.push(table)
          }
        }
      }
    } catch (e) {
      checks.supabase.connected = false
    }
  }

  const allGood = 
    checks.supabase.configured && 
    checks.supabase.connected && 
    checks.supabase.tables.length >= 7 &&
    checks.environment.admin_password

  return NextResponse.json({
    status: allGood ? "healthy" : "degraded",
    ...checks,
  })
}
