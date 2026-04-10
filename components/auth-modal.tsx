"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import { X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

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
  const [googleLoading, setGoogleLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const supabaseRef = useRef<SupabaseClient | null>(null)
  if (!supabaseRef.current) {
    supabaseRef.current = createClient()
  }
  const supabase = supabaseRef.current

  // Get the redirect URL - stays on current page after login
  const getRedirectURL = () => {
    if (typeof window === "undefined") return ""
    const origin = window.location.origin
    const currentPath = redirectTo || window.location.pathname + window.location.search
    const next = currentPath !== "/" ? `?next=${encodeURIComponent(currentPath)}` : ""
    return `${origin}/auth/callback${next}`
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectURL(),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      })
      if (error) {
        toast.error(error.message)
      }
    } catch {
      toast.error("Could not connect to Google. Please try email login.")
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
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
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim() || !name.trim()) return
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: getRedirectURL(),
        },
      })
      if (error) {
        if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("user already")) {
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
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getRedirectURL(),
      })
      if (error) {
        toast.error(error.message)
      } else {
        setForgotSent(true)
        toast.success("Password reset email sent!")
      }
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === "login"
                  ? "Sign in to your account"
                  : mode === "signup"
                  ? "Create your free account"
                  : "We'll send you a reset link"}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-lg">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {mode === "forgot" && forgotSent ? (
            <div className="text-center py-6 space-y-4">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
                <Mail className="h-7 w-7 text-green-500" />
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
                <>
                  {/* Google Sign In */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-border/70 bg-background hover:bg-muted/50 transition-colors text-sm font-medium text-foreground disabled:opacity-60 disabled:cursor-not-allowed mb-4"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                </>
              )}

              <form
                onSubmit={
                  mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot
                }
                className="space-y-3"
              >
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 h-11 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-11 rounded-xl"
                      required
                    />
                  </div>
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10 h-11 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
