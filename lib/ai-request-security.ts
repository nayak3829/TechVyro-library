import { z } from "zod"

const MAX_DECLARED_BODY_BYTES = 32 * 1024

export class RequestBodyError extends Error {
  constructor(message: string, readonly status: 400 | 413 = 400) {
    super(message)
  }
}

export async function readBoundedJson(request: Request, maxBytes = MAX_DECLARED_BODY_BYTES): Promise<unknown> {
  const contentLength = request.headers.get("content-length")
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxBytes)) {
    throw new RequestBodyError("Request body is too large", 413)
  }

  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new RequestBodyError("Request body is too large", 413)
  }

  try {
    return JSON.parse(body)
  } catch {
    throw new RequestBodyError("Invalid JSON request body")
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  const timer = setTimeout(abort, timeoutMs)
  const requestSignal = init.signal
  requestSignal?.addEventListener("abort", abort, { once: true })

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
    requestSignal?.removeEventListener("abort", abort)
  }
}

type RateLimitEntry = { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateLimitEntry>()
const MAX_RATE_LIMIT_ENTRIES = 5_000

export function clientAddress(request: Request) {
  // This route is reachable without an authenticated proxy contract. Both of
  // these headers are caller-controlled in that situation, so using either as
  // an identity lets a client mint unlimited rate-limit buckets. A shared
  // anonymous bucket is deliberately conservative; deploy a trusted edge
  // identity source before changing this.
  void request
  return "anonymous"
}

export function checkRateLimit(key: string, limit = 12, windowMs = 60_000) {
  const now = Date.now()
  for (const [storedKey, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(storedKey)
  }
  const existing = rateLimitStore.get(key)
  if (!existing || existing.resetAt <= now) {
    if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
      const oldestKey = rateLimitStore.keys().next().value
      if (oldestKey) rateLimitStore.delete(oldestKey)
    }
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  existing.count += 1
  return {
    allowed: existing.count <= limit,
    retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}

export function resetRateLimitsForTests() {
  rateLimitStore.clear()
}

const textField = (max: number) => z.string().trim().min(1).max(max)

export const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: textField(4_000),
  }).strict()).min(1).max(16),
}).strict()

export const quizRequestSchema = z.object({
  topic: textField(300),
  category: z.string().trim().max(120).optional().default(""),
  count: z.coerce.number().int().min(1).max(20).optional().default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
}).strict()

export const summaryRequestSchema = z.object({
  title: textField(300),
  description: z.string().trim().max(4_000).optional().default(""),
  category: z.string().trim().max(120).optional().default(""),
}).strict()