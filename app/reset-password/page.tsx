"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ArrowLeft, CheckCircle, Eye, EyeOff, FileText, Loader2, Lock } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setChecking(false)
      return
    }
    const auth = supabase.auth
    let active = true
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (!active || !session) return
      setHasSession(true)
      setChecking(false)
    })

    async function initializeRecoverySession() {
      try {
        const code = new URLSearchParams(window.location.search).get("code")
        if (code) {
          const { data, error } = await auth.exchangeCodeForSession(code)
          if (error) throw error
          if (active) setHasSession(Boolean(data.session))
        } else {
          const { data } = await auth.getSession()
          if (active) setHasSession(Boolean(data.session))
        }
      } catch {
        if (active) setHasSession(false)
      } finally {
        if (active) setChecking(false)
      }
    }

    void initializeRecoverySession()
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase || saving) return
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        toast.error(error.message)
        return
      }
      setComplete(true)
      toast.success("Password updated successfully.")
      await supabase.auth.signOut()
      setTimeout(() => router.replace("/login?reset=success"), 1200)
    } catch {
      toast.error("Could not update your password. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <main className="auth-shell min-h-[100dvh] grid place-items-center px-4" aria-busy="true" aria-label="Checking password reset link">
        <section className="w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-6 sm:p-8">
          <div className="h-10 w-10 rounded-xl bg-muted skeleton-shimmer" />
          <div className="mt-6 h-7 w-2/3 rounded-md bg-muted skeleton-shimmer" />
          <div className="mt-3 h-4 w-full rounded-md bg-muted skeleton-shimmer" />
          <div className="mt-7 h-12 w-full rounded-xl bg-muted skeleton-shimmer" />
        </section>
      </main>
    )
  }

  return (
    <main className="auth-shell min-h-[100dvh] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col justify-center">
        <Link href="/login" className="mb-5 inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <section className="auth-card w-full rounded-2xl border border-border/60 bg-card/95 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />
          <div className="p-6 sm:p-8">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/10">
            {complete
              ? <CheckCircle className="h-6 w-6 text-primary" />
              : <Lock className="h-6 w-6 text-primary" />}
          </div>
          <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" /> TechVyro account
          </div>
          <h1 className="text-2xl font-bold">
            {complete ? "Password updated" : "Create a new password"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {complete
              ? "Redirecting you to login…"
              : hasSession
                ? "Choose a strong password for your TechVyro account."
                : "This password reset link is invalid or has expired."}
          </p>
        </div>

        {!complete && hasSession && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-foreground">
                New password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="auth-field h-12 rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-foreground">
                Confirm password
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="auth-field h-12 rounded-xl"
              />
            </div>
            <Button type="submit" className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-primary to-accent font-semibold transition-transform hover:opacity-90 active:scale-[.99]" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        )}

        {!complete && !hasSession && (
          <Button className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-accent font-semibold" onClick={() => router.replace("/login?mode=forgot")}>
            Request a new reset link
          </Button>
        )}
          </div>
        </section>
      </div>
    </main>
  )
}