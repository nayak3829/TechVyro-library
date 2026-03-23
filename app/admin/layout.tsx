"use client"

import { useState, useEffect, type ReactNode } from "react"
import { AdminLogin } from "@/components/admin-login"

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token")
    if (!token) {
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setIsAuthenticated(true)
        } else {
          sessionStorage.removeItem("admin_token")
          setIsAuthenticated(false)
        }
      })
      .catch(() => {
        sessionStorage.removeItem("admin_token")
        setIsAuthenticated(false)
      })
      .finally(() => {
        clearTimeout(timeout)
        setIsLoading(false)
      })

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [])

  function handleLogin(token: string) {
    sessionStorage.setItem("admin_token", token)
    setIsAuthenticated(true)
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_token")
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
