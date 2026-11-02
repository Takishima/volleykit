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
 * @param primary - VITE_API_PROXY_URL
 * @param fallbacksRaw - VITE_FALLBACK_PROXY_URLS, comma-separated
 */
export function parseProxyUrls(
  primary: string | undefined,
  fallbacksRaw: string | undefined
): string[] {
  const fallbacks = (fallbacksRaw ?? '').split(',').map((url) => url.trim())
  return [...new Set([(primary ?? '').trim(), ...fallbacks])].filter(Boolean)
}
