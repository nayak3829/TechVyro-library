import { createHmac, timingSafeEqual } from "crypto"
import { Redis } from "@upstash/redis"

const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Redis-based rate limiting (persists across serverless instances)
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60 // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10

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

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const redis = getRedis()
  
  // Fallback to allow if Redis is not configured (development mode)
  if (!redis) {
    console.warn("[v0] Redis not configured, rate limiting disabled")
    return { allowed: true, retryAfterMs: 0 }
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
    // Fail open - allow request if Redis errors
    return { allowed: true, retryAfterMs: 0 }
  }
}

export async function resetRateLimit(ip: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  
  try {
    await redis.del(getRateLimitKey(ip))
  } catch (error) {
    console.error("[v0] Redis reset rate limit error:", error)
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
