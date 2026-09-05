"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { retryAuthNetworkRequest } from "@/lib/auth-network"
import { safeInternalPath } from "@/lib/auth-redirect"
import type { SupabaseClient } from "@supabase/supabase-js"
import { ArrowLeft, CheckCircle, X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GoogleIcon } from "@/components/google-icon"
import { toast } from "sonner"
import { useDialogFocus } from "@/hooks/use-dialog-focus"

interface AuthModalProps {
  onClose: () => void
  redirectTo?: string
}

export function AuthModal({ onClose, redirectTo }: AuthModalProps) {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const supabaseRef = useRef<SupabaseClient | null>(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  useDialogFocus({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: () => { if (!loading) onClose() },
  })

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Get the redirect URL - stays on current page after login
  const getRedirectURL = (destination?: string) => {
    if (typeof window === "undefined") return ""
    const origin = window.location.origin
    const requestedPath = destination || redirectTo || window.location.pathname + window.location.search
    const currentPath = safeInternalPath(requestedPath)
    const next = currentPath !== "/" ? `?next=${encodeURIComponent(currentPath)}` : ""
    return `${origin}/auth/callback${next}`
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (!supabase) {
      toast.error("Authentication is not configured. Please contact admin.")
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        if (error.message.toLowerCase().includes("invalid login") || error.message.toLowerCase().includes("invalid credentials")) {
          toast.error("Invalid email or password")
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          toast.error("Please verify your email before logging in. Check your inbox.")
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success("Welcome back!")
        onClose()
        const destination = safeInternalPath(redirectTo)
        if (destination !== "/") {
          router.push(destination)
        } else {
          router.refresh()
        }
      }
    } catch {
      toast.error("Could not connect to the authentication service. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) {
      toast.error("Authentication is not configured. Please contact admin.")
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectURL(),
          queryParams: { prompt: "select_account" },
        },
      })
      if (error) {
        toast.error(error.message)
        setLoading(false)
      }
    } catch {
      toast.error("Could not start Google sign-in. Please try again.")
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !name.trim()) return
    if (!supabase) {
      toast.error("Authentication is not configured. Please contact admin.")
      return
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    try {
      const { data, error } = await retryAuthNetworkRequest(() =>
        supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: getRedirectURL(),
          },
        }),
      )
      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes("rate limit")) {
          toast.error("Too many verification emails were requested. Please wait a few minutes and try again.")
        } else if (message.includes("already registered") || message.includes("user already")) {
          toast.error("This email is already registered. Please login.")
          setMode("login")
        } else {
          toast.error(error.message)
        }
      } else if (data.user && !data.session) {
        toast.success("Account created! Check your email to verify your account.")
        onClose()
      } else {
        toast.success("Account created! You are now logged in.")
        onClose()
        const destination = safeInternalPath(redirectTo)
        if (destination !== "/") router.push(destination)
        else router.refresh()
      }
    } catch {
      toast.error("Could not create your account. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    if (!supabase) {
      toast.error("Authentication is not configured. Please contact admin.")
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        toast.error(error.message)
      } else {
        setForgotSent(true)
        toast.success("Password reset email sent!")
      }
    } catch {
      toast.error("Could not send the reset email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: "login" | "signup") => {
    setMode(newMode)
    setPassword("")
    setName("")
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { if (!loading) onClose() }} />

      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" aria-describedby="auth-modal-description" tabIndex={-1} className="auth-card relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border/60 bg-card/95">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 id="auth-modal-title" className="text-xl font-bold text-foreground">
                {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
              </h2>
              <p id="auth-modal-description" className="text-xs text-muted-foreground mt-0.5">
                {mode === "login"
                  ? "Sign in to your account"
                  : mode === "signup"
                  ? "Create your free account"
                  : "We'll send you a reset link"}
              </p>
            </div>
            <Button ref={closeButtonRef} variant="ghost" size="icon" onClick={onClose} aria-label="Close sign in dialog" className="h-9 w-9 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {mode === "forgot" && forgotSent ? (
            <div className="text-center py-6 space-y-4">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Email Sent!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check your inbox and click the reset link.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMode("login")} className="gap-2">
                <LogIn className="h-4 w-4" />
                Back to Login
              </Button>
            </div>
          ) : (
            <>
              {mode !== "forgot" && (
                <div className="mb-4 space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    className="w-full h-11 rounded-xl gap-3 bg-background hover:bg-muted/60 font-semibold"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
                    Continue with Google
                  </Button>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border/60" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or use email</span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                </div>
              )}

              <form
                onSubmit={
                  mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot
                }
                className="space-y-3"
              >
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-modal-name" className="text-xs font-medium text-foreground">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        id="auth-modal-name"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="auth-field pl-9 h-11 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="auth-modal-email" className="text-xs font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      id="auth-modal-email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="auth-field pl-9 h-11 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <label htmlFor="auth-modal-password" className="text-xs font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="auth-modal-password"
                        placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-field pl-9 pr-10 h-11 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {mode === "login" && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 font-semibold"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "login" ? (
                    <><LogIn className="h-4 w-4" /> Login</>
                  ) : mode === "signup" ? (
                    <><UserPlus className="h-4 w-4" /> Create Account</>
                  ) : (
                    <><Mail className="h-4 w-4" /> Send Reset Link</>
                  )}
                </Button>
              </form>
            </>
          )}

          {mode !== "forgot" && (
            <div className="mt-4 pt-4 border-t border-border/40 text-center">
              <p className="text-xs text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                {" "}
                <button
                  type="button"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === "login" ? "Sign up free" : "Login"}
                </button>
              </p>
            </div>
          )}

          {mode === "forgot" && !forgotSent && (
            <div className="mt-4 pt-4 border-t border-border/40 text-center">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
