import { cookies } from "next/headers"
import type { ReactNode } from "react"
import { AdminAuthGate } from "@/components/admin-auth-gate"
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminToken,
} from "@/lib/admin-auth"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value

  return (
    <AdminAuthGate initiallyAuthenticated={verifyAdminToken(token)}>
      {children}
    </AdminAuthGate>
  )
}
