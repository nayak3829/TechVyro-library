import { createHmac, timingSafeEqual } from "crypto"

const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Check if admin is configured
export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0)
}

// In-memory rate limiting (resets on server restart, good enough for single-instance)
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - entry.firstAttempt)
    return { allowed: false, retryAfterMs }
  }

  entry.count++
  return { allowed: true, retryAfterMs: 0 }
}

export function resetRateLimit(ip: string) {
  loginAttempts.delete(ip)
}

function computeHmac(adminPassword: string, timestamp: string): string {
  return createHmac("sha256", adminPassword).update(timestamp).digest("hex")
}

export function createAdminToken(adminPassword: string): string {
  const timestamp = Date.now().toString()
  const sig = computeHmac(adminPassword, timestamp)
  return Buffer.from(`${timestamp}.${sig}`).toString("base64url")
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token) return false
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return false

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8")
    const dotIdx = decoded.indexOf(".")
    if (dotIdx === -1) return false

    const timestamp = decoded.slice(0, dotIdx)
    const sig = decoded.slice(dotIdx + 1)

    const tokenAge = Date.now() - parseInt(timestamp, 10)
    if (isNaN(tokenAge) || tokenAge < 0 || tokenAge > TOKEN_MAX_AGE_MS) return false

    const expectedSig = computeHmac(adminPassword, timestamp)

    // Constant-time comparison to prevent timing attacks
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expectedBuf.length) return false

    return timingSafeEqual(sigBuf, expectedBuf)
  } catch {
    return false
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export function extractToken(request: Request): string | null {
  return request.headers.get("Authorization")?.replace("Bearer ", "").trim() || null
}
