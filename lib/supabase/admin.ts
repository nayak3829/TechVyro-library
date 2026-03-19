import { createClient } from '@supabase/supabase-js'

// Check if admin client can be created
export function isAdminConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Admin client with service role key for server-side operations
// This bypasses RLS and should only be used in server actions
export function createAdminClient() {
  if (!isAdminConfigured()) {
    throw new Error("Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
