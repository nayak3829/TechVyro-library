"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { SupabaseClient } from "@supabase/supabase-js"
import {
  FileText, Mail, Lock, User, Eye, EyeOff,
  LogIn, UserPlus, Loader2, ArrowLeft, BookOpen, CheckCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

type Mode = "login" | "signup" | "forgot"

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  const [mode, setMode] = useState<Mode>((searchParams.get("mode") as Mode) || "login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const supabaseRef = useRef<SupabaseClient | null>(null)
  if (!supabaseRef.current) supabaseRef.current = createClient()
  const supabase = supabaseRef.current

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(redirectTo)
    })
  }, [])

  const getRedirectURL = () => {
    if (typeof window === "undefined") return ""
    const origin = window.location.origin
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const base = (origin.includes("localhost") && siteUrl) ? siteUrl : origin
    const next = redirectTo !== "/" ? `?next=${encodeURIComponent(redirectTo)}` : ""
    return `${base}/auth/callback${next}`
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setPassword("")
    setName("")
    setForgotSent(false)
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        toast.error("Authentication is not configured. Please contact admin.")
        setGoogleLoading(false)
        return
      }
      
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
        if (error.message.toLowerCase().includes("provider") || error.message.toLowerCase().includes("oauth")) {
          toast.error("Google sign-in is not configured. Please use email/password or contact admin.")
        } else {
          toast.error(error.message)
        }
      }
    } catch {
      toast.error("Could not connect to authentication service. Please try again.")
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl) {
        toast.error("Authentication is not configured. Please contact admin.")
        setLoading(false)
        return
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        if (error.message.toLowerCase().includes("invalid login") || error.message.toLowerCase().includes("invalid credentials")) {
          toast.error("Invalid email or password")
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          toast.error("Please verify your email first. Check your inbox.")
        } else if (error.message.toLowerCase().includes("fetch") || error.message.toLowerCase().includes("network")) {
          toast.error("Could not connect to server. Please check your connection.")
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success("Welcome back!")
        router.push(redirectTo)
        router.refresh()
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
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
          toast.error("This email is already registered.")
          switchMode("login")
        } else {
          toast.error(error.message)
        }
      } else if (data.user && !data.session) {
        toast.success("Account created! Check your email to verify.")
        switchMode("login")
      } else {
        toast.success("Account created! You are now logged in.")
        router.push(redirectTo)
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

  const features = [
    "Access 200+ free educational PDFs",
    "Track your reading progress",
    "Save bookmarks across devices",
    "Take quizzes and view history",
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-accent/5 to-background relative flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,80,200,0.15),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <Link href="/" className="flex items-center gap-3 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold">
              <span className="text-[#ef4444]">Tech</span>
              <span className="text-foreground">Vyro</span>
            </span>
            <p className="text-[10px] text-muted-foreground font-medium">PDF Library</p>
          </div>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground leading-tight">
              Your free gateway to<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                quality education
              </span>
            </h1>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              Join thousands of students accessing free PDFs, notes, and practice sets — all in one place.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-3 w-3 text-primary" />
                </div>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">200+ Free PDFs</p>
            <p className="text-xs text-muted-foreground">Updated regularly by the TechVyro team</p>
          </div>
        </div>
      </div>

      {/* Right Panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="text-[#ef4444]">Tech</span>
              <span className="text-foreground">Vyro</span>
            </span>
          </div>

          {/* Back link */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to home
          </Link>

          {/* Card */}
          <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />

            <div className="p-7">
              {/* Tabs */}
              {mode !== "forgot" && (
                <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-6">
                  {(["login", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchMode(m)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        mode === m
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "login" ? "Login" : "Sign Up"}
                    </button>
                  ))}
                </div>
              )}

              {/* Forgot — success state */}
              {mode === "forgot" && forgotSent ? (
                <div className="text-center py-6 space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">Email Sent!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Check your inbox and click the reset link to set a new password.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => switchMode("login")} className="gap-2 w-full">
                    <LogIn className="h-4 w-4" />
                    Back to Login
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="text-xl font-bold text-foreground">
                      {mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset password"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {mode === "login"
                        ? "Enter your details to access your account"
                        : mode === "signup"
                        ? "It's free and takes less than a minute"
                        : "Enter your email and we'll send you a reset link"}
                    </p>
                  </div>

                  {mode !== "forgot" && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading || loading}
                        className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-border/70 bg-background hover:bg-muted/50 transition-colors text-sm font-medium text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {googleLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        )}
                        Continue with Google
                      </button>

                      <div className="flex items-center gap-3 my-1">
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-xs text-muted-foreground font-medium">or continue with email</span>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                    </>
                  )}

                  <form
                    onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot}
                    className="space-y-4"
                  >
                    {mode === "signup" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="Your full name"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-10 h-12 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-primary"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-primary"
                          required
                          suppressHydrationWarning
                        />
                      </div>
                    </div>

                    {mode !== "forgot" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Password</label>
                          {mode === "login" && (
                            <button
                              type="button"
                              onClick={() => setMode("forgot")}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              Forgot password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                            autoComplete={mode === "signup" ? "new-password" : "current-password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-12 h-12 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-primary"
                            required
                            suppressHydrationWarning
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {mode === "signup" && (
                          <p className="text-[11px] text-muted-foreground">Must be at least 6 characters</p>
                        )}
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 rounded-xl gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity font-semibold text-sm mt-2"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Please wait...</>
                      ) : mode === "login" ? (
                        <><LogIn className="h-4 w-4" /> Login to TechVyro</>
                      ) : mode === "signup" ? (
                        <><UserPlus className="h-4 w-4" /> Create Free Account</>
                      ) : (
                        <><Mail className="h-4 w-4" /> Send Reset Link</>
                      )}
                    </Button>

                    {mode === "forgot" && (
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="w-full text-sm text-muted-foreground hover:text-primary transition-colors pt-1"
                      >
                        ← Back to Login
                      </button>
                    )}
                  </form>

                  {mode !== "forgot" && (
                    <p className="text-center text-xs text-muted-foreground mt-5 pt-4 border-t border-border/40">
                      {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                      {" "}
                      <button
                        onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                        className="text-primary font-semibold hover:underline"
                      >
                        {mode === "login" ? "Sign up free" : "Login"}
                      </button>
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            By continuing, you agree to our{" "}
            <Link href="/about" className="text-primary hover:underline">Terms of Service</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  )
}
