/**
 * Proxy URL list shared by the runtime failover (proxy-resilience.ts) and the
 * build-time service worker cache pattern / CSP allowlist (vite.config.ts), so
 * every consumer agrees on which proxies the client may talk to.
 *
 * Pure function: callers pass the raw env values (`import.meta.env` at runtime,
 * `process.env` at build time) so this module has no environment dependency.
 */

/**
 * Build the ordered, deduplicated proxy URL list: primary first, then fallbacks.
 *
 * Validates each entry once here so every consumer sees the same list; an
 * unparseable value fails the build (and the test run) with the env name and
 * value instead of a bare `TypeError: Invalid URL` deep inside a consumer.
 *
 * @param primary - VITE_API_PROXY_URL
 * @param fallbacksRaw - VITE_FALLBACK_PROXY_URLS, comma-separated
 */
export function parseProxyUrls(
  primary: string | undefined,
  fallbacksRaw: string | undefined
): string[] {
  const fallbacks = (fallbacksRaw ?? '').split(',').map((url) => url.trim())
  const urls = [...new Set([(primary ?? '').trim(), ...fallbacks])].filter(Boolean)
  const invalid = urls.find((url) => !URL.canParse(url))
  if (invalid !== undefined) {
    throw new Error(
      `Invalid proxy URL "${invalid}" in VITE_API_PROXY_URL or VITE_FALLBACK_PROXY_URLS`
    )
  }
  return urls
}
