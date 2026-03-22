/**
 * Standardized JSON error response helper for all worker handlers.
 *
 * Ensures consistent error response format across proxy, OCR, OJP, and iCal handlers.
 * All error responses use JSON format with security and CORS headers.
 */

import { corsHeaders, securityHeaders } from '../middleware'

/**
 * Create a standardized JSON error response.
 *
 * @param status - HTTP status code
 * @param message - Human-readable error message
 * @param origin - Origin for CORS headers (pass null for no CORS headers)
 */
export function errorResponse(status: number, message: string, origin?: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeaders(),
      ...(origin ? corsHeaders(origin) : {}),
    },
  })
}
