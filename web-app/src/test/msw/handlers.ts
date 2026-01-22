/**
 * MSW (Mock Service Worker) request handlers for API testing.
 *
 * These handlers intercept network requests at the network level, providing
 * more realistic testing than manual fetch mocking. This approach:
 * - Tests actual fetch calls through the network layer
 * - Catches serialization/deserialization bugs
 * - Works identically in browser DevTools for debugging
 * - Provides a single source of truth for API mocks
 *
 * @see https://mswjs.io/docs/getting-started
 */
import { http, HttpResponse } from 'msw'

// Default mock responses matching API schema
export const defaultResponses = {
  assignments: { items: [], totalItemsCount: 0 },
  compensations: { items: [], totalItemsCount: 0 },
  exchanges: { items: [], totalItemsCount: 0 },
  persons: { items: [], totalItemsCount: 0 },
  refereeBackups: { items: [], totalItemsCount: 0 },
  possibleNominations: { items: [], totalItemsCount: 0 },
  game: { game: { __identity: 'game-1' } },
  compensationDetails: { convocationCompensation: {} },
  assignmentDetails: {},
  associationSettings: {},
  activeSeason: {},
  fileResources: [{ __identity: 'res-1' }],
  nominationList: {},
  scoresheet: {},
}

// Type for handler configuration
export type MockResponseOverrides = Partial<typeof defaultResponses>

/**
 * Creates a set of MSW handlers with optional response overrides.
 *
 * @example
 * // Use default responses
 * const handlers = createHandlers()
 *
 * @example
 * // Override specific responses
 * const handlers = createHandlers({
 *   assignments: { items: [mockAssignment], totalItemsCount: 1 }
 * })
 */
export function createHandlers(overrides: MockResponseOverrides = {}) {
  const responses = { ...defaultResponses, ...overrides }

  return [
    // Assignments
    http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
      return HttpResponse.json(responses.assignments)
    }),

    http.get('*/api%5crefereeconvocation/showWithNestedObjects', () => {
      return HttpResponse.json(responses.assignmentDetails)
    }),

    // Compensations
    http.post('*/api%5crefereeconvocationcompensation/search', () => {
      return HttpResponse.json(responses.compensations)
    }),

    http.get('*/api%5cconvocationcompensation/showWithNestedObjects', () => {
      return HttpResponse.json(responses.compensationDetails)
    }),

    http.put('*/api%5cconvocationcompensation', () => {
      return HttpResponse.json({})
    }),

    // Exchanges
    http.post('*/api%5crefereegameexchange/search', () => {
      return HttpResponse.json(responses.exchanges)
    }),

    http.put('*/api%5crefereegameexchange', () => {
      return HttpResponse.json({})
    }),

    // Person search
    http.get('*/api%5celasticsearchperson/search', () => {
      return HttpResponse.json(responses.persons)
    }),

    // Settings
    http.get('*/api%5crefereeassociationsettings/getRefereeAssociationSettingsOfActiveParty', () => {
      return HttpResponse.json(responses.associationSettings)
    }),

    http.get('*/api%5cindoorseason/getActiveIndoorSeason', () => {
      return HttpResponse.json(responses.activeSeason)
    }),

    // Game and validation
    http.get('*/api%5cgame/showWithNestedObjects', () => {
      return HttpResponse.json(responses.game)
    }),

    // Nominations
    http.post('*/api%5cnominationlist/getPossibleIndoorPlayerNominationsForNominationList', () => {
      return HttpResponse.json(responses.possibleNominations)
    }),

    http.put('*/api%5cnominationlist', () => {
      return HttpResponse.json(responses.nominationList)
    }),

    http.post('*/api%5cnominationlist/finalize', () => {
      return HttpResponse.json(responses.nominationList)
    }),

    // Scoresheet
    http.put('*/api%5cscoresheet', () => {
      return HttpResponse.json(responses.scoresheet)
    }),

    http.post('*/api%5cscoresheet/finalize', () => {
      return HttpResponse.json(responses.scoresheet)
    }),

    // File upload
    http.post('*/api%5cpersistentresource/upload', () => {
      return HttpResponse.json(responses.fileResources)
    }),

    // Role switching
    http.put('*/api%5cparty/switchRoleAndAttribute', () => {
      return HttpResponse.json({})
    }),

    // Referee backups
    http.post('*/api%5crefereeconvocationrefereebackup/search', () => {
      return HttpResponse.json(responses.refereeBackups)
    }),
  ]
}

// Default handlers for general use
export const handlers = createHandlers()

/**
 * Creates an error response handler for testing error scenarios.
 * Usage: server.use(createErrorHandler('pattern', 500, 'Internal Server Error'))
 */
export function createErrorHandler(
  path: string,
  status: number,
  statusText: string,
  method: 'get' | 'post' | 'put' | 'delete' = 'post'
) {
  const httpMethod = http[method]
  return httpMethod(path, () => {
    return new HttpResponse(null, { status, statusText })
  })
}

/**
 * Creates a handler that returns HTML (simulating session expiry redirect).
 */
export function createHtmlRedirectHandler(path: string, redirectUrl: string) {
  return http.post(path, () => {
    return new HttpResponse('<html><body>Login</body></html>', {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'X-Final-URL': redirectUrl,
      },
    })
  })
}

/**
 * Creates a handler that returns invalid JSON (for testing parse errors).
 */
export function createInvalidJsonHandler(path: string) {
  return http.post(path, () => {
    return new HttpResponse('not valid json {{{', {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })
}
