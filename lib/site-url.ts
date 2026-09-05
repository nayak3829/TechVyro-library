const PRODUCTION_ORIGIN = "https://www.techvyro.in"

/**
 * Returns the one trusted origin used for canonical URLs. Request headers are
 * deliberately not consulted, so forwarded/Host header values cannot leak
 * into metadata.
 */
export function getCanonicalOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configured) return PRODUCTION_ORIGIN

  try {
    const url = new URL(configured)
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    ) {
      return PRODUCTION_ORIGIN
    }
    return url.origin
  } catch {
    return PRODUCTION_ORIGIN
  }
}

export function canonicalUrl(path = "/"): string {
  return new URL(path, `${getCanonicalOrigin()}/`).toString()
}