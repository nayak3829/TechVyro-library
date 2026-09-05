const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

type RequestOriginOptions = {
  checkSafeMethods?: boolean
}

function lastForwardedValue(value: string | null): string | null {
  const values = value?.split(",").map(part => part.trim()).filter(Boolean)
  return values?.at(-1) || null
}

function originFrom(protocol: string, host: string): string | null {
  if (protocol !== "http:" && protocol !== "https:") return null
  try {
    return new URL(`${protocol}//${host}`).origin
  } catch {
    return null
  }
}

/**
 * Rejects requests that browser headers prove did not originate from the
 * request URL's origin. Requests without browser origin metadata remain
 * allowed for non-browser clients and unit tests.
 */
export function isRequestOriginAllowed(
  request: Request,
  { checkSafeMethods = false }: RequestOriginOptions = {}
): boolean {
  if (!checkSafeMethods && SAFE_METHODS.has(request.method.toUpperCase())) {
    return true
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase()
  if (fetchSite === "cross-site" || fetchSite === "same-site") return false

  const origin = request.headers.get("origin")
  if (!origin) return true

  try {
    const suppliedOrigin = new URL(origin).origin
    const requestUrl = new URL(request.url)
    const allowedOrigins = new Set([requestUrl.origin])

    // Next may construct request.url with its internal hostname. The Host
    // header remains the canonical authority used by the browser.
    const host = request.headers.get("host")?.trim()
    if (host) {
      const hostOrigin = originFrom(requestUrl.protocol, host)
      if (hostOrigin) allowedOrigins.add(hostOrigin)
    }

    // At a trusted reverse proxy, the final forwarded values describe the
    // public authority/protocol even when Next sees an internal URL and Host.
    const forwardedHost = lastForwardedValue(request.headers.get("x-forwarded-host"))
    const forwardedProto = lastForwardedValue(request.headers.get("x-forwarded-proto"))
    const forwardedProtocol = forwardedProto ? `${forwardedProto.toLowerCase()}:` : null
    if (forwardedProtocol && host) {
      const forwardedHostOrigin = originFrom(forwardedProtocol, host)
      if (forwardedHostOrigin) allowedOrigins.add(forwardedHostOrigin)
    }
    if (forwardedProtocol && forwardedHost) {
      const forwardedOrigin = originFrom(forwardedProtocol, forwardedHost)
      if (forwardedOrigin) allowedOrigins.add(forwardedOrigin)
    }

    return allowedOrigins.has(suppliedOrigin)
  } catch {
    return false
  }
}