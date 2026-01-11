import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { api, setCsrfToken, clearSession } from './client'

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper to create mock response with headers
function createMockResponse(
  data: unknown,
  options: {
    ok?: boolean
    status?: number
    statusText?: string
    contentType?: string
    url?: string
  } = {}
) {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    contentType = 'application/json',
    url = 'https://example.com/api/endpoint',
  } = options
  return {
    ok,
    status,
    statusText,
    url,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
    json: () => Promise.resolve(data),
  }
}

// Valid mock response structures that pass Zod validation
const mockAssignmentsResponse = { items: [], totalItemsCount: 0 }
const mockCompensationsResponse = { items: [], totalItemsCount: 0 }
const mockExchangesResponse = { items: [], totalItemsCount: 0 }

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearSession()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('setCsrfToken / clearSession', () => {
    it('setCsrfToken stores token for use in requests', async () => {
      setCsrfToken('test-token-123')

      mockFetch.mockResolvedValueOnce(createMockResponse(mockAssignmentsResponse))

      await api.searchAssignments({})

      // Check that CSRF token was included in the request
      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('__csrfToken')).toBe('test-token-123')
    })

    it('clearSession removes CSRF token', async () => {
      setCsrfToken('test-token')
      clearSession()

      mockFetch.mockResolvedValueOnce(createMockResponse(mockAssignmentsResponse))

      await api.searchAssignments({})

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('__csrfToken')).toBeNull()
    })
  })

  describe('error handling', () => {
    it('throws error on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null,
        },
        text: () => Promise.resolve(''),
      })

      await expect(api.searchAssignments({})).rejects.toThrow('500 Internal Server Error')
    })

    it('clears session and throws on 401 response', async () => {
      setCsrfToken('some-token')

      mockFetch.mockResolvedValueOnce(
        createMockResponse({}, { ok: false, status: 401, statusText: 'Unauthorized' })
      )

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('clears session and throws on 403 response', async () => {
      setCsrfToken('some-token')

      mockFetch.mockResolvedValueOnce(
        createMockResponse({}, { ok: false, status: 403, statusText: 'Forbidden' })
      )

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('clears session and throws on 406 response', async () => {
      setCsrfToken('some-token')

      mockFetch.mockResolvedValueOnce(
        createMockResponse({}, { ok: false, status: 406, statusText: 'Not Acceptable' })
      )

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('throws error on invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type' ? 'application/json' : null,
        },
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      })

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Invalid JSON response (Content-Type: application/json, status: 200)'
      )
    })

    it('treats HTML response as stale session when redirected to login page', async () => {
      // When session expires, SwissVolley API returns HTML login page with status 200
      // instead of a proper 401. We detect this by checking Content-Type and URL
      // after JSON parsing fails.
      setCsrfToken('some-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://example.com/login',
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type' ? 'text/html; charset=UTF-8' : null,
        },
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      })

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('does not treat HTML response as stale session if not a login page', async () => {
      // HTML responses from non-login URLs should be treated as API errors,
      // not auth failures - this prevents false positives on valid sessions.
      setCsrfToken('some-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://example.com/api/assignments',
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type' ? 'text/html; charset=UTF-8' : null,
        },
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      })

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Invalid JSON response (Content-Type: text/html; charset=UTF-8, status: 200)'
      )
    })

    it('does not treat HTML response as stale session for login-like paths', async () => {
      // Paths like /api/v2/login-history or /user/login-preferences should NOT
      // be treated as login page redirects - only exact /login matches should.
      setCsrfToken('some-token')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://example.com/api/v2/login-history',
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type' ? 'text/html; charset=UTF-8' : null,
        },
        json: () => Promise.reject(new SyntaxError('Unexpected token <')),
      })

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Invalid JSON response (Content-Type: text/html; charset=UTF-8, status: 200)'
      )
    })

    it('accepts JSON response with incorrect Content-Type header', async () => {
      // VolleyManager API sometimes returns JSON with Content-Type: text/html
      // We should parse it successfully instead of rejecting based on Content-Type
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://example.com/api/endpoint',
        headers: {
          get: (name: string) =>
            name.toLowerCase() === 'content-type' ? 'text/html; charset=UTF-8' : null,
        },
        json: () => Promise.resolve(mockAssignmentsResponse),
      })

      const result = await api.searchAssignments({})
      expect(result).toEqual(mockAssignmentsResponse)
    })
  })

  describe('searchAssignments', () => {
    it('sends POST request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockAssignmentsResponse))

      await api.searchAssignments({})

      // Note: backslash in path is required by Neos/Flow backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/indoorvolleyball.refadmin/api%5crefereeconvocation/searchMyRefereeConvocations'
        ),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )
    })

    it('uses pre-encoded %5c in URL paths (not literal backslash)', async () => {
      // This test prevents regression to literal backslashes which browsers don't encode
      mockFetch.mockResolvedValueOnce(createMockResponse(mockAssignmentsResponse))

      await api.searchAssignments({})

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('%5c')
      // Verify no literal backslash in the URL
      expect(url).not.toMatch(/api\\/)
    })

    it('includes search configuration in request', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockAssignmentsResponse))

      await api.searchAssignments({
        offset: 0,
        limit: 10,
      })

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('searchConfiguration[offset]')).toBe('0')
      expect(body.get('searchConfiguration[limit]')).toBe('10')
    })

    it('includes propertyRenderConfiguration in request', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockAssignmentsResponse))

      await api.searchAssignments({})

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams

      // Verify key properties are included
      expect(body.get('propertyRenderConfiguration[0]')).toBe('refereeConvocationStatus')
      // refereePosition is at index 12 in the array
      expect(body.get('propertyRenderConfiguration[12]')).toBe('refereePosition')
      // Verify hall info is included
      expect(body.get('propertyRenderConfiguration[26]')).toBe('refereeGame.game.hall.name')
    })
  })

  describe('searchCompensations', () => {
    it('sends POST request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockCompensationsResponse))

      await api.searchCompensations({})

      // Note: backslash in path is required by Neos/Flow backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/indoorvolleyball.refadmin/api%5crefereeconvocationcompensation/search'
        ),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('getCompensationDetails', () => {
    it('sends GET request to showWithNestedObjects endpoint', async () => {
      const mockDetailsResponse = {
        convocationCompensation: {
          __identity: 'comp-123',
          distanceInMetres: 48000,
          correctionReason: 'Test reason',
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDetailsResponse))

      await api.getCompensationDetails('comp-123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/indoorvolleyball.refadmin/api%5cconvocationcompensation/showWithNestedObjects'
        ),
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('includes compensation ID in query parameters', async () => {
      const mockDetailsResponse = { convocationCompensation: {} }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDetailsResponse))

      await api.getCompensationDetails('test-comp-id')

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('convocationCompensation%5B__identity%5D=test-comp-id')
    })

    it('requests correctionReason and distance properties', async () => {
      const mockDetailsResponse = { convocationCompensation: {} }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDetailsResponse))

      await api.getCompensationDetails('comp-123')

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('propertyRenderConfiguration')
      expect(url).toContain('correctionReason')
      expect(url).toContain('distanceInMetres')
    })

    it('returns detailed compensation data', async () => {
      const mockDetailsResponse = {
        convocationCompensation: {
          __identity: 'comp-123',
          distanceInMetres: 48000,
          distanceFormatted: '48.0',
          correctionReason: 'Ich wohne in Oberengstringen',
        },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse(mockDetailsResponse))

      const result = await api.getCompensationDetails('comp-123')

      expect(result.convocationCompensation?.distanceInMetres).toBe(48000)
      expect(result.convocationCompensation?.correctionReason).toBe('Ich wohne in Oberengstringen')
    })
  })

  describe('updateCompensation', () => {
    it('sends PUT request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateCompensation('comp-123', { distanceInMetres: 50000 })

      // Note: backslash in path is required by Neos/Flow backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/indoorvolleyball.refadmin/api%5cconvocationcompensation'),
        expect.objectContaining({ method: 'PUT' })
      )
    })

    it('includes compensation ID nested in convocationCompensation', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateCompensation('comp-456', { distanceInMetres: 60000 })

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      // __identity must be nested inside convocationCompensation per API requirements
      expect(body.get('convocationCompensation[__identity]')).toBe('comp-456')
    })

    it('includes distanceInMetres in nested convocationCompensation object', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateCompensation('comp-789', { distanceInMetres: 75000 })

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('convocationCompensation[distanceInMetres]')).toBe('75000')
    })

    it('includes correctionReason in nested convocationCompensation object', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateCompensation('comp-abc', {
        correctionReason: 'Umweg wegen Baustelle',
      })

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('convocationCompensation[correctionReason]')).toBe('Umweg wegen Baustelle')
    })

    it('includes both distanceInMetres and correctionReason when provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateCompensation('comp-xyz', {
        distanceInMetres: 88000,
        correctionReason: 'Alternative route',
      })

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('convocationCompensation[distanceInMetres]')).toBe('88000')
      expect(body.get('convocationCompensation[correctionReason]')).toBe('Alternative route')
    })
  })

  describe('searchExchanges', () => {
    it('sends POST request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockExchangesResponse))

      await api.searchExchanges({})

      // Note: backslash in path is required by Neos/Flow backend
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/indoorvolleyball.refadmin/api%5crefereegameexchange/search'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('applyForExchange', () => {
    it('sends PUT request with __identity and apply=1 per OpenAPI spec', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.applyForExchange('exchange-123')

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.method).toBe('PUT')
      const body = options.body as URLSearchParams
      expect(body.get('__identity')).toBe('exchange-123')
      expect(body.get('apply')).toBe('1')
    })
  })

  describe('withdrawFromExchange', () => {
    it('sends PUT request with __identity and withdrawApplication=1 per OpenAPI spec', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.withdrawFromExchange('exchange-456')

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.method).toBe('PUT')
      const body = options.body as URLSearchParams
      expect(body.get('__identity')).toBe('exchange-456')
      expect(body.get('withdrawApplication')).toBe('1')
    })
  })

  describe('searchPersons', () => {
    const mockPersonSearchResponse = { items: [], totalItemsCount: 0 }

    // Helper to extract query params from fetch URL
    function getQueryParams(): URLSearchParams {
      const [url] = mockFetch.mock.calls[0]!
      // URL is relative, so use a base URL to parse it
      const urlObj = new URL(url as string, 'https://example.com')
      return urlObj.searchParams
    }

    it('uses GET method for person search', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ lastName: 'müller' })

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.method).toBe('GET')
      expect(options.body).toBeUndefined()
    })

    it('does not include CSRF token in GET request URL', async () => {
      // CSRF tokens in URLs can leak through browser history, server logs,
      // referer headers, and proxy logs - only include for state-changing methods
      setCsrfToken('test-csrf-token')

      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ lastName: 'müller' })

      const params = getQueryParams()
      expect(params.get('__csrfToken')).toBeNull()

      // Clean up
      setCsrfToken(null)
    })

    it('uses default limit when not specified', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ lastName: 'müller' })

      const params = getQueryParams()
      expect(params.get('searchConfiguration[limit]')).toBe('50')
    })

    it('respects custom limit when provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ lastName: 'müller' }, { limit: 100 })

      const params = getQueryParams()
      expect(params.get('searchConfiguration[limit]')).toBe('100')
    })

    it('sends lastName-only search to both firstName and lastName for OR matching', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ lastName: 'müller' })

      const params = getQueryParams()

      // Single term should be sent to both firstName and lastName
      expect(params.get('searchConfiguration[propertyFilters][0][propertyName]')).toBe('firstName')
      expect(params.get('searchConfiguration[propertyFilters][0][text]')).toBe('müller')
      expect(params.get('searchConfiguration[propertyFilters][1][propertyName]')).toBe('lastName')
      expect(params.get('searchConfiguration[propertyFilters][1][text]')).toBe('müller')
    })

    it('sends firstName-only search to both firstName and lastName for OR matching', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ firstName: 'hans' })

      const params = getQueryParams()

      // Single term should be sent to both firstName and lastName
      expect(params.get('searchConfiguration[propertyFilters][0][propertyName]')).toBe('firstName')
      expect(params.get('searchConfiguration[propertyFilters][0][text]')).toBe('hans')
      expect(params.get('searchConfiguration[propertyFilters][1][propertyName]')).toBe('lastName')
      expect(params.get('searchConfiguration[propertyFilters][1][text]')).toBe('hans')
    })

    it('sends two-term search to separate firstName and lastName fields', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ firstName: 'hans', lastName: 'müller' })

      const params = getQueryParams()

      // Two terms should be sent to their respective fields
      expect(params.get('searchConfiguration[propertyFilters][0][propertyName]')).toBe('firstName')
      expect(params.get('searchConfiguration[propertyFilters][0][text]')).toBe('hans')
      expect(params.get('searchConfiguration[propertyFilters][1][propertyName]')).toBe('lastName')
      expect(params.get('searchConfiguration[propertyFilters][1][text]')).toBe('müller')
    })

    it('includes yearOfBirth filter when provided with single-term search', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ lastName: 'müller', yearOfBirth: '1985' })

      const params = getQueryParams()

      // Single term + year: firstName, lastName, yearOfBirth
      expect(params.get('searchConfiguration[propertyFilters][0][propertyName]')).toBe('firstName')
      expect(params.get('searchConfiguration[propertyFilters][0][text]')).toBe('müller')
      expect(params.get('searchConfiguration[propertyFilters][1][propertyName]')).toBe('lastName')
      expect(params.get('searchConfiguration[propertyFilters][1][text]')).toBe('müller')
      expect(params.get('searchConfiguration[propertyFilters][2][propertyName]')).toBe(
        'yearOfBirth'
      )
      expect(params.get('searchConfiguration[propertyFilters][2][text]')).toBe('1985')
    })

    it('includes yearOfBirth filter when provided with two-term search', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ firstName: 'hans', lastName: 'müller', yearOfBirth: '1985' })

      const params = getQueryParams()

      // Two terms + year: firstName, lastName, yearOfBirth
      expect(params.get('searchConfiguration[propertyFilters][0][propertyName]')).toBe('firstName')
      expect(params.get('searchConfiguration[propertyFilters][0][text]')).toBe('hans')
      expect(params.get('searchConfiguration[propertyFilters][1][propertyName]')).toBe('lastName')
      expect(params.get('searchConfiguration[propertyFilters][1][text]')).toBe('müller')
      expect(params.get('searchConfiguration[propertyFilters][2][propertyName]')).toBe(
        'yearOfBirth'
      )
      expect(params.get('searchConfiguration[propertyFilters][2][text]')).toBe('1985')
    })

    it('requests all required properties for displaying search results', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockPersonSearchResponse))

      await api.searchPersons({ lastName: 'test' })

      const params = getQueryParams()

      // These properties are required for ScorerResultsList to display results properly.
      // Missing properties will cause search results to appear empty.
      const requiredProperties = [
        'displayName',
        'firstName',
        'lastName',
        'associationId',
        'birthday',
        'gender',
      ]

      requiredProperties.forEach((prop, index) => {
        expect(params.get(`propertyRenderConfiguration[${index}]`)).toBe(prop)
      })
    })
  })

  describe('request headers', () => {
    it('includes Accept: application/json header', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockAssignmentsResponse))

      await api.searchAssignments({})

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.headers.Accept).toBe('application/json')
    })

    it('includes credentials: include for cookies', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockAssignmentsResponse))

      await api.searchAssignments({})

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.credentials).toBe('include')
    })
  })

  describe('uploadResource', () => {
    function createMockFile(name: string, type: string, size: number = 1024): File {
      const content = new Uint8Array(size)
      return new File([content], name, { type })
    }

    it('rejects invalid file types', async () => {
      const invalidFile = createMockFile('test.txt', 'text/plain')

      await expect(api.uploadResource(invalidFile)).rejects.toThrow(
        'Invalid file type: text/plain. Only JPEG, PNG, or PDF files are allowed.'
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('rejects files with unknown type', async () => {
      const noTypeFile = createMockFile('test', '')

      await expect(api.uploadResource(noTypeFile)).rejects.toThrow(
        'Invalid file type: unknown. Only JPEG, PNG, or PDF files are allowed.'
      )
    })

    it('rejects files larger than 10MB', async () => {
      const largeFile = createMockFile('large.pdf', 'application/pdf', 11 * 1024 * 1024)

      await expect(api.uploadResource(largeFile)).rejects.toThrow(
        'File too large: 11.0 MB. Maximum size is 10 MB.'
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('accepts PDF files', async () => {
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      mockFetch.mockResolvedValueOnce(createMockResponse([{ __identity: 'res-1' }]))

      await api.uploadResource(pdfFile)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('accepts JPEG files', async () => {
      const jpegFile = createMockFile('photo.jpg', 'image/jpeg')
      mockFetch.mockResolvedValueOnce(createMockResponse([{ __identity: 'res-1' }]))

      await api.uploadResource(jpegFile)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('accepts PNG files', async () => {
      const pngFile = createMockFile('image.png', 'image/png')
      mockFetch.mockResolvedValueOnce(createMockResponse([{ __identity: 'res-1' }]))

      await api.uploadResource(pngFile)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('sends POST request with FormData', async () => {
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      mockFetch.mockResolvedValueOnce(createMockResponse([{ __identity: 'res-1' }]))

      await api.uploadResource(pdfFile)

      const [url, options] = mockFetch.mock.calls[0]!
      expect(url).toContain('persistentresource/upload')
      expect(options.method).toBe('POST')
      expect(options.body).toBeInstanceOf(FormData)
      expect(options.credentials).toBe('include')
    })

    it('includes CSRF token in FormData when available', async () => {
      setCsrfToken('upload-csrf-token')
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      mockFetch.mockResolvedValueOnce(createMockResponse([{ __identity: 'res-1' }]))

      await api.uploadResource(pdfFile)

      const [, options] = mockFetch.mock.calls[0]!
      const formData = options.body as FormData
      expect(formData.get('__csrfToken')).toBe('upload-csrf-token')
    })

    it('does not include CSRF token when not set', async () => {
      clearSession()
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      mockFetch.mockResolvedValueOnce(createMockResponse([{ __identity: 'res-1' }]))

      await api.uploadResource(pdfFile)

      const [, options] = mockFetch.mock.calls[0]!
      const formData = options.body as FormData
      expect(formData.get('__csrfToken')).toBeNull()
    })

    it('returns file resources array on success', async () => {
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      const expectedResponse = [{ __identity: 'res-123', filename: 'doc.pdf' }]
      mockFetch.mockResolvedValueOnce(createMockResponse(expectedResponse))

      const result = await api.uploadResource(pdfFile)

      expect(result).toEqual(expectedResponse)
    })

    it('clears session and throws on 401 response', async () => {
      setCsrfToken('some-token')
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: () => null },
        text: () => Promise.resolve(''),
      })

      await expect(api.uploadResource(pdfFile)).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('clears session and throws on 403 response', async () => {
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: { get: () => null },
        text: () => Promise.resolve(''),
      })

      await expect(api.uploadResource(pdfFile)).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('throws error with parsed message on other failures', async () => {
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => null },
        text: () => Promise.resolve(''),
      })

      await expect(api.uploadResource(pdfFile)).rejects.toThrow(
        /POST.*persistentresource\/upload.*500 Internal Server Error/
      )
    })
  })

  describe('getAssignmentDetails', () => {
    it('sends GET request with convocation ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.getAssignmentDetails('conv-123', ['refereeGame.game'])

      const [url, options] = mockFetch.mock.calls[0]!
      expect(options.method).toBe('GET')
      expect(url).toContain('convocation=conv-123')
    })

    it('includes nested property names in query', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.getAssignmentDetails('conv-123', ['prop1', 'prop2', 'prop3'])

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('nestedPropertyNames%5B0%5D=prop1')
      expect(url).toContain('nestedPropertyNames%5B1%5D=prop2')
      expect(url).toContain('nestedPropertyNames%5B2%5D=prop3')
    })
  })

  describe('getPossiblePlayerNominations', () => {
    it('sends POST request with nomination list ID', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ items: [], totalItemsCount: 0 }))

      await api.getPossiblePlayerNominations('nl-123')

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.method).toBe('POST')
      const body = options.body as URLSearchParams
      expect(body.get('nominationList')).toBe('nl-123')
    })

    it('uses default options when not specified', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ items: [], totalItemsCount: 0 }))

      await api.getPossiblePlayerNominations('nl-123')

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('onlyFromMyTeam')).toBe('true')
      expect(body.get('onlyRelevantGender')).toBe('true')
    })

    it('respects custom options', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ items: [], totalItemsCount: 0 }))

      await api.getPossiblePlayerNominations('nl-123', {
        onlyFromMyTeam: false,
        onlyRelevantGender: false,
      })

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('onlyFromMyTeam')).toBe('false')
      expect(body.get('onlyRelevantGender')).toBe('false')
    })
  })

  describe('updateNominationList', () => {
    it('sends PUT request with all required fields', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateNominationList('nl-1', 'game-1', 'team-1', ['player-1', 'player-2'])

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.method).toBe('PUT')
      const body = options.body as URLSearchParams
      expect(body.get('nominationList[__identity]')).toBe('nl-1')
      expect(body.get('nominationList[game][__identity]')).toBe('game-1')
      expect(body.get('nominationList[team][__identity]')).toBe('team-1')
      expect(body.get('nominationList[closed]')).toBe('false')
      expect(body.get('nominationList[isClosedForTeam]')).toBe('true')
    })

    it('includes player nomination IDs with indexed keys', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateNominationList('nl-1', 'game-1', 'team-1', ['p1', 'p2', 'p3'])

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('nominationList[indoorPlayerNominations][0][__identity]')).toBe('p1')
      expect(body.get('nominationList[indoorPlayerNominations][1][__identity]')).toBe('p2')
      expect(body.get('nominationList[indoorPlayerNominations][2][__identity]')).toBe('p3')
    })
  })

  describe('finalizeNominationList', () => {
    it('sends POST request to finalize endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.finalizeNominationList('nl-1', 'game-1', 'team-1', ['p1'])

      const [url, options] = mockFetch.mock.calls[0]!
      expect(url).toContain('nominationlist/finalize')
      expect(options.method).toBe('POST')
    })

    it('includes validation ID when provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.finalizeNominationList('nl-1', 'game-1', 'team-1', ['p1'], 'validation-1')

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('nominationList[nominationListValidation][__identity]')).toBe('validation-1')
    })
  })

  describe('updateScoresheet', () => {
    it('sends PUT request with scoresheet data', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateScoresheet('ss-1', 'game-1', 'scorer-1', false)

      const [, options] = mockFetch.mock.calls[0]!
      expect(options.method).toBe('PUT')
      const body = options.body as URLSearchParams
      expect(body.get('scoresheet[__identity]')).toBe('ss-1')
      expect(body.get('scoresheet[game][__identity]')).toBe('game-1')
      expect(body.get('scoresheet[writerPerson][__identity]')).toBe('scorer-1')
      expect(body.get('scoresheet[isSimpleScoresheet]')).toBe('false')
      expect(body.get('scoresheet[hasFile]')).toBe('false')
    })

    it('supports simple scoresheet flag', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.updateScoresheet('ss-1', 'game-1', 'scorer-1', true)

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('scoresheet[isSimpleScoresheet]')).toBe('true')
    })
  })

  describe('finalizeScoresheet', () => {
    it('sends POST request to finalize endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.finalizeScoresheet('ss-1', 'game-1', 'scorer-1')

      const [url, options] = mockFetch.mock.calls[0]!
      expect(url).toContain('scoresheet/finalize')
      expect(options.method).toBe('POST')
    })

    it('includes file resource ID when provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.finalizeScoresheet('ss-1', 'game-1', 'scorer-1', 'file-res-1')

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('scoresheet[file][__identity]')).toBe('file-res-1')
      expect(body.get('scoresheet[hasFile]')).toBe('true')
    })

    it('includes validation ID when provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.finalizeScoresheet('ss-1', 'game-1', 'scorer-1', undefined, 'val-1')

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('scoresheet[scoresheetValidation][__identity]')).toBe('val-1')
    })

    it('sets hasFile to false when no file provided', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.finalizeScoresheet('ss-1', 'game-1', 'scorer-1')

      const [, options] = mockFetch.mock.calls[0]!
      const body = options.body as URLSearchParams
      expect(body.get('scoresheet[hasFile]')).toBe('false')
    })
  })

  describe('getGameWithScoresheet', () => {
    it('requests game with scoresheet and nomination list properties', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ game: { __identity: 'game-1' } }))

      await api.getGameWithScoresheet('game-123')

      const [url] = mockFetch.mock.calls[0]!
      expect(url).toContain('game%5B__identity%5D=game-123')
      expect(url).toContain('scoresheet')
      expect(url).toContain('nominationListOfTeamHome')
      expect(url).toContain('nominationListOfTeamAway')
    })

    it('requests group base property before nested group properties', async () => {
      // The 'group' base property must be requested before nested properties like
      // 'group.phase.league...' to avoid 500 errors when group is null
      mockFetch.mockResolvedValueOnce(createMockResponse({ game: { __identity: 'game-1' } }))

      await api.getGameWithScoresheet('game-123')

      const [url] = mockFetch.mock.calls[0]!
      // Verify 'group' appears as a standalone property (not just nested)
      // propertyRenderConfiguration[N]=group (URL encoded as group)
      expect(url).toMatch(/propertyRenderConfiguration%5B\d+%5D=group(?:&|$)/)
      // Verify the nested property is also present
      expect(url).toContain('writersCanUseSimpleScoresheetForThisLeagueCategory')
    })

    it('returns the game object from the response wrapper', async () => {
      const gameData = {
        __identity: 'game-1',
        scoresheet: { __identity: 'ss-1', closedAt: null },
        nominationListOfTeamHome: { __identity: 'nl-home' },
        nominationListOfTeamAway: { __identity: 'nl-away' },
      }
      mockFetch.mockResolvedValueOnce(createMockResponse({ game: gameData }))

      const result = await api.getGameWithScoresheet('game-123')

      expect(result).toEqual(gameData)
    })
  })

  describe('getAssociationSettings', () => {
    it('sends GET request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.getAssociationSettings()

      const [url, options] = mockFetch.mock.calls[0]!
      expect(url).toContain('getRefereeAssociationSettingsOfActiveParty')
      expect(options.method).toBe('GET')
    })
  })

  describe('getActiveSeason', () => {
    it('sends GET request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}))

      await api.getActiveSeason()

      const [url, options] = mockFetch.mock.calls[0]!
      expect(url).toContain('getActiveIndoorSeason')
      expect(options.method).toBe('GET')
    })
  })
})
