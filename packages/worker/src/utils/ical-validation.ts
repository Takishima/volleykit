/**
 * iCal code validation for the VolleyKit CORS Proxy Worker.
 */

/**
 * Validate iCal referee code format.
 * Codes must be exactly 6 alphanumeric characters.
 */
export function isValidICalCode(code: string): boolean {
  return /^[A-Za-z0-9]{6}$/.test(code)
}

/**
 * Extract iCal referee code from path.
 * Matches paths like /iCal/referee/ABC123
 */
export function extractICalCode(pathname: string): string | null {
  const match = pathname.match(/^\/iCal\/referee\/([^/]+)$/)
  return match ? match[1] : null
}
