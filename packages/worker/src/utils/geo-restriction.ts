/**
 * Country allowlist for the VolleyKit CORS Proxy Worker.
 *
 * VolleyKit serves Swiss volleyball referees, so the proxy has no reason to be
 * reachable from the rest of the world. Restricting it by country cuts
 * drive-by scanning and calendar-code enumeration from abroad.
 *
 * This is defense in depth, not authentication: a VPN with an allowed exit
 * country passes the check.
 */

import { HttpStatus } from './constants'
import { errorResponse } from './error-response'

/** Message returned when the request comes from a country outside the allowlist */
const GEO_BLOCKED_MESSAGE = 'Forbidden: Not available in your region'

/**
 * Parse the ALLOWED_COUNTRIES env var into upper-case ISO 3166-1 alpha-2 codes.
 * An unset or empty value yields an empty list, which means "no restriction".
 */
export function parseAllowedCountries(allowedCountries: string | undefined): string[] {
  if (!allowedCountries) return []
  return allowedCountries
    .split(',')
    .map((country) => country.trim().toUpperCase())
    .filter(Boolean)
}

/**
 * Check a request's country against the allowlist.
 *
 * Fails closed: when a restriction is configured and the country is unknown
 * (Cloudflare could not geolocate the IP), the request is rejected.
 *
 * `country` is `request.cf.country`, which the Workers types leave untyped.
 */
export function isCountryAllowed(country: unknown, allowedCountries: string[]): boolean {
  if (allowedCountries.length === 0) return true
  if (typeof country !== 'string' || country === '') return false
  return allowedCountries.includes(country.toUpperCase())
}

/**
 * Build the 403 response for a geo-blocked request.
 * The request's Origin is echoed in the CORS headers so the web app can read
 * the status instead of seeing an opaque network error.
 */
export function geoBlockedResponse(request: Request): Response {
  const origin = request.headers.get('Origin') ?? undefined
  return errorResponse(HttpStatus.FORBIDDEN, GEO_BLOCKED_MESSAGE, origin)
}
