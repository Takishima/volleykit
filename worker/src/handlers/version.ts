import type { Env } from '../types'
import { corsHeaders, securityHeaders, validateOriginAndPreflight } from '../middleware'

/**
 * Handle /version - returns worker git hash for PWA version tracking.
 * The web app compares this against its stored worker version to determine
 * if session tokens need to be invalidated (worker auth logic changed).
 * This endpoint is public and includes CORS headers for browser access.
 */
export async function handleVersion(request: Request, env: Env, _url: URL): Promise<Response> {
  const check = validateOriginAndPreflight(request, env)
  if (check.response) return check.response

  // Return worker version info
  // __WORKER_GIT_HASH__ is injected at deploy time via wrangler --define
  const workerGitHash = typeof __WORKER_GIT_HASH__ !== 'undefined' ? __WORKER_GIT_HASH__ : 'dev'
  return new Response(
    JSON.stringify({
      workerGitHash,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache for 5 minutes - version doesn't change within a deployment
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders(check.origin),
        ...securityHeaders(),
      },
    }
  )
}
