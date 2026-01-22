/**
 * MSW server configuration for Node.js test environment.
 *
 * This server intercepts all network requests during tests,
 * providing consistent API mocking without manual fetch stubbing.
 *
 * @example
 * // In test setup (setup.ts)
 * import { server } from './msw/server'
 *
 * beforeAll(() => server.listen())
 * afterEach(() => server.resetHandlers())
 * afterAll(() => server.close())
 *
 * @example
 * // Override handlers in specific tests
 * import { server } from '@/test/msw/server'
 * import { http, HttpResponse } from 'msw'
 *
 * it('handles error response', async () => {
 *   server.use(
 *     http.post('*\/api%5crefereeconvocation/*', () => {
 *       return new HttpResponse(null, { status: 500 })
 *     })
 *   )
 *   // ... test error handling
 * })
 */
import { setupServer } from 'msw/node'

import { handlers } from './handlers'

// Create the server instance with default handlers
export const server = setupServer(...handlers)

// Re-export utilities for convenient test imports
export { http, HttpResponse } from 'msw'
export {
  createHandlers,
  createErrorHandler,
  createHtmlRedirectHandler,
  createInvalidJsonHandler,
  defaultResponses,
} from './handlers'
