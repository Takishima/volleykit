/**
 * MSW test utilities - main export point.
 *
 * @example
 * import { server, http, HttpResponse } from '@/test/msw'
 *
 * // Override a handler in a specific test
 * server.use(
 *   http.post('*\/api/assignments', () => {
 *     return HttpResponse.json({ items: [mockAssignment] })
 *   })
 * )
 */
export {
  server,
  http,
  HttpResponse,
  createHandlers,
  createErrorHandler,
  createHtmlRedirectHandler,
  createInvalidJsonHandler,
  defaultResponses,
} from './server'
