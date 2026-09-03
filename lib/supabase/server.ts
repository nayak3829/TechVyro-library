import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Supabase configuration helpers. Keep invalid/missing environment values
// from crashing Server Components during preview/builds.
function getSupabaseConfig(): { url: string; key: string } | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!rawUrl || !key) return null

  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

    // NEXT_PUBLIC_SUPABASE_URL must be the project URL, not the REST endpoint.
    // Accept a mistakenly supplied /rest/v1/ value by normalizing it.
    const url = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
    return { url, key }
  } catch {
    return null
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null
}

export async function createClient() {
  const config = getSupabaseConfig()

  // Missing/invalid environment variables should not take down the homepage.
  // The calling data functions already handle a null client by returning
  // their default/empty data.
  if (!config) return null

  const cookieStore = await cookies()

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Ignore - called from Server Component
        }
      },
    },
  })
}
