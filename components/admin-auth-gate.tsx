"use client"

import { useState, type ReactNode } from "react"
import { AdminLogin } from "@/components/admin-login"

interface AdminAuthGateProps {
  initiallyAuthenticated: boolean
  children: ReactNode
}

export function AdminAuthGate({ initiallyAuthenticated, children }: AdminAuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initiallyAuthenticated)

  if (!isAuthenticated) {
    return <AdminLogin onLogin={() => setIsAuthenticated(true)} />
  }

  return <div className="min-h-screen bg-background">{children}</div>
}