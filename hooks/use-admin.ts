"use client"

import { useState, useEffect } from "react"

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token")
    if (!token) {
      setIsAdmin(false)
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
        setIsAdmin(data.valid ?? false)
      })
      .catch(() => {
        setIsAdmin(false)
      })
      .finally(() => {
        clearTimeout(timeout)
        setIsLoading(false)
      })
  }, [])

  return { isAdmin, isLoading }
}
