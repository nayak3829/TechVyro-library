import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// v3: Check if Supabase environment variables are configured before creating client
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Return true only if both are non-empty strings
  return Boolean(url && key && url.trim().length > 0 && key.trim().length > 0)
}

export async function createClient() {
  // IMPORTANT: Return null if Supabase is not configured
  // This prevents the app from crashing when env vars are missing
  if (!isSupabaseConfigured()) {
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
