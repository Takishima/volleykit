import type { Env } from '../types'
import { corsHeaders, securityHeaders, validateOriginAndPreflight } from '../middleware'

/**
 * Handle /health - no authentication needed, no rate limiting.
 * Requires CORS headers for browser-based health checks (e.g., OCR availability check).
 * Verifies Mistral OCR API connectivity by calling /v1/models endpoint.
 */
export async function handleHealth(request: Request, env: Env, _url: URL): Promise<Response> {
  const check = validateOriginAndPreflight(request, env)
  if (check.response) return check.response

  // Check Mistral API connectivity if API key is configured
  // Uses /v1/models endpoint as a lightweight health check (no token consumption)
  // Timeout after 5 seconds to prevent health check from hanging
  const HEALTH_CHECK_TIMEOUT_MS = 5000
  let mistralStatus: 'ok' | 'not_configured' | 'error' = 'not_configured'
  let mistralError: string | undefined

  if (env.MISTRAL_API_KEY) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)

    try {
      const mistralResponse = await fetch('https://api.mistral.ai/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
        },
        signal: controller.signal,
      })

      if (mistralResponse.ok) {
        mistralStatus = 'ok'
      } else {
        mistralStatus = 'error'
        mistralError =
          mistralResponse.status === 401
            ? 'Invalid API key'
            : `API returned ${mistralResponse.status}`
      }
    } catch (error) {
      mistralStatus = 'error'
      if (error instanceof Error && error.name === 'AbortError') {
        mistralError = 'Health check timed out'
      } else {
        mistralError = error instanceof Error ? error.message : 'Connection failed'
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  const overallStatus = mistralStatus === 'ok' ? 'ok' : 'degraded'

  return new Response(
    JSON.stringify({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        proxy: 'ok',
        mistral_ocr: mistralStatus,
        ...(mistralError && { mistral_ocr_error: mistralError }),
      },
    }),
    {
      status: overallStatus === 'ok' ? 200 : 503,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(check.origin),
        ...securityHeaders(),
      },
    }
  )
}
