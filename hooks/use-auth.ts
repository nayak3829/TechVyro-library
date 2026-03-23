"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, SupabaseClient } from "@supabase/supabase-js"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }

  useEffect(() => {
    const supabase = supabaseRef.current!

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = supabaseRef.current!
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return { user, loading, signOut }
}
