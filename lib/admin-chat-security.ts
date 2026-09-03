import { createHash } from "node:crypto"
import { Redis } from "@upstash/redis"

export const ADMIN_CHAT_IDLE_TIMEOUT_MS = 30 * 60 * 1000
export const ADMIN_CHAT_ABSOLUTE_LIFETIME_MS = 3 * 60 * 60 * 1000

type SessionTimes = {
  created_at?: string | null
  last_message_at?: string | null
}

type Limit = {
  name: string
  maximum: number
  windowSeconds: number
}

type MemoryEntry = { count: number; expiresAt: number }
const memoryLimits = new Map<string, MemoryEntry>()
const MAX_MEMORY_ENTRIES = 20_000

const LIMITS = {
  start: { name: "start", maximum: 5, windowSeconds: 10 * 60 },
  sendClient: { name: "send-client", maximum: 60, windowSeconds: 60 },
  sendSession: { name: "send-session", maximum: 20, windowSeconds: 60 },
  pollClient: { name: "poll-client", maximum: 120, windowSeconds: 60 },
  pollSession: { name: "poll-session", maximum: 30, windowSeconds: 60 },
} satisfies Record<string, Limit>

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32)
}

/**
 * Uses proxy-provided client IP headers and a coarse user-agent signal. Neither
 * is an authentication factor; combining them just makes one noisy client less
 * able to consume the allowance of everybody behind the same NAT.
 */
export function getAdminChatRequestKey(req: Request): string {
  const forwarded = req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown"
  const userAgent = req.headers.get("user-agent")?.slice(0, 200) || "unknown"
  return digest(`${forwarded}\n${userAgent}`)
}

export function getAdminChatSessionState(
  session: SessionTimes,
  now = Date.now()
): "active" | "expired" {
  const createdAt = Date.parse(session.created_at || "")
  const lastMessageAt = Date.parse(session.last_message_at || "")
  if (!Number.isFinite(createdAt)) return "expired"
  if (now - createdAt >= ADMIN_CHAT_ABSOLUTE_LIFETIME_MS) return "expired"
  const activityAt = Number.isFinite(lastMessageAt) ? lastMessageAt : createdAt
  return now - activityAt >= ADMIN_CHAT_IDLE_TIMEOUT_MS ? "expired" : "active"
}

function redisClient(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  })
}

function memoryCheck(key: string, limit: Limit) {
  const now = Date.now()
  const current = memoryLimits.get(key)
  if (!current || current.expiresAt <= now) {
    if (memoryLimits.size >= MAX_MEMORY_ENTRIES) {
      for (const [candidate, entry] of memoryLimits) {
        if (entry.expiresAt <= now) memoryLimits.delete(candidate)
      }
      if (memoryLimits.size >= MAX_MEMORY_ENTRIES) {
        const oldest = memoryLimits.keys().next().value
        if (oldest) memoryLimits.delete(oldest)
      }
    }
    memoryLimits.set(key, { count: 1, expiresAt: now + limit.windowSeconds * 1000 })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  current.count += 1
  return {
    allowed: current.count <= limit.maximum,
    retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)),
  }
}

async function check(keyPart: string, limit: Limit) {
  const key = `admin-chat:${limit.name}:${keyPart}`
  const redis = redisClient()
  if (!redis) return memoryCheck(key, limit)
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, limit.windowSeconds)
    const ttl = count > limit.maximum ? await redis.ttl(key) : 0
    return {
      allowed: count <= limit.maximum,
      retryAfterSeconds: ttl > 0 ? ttl : limit.windowSeconds,
    }
  } catch (error) {
    console.error("admin-chat rate limit Redis error:", error)
    return memoryCheck(key, limit)
  }
}

export async function checkAdminChatRateLimit(
  action: "start" | "send" | "poll",
  req: Request,
  sessionId?: string
) {
  const client = getAdminChatRequestKey(req)
  const checks = action === "start"
    ? [[client, LIMITS.start] as const]
    : action === "send"
      ? [[client, LIMITS.sendClient] as const, [digest(`${client}:${sessionId}`), LIMITS.sendSession] as const]
      : [[client, LIMITS.pollClient] as const, [digest(`${client}:${sessionId}`), LIMITS.pollSession] as const]

  for (const [key, limit] of checks) {
    const result = await check(key, limit)
    if (!result.allowed) return result
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, retryAfterSeconds)),
      "Cache-Control": "no-store",
    },
  })
}

export function clearAdminChatRateLimitsForTests() {
  memoryLimits.clear()
}