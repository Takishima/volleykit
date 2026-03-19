/**
 * Type augmentation for Headers.getSetCookie()
 *
 * The getSetCookie() method is part of the modern Fetch API and is available
 * in Cloudflare Workers runtime. It returns an array of Set-Cookie header values,
 * unlike get('Set-Cookie') which only returns the first one.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Headers/getSetCookie
 */

import type { AuthLockoutKV } from './utils'

// Helper type to access getSetCookie on Headers instances
export type HeadersWithCookies = Headers & {
  getSetCookie(): string[]
}

/**
 * Cloudflare Rate Limiter binding interface.
 * @see https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface Env {
  ALLOWED_ORIGINS: string
  TARGET_HOST: string
  RATE_LIMITER: RateLimiter
  KILL_SWITCH?: string // Set to "true" to disable the proxy
  MISTRAL_API_KEY?: string // API key for Mistral OCR
  OJP_API_KEY?: string // API key for Swiss public transport OJP 2.0 API
  AUTH_LOCKOUT?: AuthLockoutKV // KV namespace for auth lockout state
}

/**
 * Worker git hash injected at deploy time via `wrangler deploy --define`.
 * Used for version tracking - the web app checks this to determine if
 * session tokens need to be invalidated (worker auth logic changed).
 */
declare global {
  const __WORKER_GIT_HASH__: string
}
