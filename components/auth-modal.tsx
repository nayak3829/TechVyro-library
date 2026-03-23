"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Mail, Lock, User, Eye, EyeOff, LogIn, UserPlus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface AuthModalProps {
  onClose: () => void
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        if (error.message.includes("Invalid login")) {
          toast.error("Invalid email or password")
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success("Welcome back! Login successful")
        onClose()
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
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      })
      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please login.")
          setMode("login")
        } else {
          toast.error(error.message)
        }
      } else {
        toast.success("Account created! Please verify your email if prompted.")
        onClose()
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-accent" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === "login" ? "Sign in to your account" : mode === "signup" ? "Create your free account" : "We'll send you a reset link"}
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
                <p className="text-sm text-muted-foreground mt-1">Check your inbox and click the reset link.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMode("login")} className="gap-2">
                <LogIn className="h-4 w-4" />
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgot} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
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
                    onChange={e => setEmail(e.target.value)}
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
                      onChange={e => setPassword(e.target.value)}
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
                      <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
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
                  <><LogIn className="h-4 w-4" />Login</>
                ) : mode === "signup" ? (
                  <><UserPlus className="h-4 w-4" />Create Account</>
                ) : (
                  <><Mail className="h-4 w-4" />Send Reset Link</>
                )}
              </Button>
            </form>
          )}

          {mode !== "forgot" && (
            <div className="mt-5 pt-4 border-t border-border/40 text-center">
              <p className="text-xs text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                {" "}
                <button
                  type="button"
                  onClick={() => { setMode(mode === "login" ? "signup" : "login"); setPassword(""); setName("") }}
                  className="text-primary font-medium hover:underline"
                >
                  {mode === "login" ? "Sign up" : "Login"}
                </button>
              </p>
            </div>
          )}

          {mode === "forgot" && !forgotSent && (
            <div className="mt-5 pt-4 border-t border-border/40 text-center">
              <button type="button" onClick={() => setMode("login")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                ← Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
