"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, SupabaseClient } from "@supabase/supabase-js"

export const AUTH_INITIALIZATION_TIMEOUT_MS = 4_000

type SettledSession =
  | { status: "resolved"; session: Awaited<ReturnType<SupabaseClient["auth"]["getSession"]>> }
  | { status: "failed" }

function getSessionWithTimeout(
  auth: SupabaseClient["auth"],
  timeoutMs = AUTH_INITIALIZATION_TIMEOUT_MS,
): Promise<SettledSession> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(
      () => resolve({ status: "failed" }),
      timeoutMs,
    )

    auth.getSession().then(
      (session) => {
        window.clearTimeout(timeout)
        resolve({ status: "resolved", session })
      },
      () => {
        window.clearTimeout(timeout)
        resolve({ status: "failed" })
      },
    )
  })
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }

  useEffect(() => {
    const supabase = supabaseRef.current
    if (!supabase) {
      setLoading(false)
      return
    }
    const auth = supabase.auth
    let active = true

    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    async function initializeAuth() {
      try {
        const result = await getSessionWithTimeout(auth)
        if (!active) return

        if (result.status === "failed" || result.session.error) {
          setUser(null)
          setLoading(false)
          return
        }

        const { data: { session } } = result.session
        setUser(session?.user ?? null)
        setLoading(false)

        // Cookie-backed sessions render immediately; validate an existing
        // session with Supabase in the background before trusting it further.
        if (session) {
          const { data, error } = await auth.getUser()
          if (!active) return
          setUser(error ? null : (data.user ?? null))
        }
      } catch {
        if (active) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    void initializeAuth()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    const supabase = supabaseRef.current
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) return
    window.location.href = "/"
  }

  return { user, loading, signOut }
}
