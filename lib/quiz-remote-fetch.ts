import { lookup } from "dns/promises"
import { isIP } from "net"
import platformsData from "@/lib/appx-platforms.json"

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
}

interface PlatformConfiguration {
  api: string
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.$/, "")
}

const TRUSTED_API_HOSTS = new Set(
  (platformsData as PlatformConfiguration[]).map(({ api }) => {
    const url = new URL(api)
    if (url.protocol !== "https:") {
      throw new Error(`Configured platform API must use HTTPS: ${api}`)
    }
    return normalizeHostname(url.hostname)
  })
)

export function isTrustedQuizApiHostname(hostname: string): boolean {
  return TRUSTED_API_HOSTS.has(normalizeHostname(hostname))
}

function isPrivateIp(address: string): boolean {
  const version = isIP(address)
  if (version === 4) {
    const [a, b] = address.split(".").map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    )
  }

  if (version === 6) {
    const ip = address.toLowerCase()
    const mappedIpv4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return (
      ip === "::" ||
      ip === "::1" ||
      ip.startsWith("fc") ||
      ip.startsWith("fd") ||
      ip.startsWith("fe8") ||
      ip.startsWith("fe9") ||
      ip.startsWith("fea") ||
      ip.startsWith("feb") ||
      (mappedIpv4 !== null && isPrivateIp(mappedIpv4[1]))
    )
  }

  return true
}

export async function validatePublicHttpsUrl(value: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("Invalid API URL")
  }

  if (url.protocol !== "https:") throw new Error("API URL must use HTTPS")
  if (url.username || url.password) throw new Error("API URL credentials are not allowed")
  if (url.port) throw new Error("API URL must use the standard HTTPS port")
  if (!url.hostname) throw new Error("Invalid API host")

  const hostname = url.hostname.replace(/^\[|\]$/g, "")
  if (isIP(hostname)) throw new Error("IP address hosts are not allowed")
  if (!isTrustedQuizApiHostname(hostname)) {
    throw new Error("API host is not an approved quiz platform")
  }

  let addresses: { address: string }[]
  try {
    addresses = await lookup(hostname, { all: true })
  } catch {
    throw new Error("API host could not be resolved")
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new Error("Private network hosts are not allowed")
  }

  return url
}

export async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  try {
    let nextUrl = await validatePublicHttpsUrl(url)
    for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
      const res = await fetch(nextUrl, {
        headers: HEADERS,
        signal: controller.signal,
        redirect: "manual",
      })
      if (![301, 302, 303, 307, 308].includes(res.status)) return res

      const location = res.headers.get("location")
      if (!location || redirectCount === 3) {
        throw new Error("Invalid redirect from API host")
      }
      await res.body?.cancel()
      nextUrl = await validatePublicHttpsUrl(new URL(location, nextUrl).toString())
    }
    throw new Error("Too many redirects")
  } finally {
    clearTimeout(id)
  }
}