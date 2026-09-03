import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let instance: SupabaseClient | null = null

function getSupabaseConfig(): { url: string; key: string } | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!rawUrl || !key) return null

  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null

    // The client expects the Supabase project URL, not the REST endpoint.
    // Normalize an accidental /rest/v1 suffix so it cannot cause a runtime error.
    const url = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
    return { url, key }
  } catch {
    return null
  }
}

export function createClient(): SupabaseClient | null {
  if (instance) return instance

  const config = getSupabaseConfig()
  if (!config) return null

  instance = createBrowserClient(config.url, config.key)
  return instance
}
