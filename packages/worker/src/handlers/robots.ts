import type { Env } from '../types'
import { securityHeaders } from '../middleware'

/**
 * Handle /robots.txt - prevent search engine indexing of the proxy.
 * This is placed before the kill switch so search engines can always fetch it.
 */
export async function handleRobots(_request: Request, _env: Env, _url: URL): Promise<Response> {
  return new Response('User-agent: *\nDisallow: /\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      ...securityHeaders(),
    },
  })
}
