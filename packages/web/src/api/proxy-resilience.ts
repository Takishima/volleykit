/**
 * Proxy URL failover for API resilience.
 *
 * Manages a list of proxy URLs and automatically rotates to the next one
 * when the current proxy becomes unreachable. The active URL is persisted
 * in localStorage so it survives page reloads.
 *
 * Fallback URLs are configured via VITE_FALLBACK_PROXY_URLS (comma-separated).
 */

const STORAGE_KEY = 'volleykit-active-proxy-url'
const FAILURE_COUNT_KEY = 'volleykit-proxy-failure-count'
const MAX_FAILURES_BEFORE_ROTATION = 3

/**
 * Build the ordered list of proxy URLs: primary + fallbacks.
 */
function getProxyUrls(): string[] {
  const primary = import.meta.env.VITE_API_PROXY_URL || ''
  const fallbacksRaw = import.meta.env.VITE_FALLBACK_PROXY_URLS || ''
  const fallbacks = fallbacksRaw
    .split(',')
    .map((u: string) => u.trim())
    .filter(Boolean)
  // Deduplicate while preserving order
  return [...new Set([primary, ...fallbacks])].filter(Boolean)
}

/**
 * Returns the currently active proxy base URL.
 *
 * Checks localStorage for a previously selected URL (from failover rotation).
 * Falls back to the primary URL if none is stored or the stored one is
 * no longer in the configured list.
 */
export function getApiBaseUrl(): string {
  const urls = getProxyUrls()
  if (urls.length === 0) return ''

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && urls.includes(stored)) {
      return stored
    }
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }

  return urls[0] ?? ''
}

/**
 * Report that a proxy URL failed to respond.
 *
 * After MAX_FAILURES_BEFORE_ROTATION consecutive failures on the same URL,
 * rotates to the next URL in the list. Returns true if a rotation occurred
 * (caller should retry the request).
 */
export function reportProxyFailure(): boolean {
  const urls = getProxyUrls()
  if (urls.length <= 1) return false

  const current = getApiBaseUrl()
  const currentIndex = urls.indexOf(current)

  try {
    const failureCount = Number(localStorage.getItem(FAILURE_COUNT_KEY) || '0') + 1

    if (failureCount < MAX_FAILURES_BEFORE_ROTATION) {
      localStorage.setItem(FAILURE_COUNT_KEY, String(failureCount))
      return false
    }

    // Rotate to next URL
    const nextIndex = (currentIndex + 1) % urls.length
    localStorage.setItem(STORAGE_KEY, urls[nextIndex] ?? '')
    localStorage.setItem(FAILURE_COUNT_KEY, '0')
    return true
  } catch {
    // localStorage unavailable
    return false
  }
}

/**
 * Report that a proxy URL responded successfully.
 * Resets the failure counter.
 */
export function reportProxySuccess(): void {
  try {
    const count = localStorage.getItem(FAILURE_COUNT_KEY)
    if (count && count !== '0') {
      localStorage.setItem(FAILURE_COUNT_KEY, '0')
    }
  } catch {
    // localStorage unavailable
  }
}
