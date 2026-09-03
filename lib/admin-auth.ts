import { createHmac, timingSafeEqual } from "crypto"
import { Redis } from "@upstash/redis"

export const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000
export const ADMIN_SESSION_COOKIE = "admin_session"

// Redis-based rate limiting (persists across serverless instances)
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60 // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10
const MAX_IN_MEMORY_RATE_LIMIT_ENTRIES = 10_000

type RateLimitEntry = {
  count: number
  expiresAt: number
}

const inMemoryRateLimits = new Map<string, RateLimitEntry>()

function getRedis(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null
  }
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

function getRateLimitKey(ip: string): string {
  return `admin_rate_limit:${ip}`
}

function checkInMemoryRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()

  for (const [key, entry] of inMemoryRateLimits) {
    if (entry.expiresAt <= now) inMemoryRateLimits.delete(key)
  }

  const current = inMemoryRateLimits.get(ip)
  if (!current) {
    if (inMemoryRateLimits.size >= MAX_IN_MEMORY_RATE_LIMIT_ENTRIES) {
      const oldestKey = inMemoryRateLimits.keys().next().value
      if (oldestKey) inMemoryRateLimits.delete(oldestKey)
    }
    inMemoryRateLimits.set(ip, {
      count: 1,
      expiresAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000,
    })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (current.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: Math.max(0, current.expiresAt - now) }
  }

  current.count += 1
  return { allowed: true, retryAfterMs: 0 }
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const redis = getRedis()

  if (!redis) {
    return checkInMemoryRateLimit(ip)
  }

  const key = getRateLimitKey(ip)
  
  try {
    // Get current attempt count
    const currentCount = await redis.get<number>(key)
    
    if (currentCount === null) {
      // First attempt - set count to 1 with expiration
      await redis.set(key, 1, { ex: RATE_LIMIT_WINDOW_SECONDS })
      return { allowed: true, retryAfterMs: 0 }
    }
    
    if (currentCount >= RATE_LIMIT_MAX_ATTEMPTS) {
      // Get TTL to calculate retry time
      const ttl = await redis.ttl(key)
      const retryAfterMs = ttl > 0 ? ttl * 1000 : 0
      return { allowed: false, retryAfterMs }
    }
    
    // Increment attempt count (keeps existing TTL)
    await redis.incr(key)
    return { allowed: true, retryAfterMs: 0 }
  } catch (error) {
    console.error("[v0] Redis rate limit error:", error)
    return checkInMemoryRateLimit(ip)
  }
}

export async function resetRateLimit(ip: string): Promise<void> {
  const redis = getRedis()
  if (!redis) {
    inMemoryRateLimits.delete(ip)
    return
  }
  
  try {
    await redis.del(getRateLimitKey(ip))
  } catch (error) {
    console.error("[v0] Redis reset rate limit error:", error)
    inMemoryRateLimits.delete(ip)
  }
}

function computeHmac(adminPassword: string, timestamp: string): string {
  return createHmac("sha256", adminPassword).update(timestamp).digest("hex")
}

export function createAdminToken(adminPassword: string): string {
  const timestamp = Date.now().toString()
  const sig = computeHmac(adminPassword, timestamp)
  return Buffer.from(`${timestamp}.${sig}`).toString("base64url")
}

export function getAdminSessionCookieOptions(token: string) {
  let expiresAt = Date.now() + TOKEN_MAX_AGE_MS
  try {
    const timestamp = Buffer.from(token, "base64url").toString("utf-8").split(".", 1)[0]
    const issuedAt = Number.parseInt(timestamp, 10)
    if (!Number.isNaN(issuedAt)) expiresAt = issuedAt + TOKEN_MAX_AGE_MS
  } catch {
    // The caller creates the token immediately before setting this cookie.
  }

  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_MAX_AGE_MS / 1000,
    expires: new Date(expiresAt),
  }
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
  const forwarded = request.headers.get("x-forwarded-for")
    ?.split(",")
    .map(value => value.trim())
    .filter(Boolean)
  return (
    forwarded?.at(-1) ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export function extractToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization")
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim()
    if (token) return token
  }

  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...value] = cookie.trim().split("=")
    if (name === ADMIN_SESSION_COOKIE) {
      return value.join("=") || null
    }
  }

  return null
}
