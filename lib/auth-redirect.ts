const INTERNAL_ORIGIN = "https://techvyro.invalid"

/**
 * Accept only a well-formed, same-origin path. This is deliberately stricter
 * than `startsWith("/")`: protocol-relative and backslash URLs can otherwise
 * be interpreted as external redirects by browsers.
 */
export function safeInternalPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/"
  }

  try {
    const decoded = decodeURIComponent(value)
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.startsWith("/\\") ||
      /[\u0000-\u001f\u007f]/.test(decoded)
    ) {
      return "/"
    }

    const parsed = new URL(value, INTERNAL_ORIGIN)
    return parsed.origin === INTERNAL_ORIGIN
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/"
  } catch {
    return "/"
  }
}

export function loginHref(destination: string): string {
  const redirect = safeInternalPath(destination)
  return redirect === "/" ? "/login" : `/login?redirect=${encodeURIComponent(redirect)}`
}