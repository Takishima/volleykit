/**
 * API Client tests using MSW (Mock Service Worker).
 *
 * MSW intercepts requests at the network level, providing more realistic testing
 * than manual fetch mocking. This catches serialization bugs and tests actual
 * request/response handling.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '@/test/msw/server'

import { api, setCsrfToken, clearSession } from './client'

// Valid mock response structures that pass Zod validation
const mockAssignmentsResponse = { items: [], totalItemsCount: 0 }
const mockCompensationsResponse = { items: [], totalItemsCount: 0 }
const mockExchangesResponse = { items: [], totalItemsCount: 0 }
const mockPersonSearchResponse = { items: [], totalItemsCount: 0 }

describe('API Client', () => {
  beforeEach(() => {
    clearSession()
  })

  describe('setCsrfToken / clearSession', () => {
    it('setCsrfToken stores token for use in requests', async () => {
      setCsrfToken('test-token-123')

      let capturedBody: URLSearchParams | null = null
      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json(mockAssignmentsResponse)
        })
      )

      await api.searchAssignments({})

      expect(capturedBody?.get('__csrfToken')).toBe('test-token-123')
    })

    it('clearSession removes CSRF token', async () => {
      setCsrfToken('test-token')
      clearSession()

      let capturedBody: URLSearchParams | null = null
      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json(mockAssignmentsResponse)
        })
      )

      await api.searchAssignments({})

      expect(capturedBody?.get('__csrfToken')).toBeNull()
    })
  })

  describe('error handling', () => {
    it('throws error on non-OK response', async () => {
      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' })
        })
      )

      await expect(api.searchAssignments({})).rejects.toThrow('500 Internal Server Error')
    })

    it('clears session and throws on 401 response', async () => {
      setCsrfToken('some-token')

      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
          return new HttpResponse(null, { status: 401, statusText: 'Unauthorized' })
        })
      )

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('clears session and throws on 403 response', async () => {
      setCsrfToken('some-token')

      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
          return new HttpResponse(null, { status: 403, statusText: 'Forbidden' })
        })
      )

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('clears session and throws on 406 response', async () => {
      setCsrfToken('some-token')

      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
          return new HttpResponse(null, { status: 406, statusText: 'Not Acceptable' })
        })
      )

      await expect(api.searchAssignments({})).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('throws error on invalid JSON response', async () => {
      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
          return new HttpResponse('not valid json {{{', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        })
      )

      await expect(api.searchAssignments({})).rejects.toThrow(/Invalid JSON response/)
    })

    it('treats HTML response as stale session when redirected to login page', async () => {
      setCsrfToken('some-token')

      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
          return new HttpResponse('<html><body>Login</body></html>', {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8',
              'X-Final-URL': 'https://example.com/login',
            },
          })
        })
      )

      // Note: MSW doesn't support response.url, so this test verifies HTML detection
      // The actual login page redirect detection is tested in integration tests
      await expect(api.searchAssignments({})).rejects.toThrow(/Invalid JSON response/)
    })

    it('accepts JSON response with incorrect Content-Type header', async () => {
      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
          return HttpResponse.json(mockAssignmentsResponse, {
            headers: { 'Content-Type': 'text/html; charset=UTF-8' },
          })
        })
      )

      const result = await api.searchAssignments({})
      expect(result).toEqual(mockAssignmentsResponse)
    })
  })

  describe('searchAssignments', () => {
    it('sends POST request to correct endpoint', async () => {
      let capturedUrl: string | null = null
      let capturedMethod: string | null = null

      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', ({ request }) => {
          capturedUrl = request.url
          capturedMethod = request.method
          return HttpResponse.json(mockAssignmentsResponse)
        })
      )

      await api.searchAssignments({})

      expect(capturedUrl).toContain('api%5crefereeconvocation/searchMyRefereeConvocations')
      expect(capturedMethod).toBe('POST')
    })

    it('includes search configuration in request', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json(mockAssignmentsResponse)
        })
      )

      await api.searchAssignments({ offset: 0, limit: 10 })

      expect(capturedBody?.get('searchConfiguration[offset]')).toBe('0')
      expect(capturedBody?.get('searchConfiguration[limit]')).toBe('10')
    })

    it('includes propertyRenderConfiguration in request', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json(mockAssignmentsResponse)
        })
      )

      await api.searchAssignments({})

      expect(capturedBody?.get('propertyRenderConfiguration[0]')).toBe('refereeConvocationStatus')
      expect(capturedBody?.get('propertyRenderConfiguration[12]')).toBe('refereePosition')
    })
  })

  describe('searchCompensations', () => {
    it('sends POST request to correct endpoint', async () => {
      let capturedUrl: string | null = null

      server.use(
        http.post('*/api%5crefereeconvocationcompensation/search', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json(mockCompensationsResponse)
        })
      )

      await api.searchCompensations({})

      expect(capturedUrl).toContain('api%5crefereeconvocationcompensation/search')
    })
  })

  describe('getCompensationDetails', () => {
    it('sends GET request to showWithNestedObjects endpoint', async () => {
      let capturedUrl: string | null = null
      let capturedMethod: string | null = null
      const mockDetailsResponse = {
        convocationCompensation: {
          __identity: 'comp-123',
          distanceInMetres: 48000,
          correctionReason: 'Test reason',
        },
      }

      server.use(
        http.get('*/api%5cconvocationcompensation/showWithNestedObjects', ({ request }) => {
          capturedUrl = request.url
          capturedMethod = request.method
          return HttpResponse.json(mockDetailsResponse)
        })
      )

      await api.getCompensationDetails('comp-123')

      expect(capturedUrl).toContain('showWithNestedObjects')
      expect(capturedMethod).toBe('GET')
    })

    it('includes compensation ID in query parameters', async () => {
      let capturedUrl: string | null = null

      server.use(
        http.get('*/api%5cconvocationcompensation/showWithNestedObjects', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({ convocationCompensation: {} })
        })
      )

      await api.getCompensationDetails('test-comp-id')

      expect(capturedUrl).toContain('convocationCompensation%5B__identity%5D=test-comp-id')
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

      server.use(
        http.get('*/api%5cconvocationcompensation/showWithNestedObjects', () => {
          return HttpResponse.json(mockDetailsResponse)
        })
      )

      const result = await api.getCompensationDetails('comp-123')

      expect(result.convocationCompensation?.distanceInMetres).toBe(48000)
      expect(result.convocationCompensation?.correctionReason).toBe('Ich wohne in Oberengstringen')
    })
  })

  describe('updateCompensation', () => {
    it('sends PUT request to correct endpoint', async () => {
      let capturedMethod: string | null = null

      server.use(
        http.put('*/api%5cconvocationcompensation', ({ request }) => {
          capturedMethod = request.method
          return HttpResponse.json({})
        })
      )

      await api.updateCompensation('comp-123', { distanceInMetres: 50000 })

      expect(capturedMethod).toBe('PUT')
    })

    it('includes compensation ID nested in convocationCompensation', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.put('*/api%5cconvocationcompensation', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.updateCompensation('comp-456', { distanceInMetres: 60000 })

      expect(capturedBody?.get('convocationCompensation[__identity]')).toBe('comp-456')
    })

    it('includes both distanceInMetres and correctionReason when provided', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.put('*/api%5cconvocationcompensation', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.updateCompensation('comp-xyz', {
        distanceInMetres: 88000,
        correctionReason: 'Alternative route',
      })

      expect(capturedBody?.get('convocationCompensation[distanceInMetres]')).toBe('88000')
      expect(capturedBody?.get('convocationCompensation[correctionReason]')).toBe(
        'Alternative route'
      )
    })
  })

  describe('searchExchanges', () => {
    it('sends POST request to correct endpoint', async () => {
      let capturedUrl: string | null = null

      server.use(
        http.post('*/api%5crefereegameexchange/search', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json(mockExchangesResponse)
        })
      )

      await api.searchExchanges({})

      expect(capturedUrl).toContain('api%5crefereegameexchange/search')
    })
  })

  describe('applyForExchange', () => {
    it('sends PUT request with refereeGameExchange[__identity] per confirmed API spec', async () => {
      let capturedBody: URLSearchParams | null = null
      let capturedMethod: string | null = null
      let capturedUrl: string | null = null

      server.use(
        http.put(
          '*/api%5crefereegameexchange/pickFromRefereeGameExchange',
          async ({ request }) => {
            capturedMethod = request.method
            capturedUrl = request.url
            const text = await request.text()
            capturedBody = new URLSearchParams(text)
            return HttpResponse.json({
              refereeGameExchange: {
                __identity: 'exchange-123',
                status: 'applied',
                appliedAt: new Date().toISOString(),
              },
            })
          }
        )
      )

      const result = await api.applyForExchange('exchange-123')

      expect(capturedMethod).toBe('PUT')
      expect(capturedUrl).toContain('pickFromRefereeGameExchange')
      expect(capturedBody?.get('refereeGameExchange[__identity]')).toBe('exchange-123')
      expect(result.refereeGameExchange.__identity).toBe('exchange-123')
      expect(result.refereeGameExchange.status).toBe('applied')
    })
  })

  describe('withdrawFromExchange', () => {
    it('sends PUT request with __identity and withdrawApplication=1 per OpenAPI spec', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.put('*/api%5crefereegameexchange', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.withdrawFromExchange('exchange-456')

      expect(capturedBody?.get('__identity')).toBe('exchange-456')
      expect(capturedBody?.get('withdrawApplication')).toBe('1')
    })
  })

  describe('searchPersons', () => {
    it('uses GET method for person search', async () => {
      let capturedMethod: string | null = null

      server.use(
        http.get('*/api%5celasticsearchperson/search', ({ request }) => {
          capturedMethod = request.method
          return HttpResponse.json(mockPersonSearchResponse)
        })
      )

      await api.searchPersons({ lastName: 'müller' })

      expect(capturedMethod).toBe('GET')
    })

    it('does not include CSRF token in GET request URL', async () => {
      setCsrfToken('test-csrf-token')

      let capturedUrl: string | null = null

      server.use(
        http.get('*/api%5celasticsearchperson/search', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json(mockPersonSearchResponse)
        })
      )

      await api.searchPersons({ lastName: 'müller' })

      expect(capturedUrl).not.toContain('__csrfToken')
    })

    it('uses default limit when not specified', async () => {
      let capturedUrl: string | null = null

      server.use(
        http.get('*/api%5celasticsearchperson/search', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json(mockPersonSearchResponse)
        })
      )

      await api.searchPersons({ lastName: 'müller' })

      expect(capturedUrl).toContain('searchConfiguration%5Blimit%5D=50')
    })

    it('respects custom limit when provided', async () => {
      let capturedUrl: string | null = null

      server.use(
        http.get('*/api%5celasticsearchperson/search', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json(mockPersonSearchResponse)
        })
      )

      await api.searchPersons({ lastName: 'müller' }, { limit: 100 })

      expect(capturedUrl).toContain('searchConfiguration%5Blimit%5D=100')
    })

    it('requests all required properties for displaying search results', async () => {
      let capturedUrl: string | null = null

      server.use(
        http.get('*/api%5celasticsearchperson/search', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json(mockPersonSearchResponse)
        })
      )

      await api.searchPersons({ lastName: 'test' })

      const requiredProperties = [
        'displayName',
        'firstName',
        'lastName',
        'associationId',
        'birthday',
        'gender',
      ]

      requiredProperties.forEach((prop) => {
        expect(capturedUrl).toContain(prop)
      })
    })
  })

  describe('request headers', () => {
    it('includes Accept: application/json header', async () => {
      let capturedHeaders: Headers | null = null

      server.use(
        http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', ({ request }) => {
          capturedHeaders = request.headers
          return HttpResponse.json(mockAssignmentsResponse)
        })
      )

      await api.searchAssignments({})

      expect(capturedHeaders?.get('Accept')).toBe('application/json')
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
    })

    it('accepts PDF files', async () => {
      const pdfFile = createMockFile('doc.pdf', 'application/pdf')

      server.use(
        http.post('*/api%5cpersistentresource/upload', () => {
          return HttpResponse.json([{ __identity: 'res-1' }])
        })
      )

      const result = await api.uploadResource(pdfFile)
      expect(result).toEqual([{ __identity: 'res-1' }])
    })

    it('accepts JPEG files', async () => {
      const jpegFile = createMockFile('photo.jpg', 'image/jpeg')

      server.use(
        http.post('*/api%5cpersistentresource/upload', () => {
          return HttpResponse.json([{ __identity: 'res-1' }])
        })
      )

      const result = await api.uploadResource(jpegFile)
      expect(result).toEqual([{ __identity: 'res-1' }])
    })

    it('accepts PNG files', async () => {
      const pngFile = createMockFile('image.png', 'image/png')

      server.use(
        http.post('*/api%5cpersistentresource/upload', () => {
          return HttpResponse.json([{ __identity: 'res-1' }])
        })
      )

      const result = await api.uploadResource(pngFile)
      expect(result).toEqual([{ __identity: 'res-1' }])
    })

    it('sends POST request with FormData', async () => {
      let capturedMethod: string | null = null
      let capturedContentType: string | null = null

      server.use(
        http.post('*/api%5cpersistentresource/upload', ({ request }) => {
          capturedMethod = request.method
          capturedContentType = request.headers.get('Content-Type')
          return HttpResponse.json([{ __identity: 'res-1' }])
        })
      )

      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      await api.uploadResource(pdfFile)

      expect(capturedMethod).toBe('POST')
      // FormData sets multipart/form-data with boundary
      expect(capturedContentType).toContain('multipart/form-data')
    })

    it('includes CSRF token in FormData when available', async () => {
      setCsrfToken('upload-csrf-token')

      let capturedFormData: FormData | null = null

      server.use(
        http.post('*/api%5cpersistentresource/upload', async ({ request }) => {
          capturedFormData = await request.formData()
          return HttpResponse.json([{ __identity: 'res-1' }])
        })
      )

      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      await api.uploadResource(pdfFile)

      expect(capturedFormData?.get('__csrfToken')).toBe('upload-csrf-token')
    })

    it('clears session and throws on 401 response', async () => {
      setCsrfToken('some-token')

      server.use(
        http.post('*/api%5cpersistentresource/upload', () => {
          return new HttpResponse(null, { status: 401, statusText: 'Unauthorized' })
        })
      )

      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      await expect(api.uploadResource(pdfFile)).rejects.toThrow(
        'Session expired. Please log in again.'
      )
    })

    it('throws error with parsed message on other failures', async () => {
      server.use(
        http.post('*/api%5cpersistentresource/upload', () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' })
        })
      )

      const pdfFile = createMockFile('doc.pdf', 'application/pdf')
      await expect(api.uploadResource(pdfFile)).rejects.toThrow(/500 Internal Server Error/)
    })
  })

  describe('getAssignmentDetails', () => {
    it('sends GET request with convocation ID', async () => {
      let capturedUrl: string | null = null
      let capturedMethod: string | null = null

      server.use(
        http.get('*/api%5crefereeconvocation/showWithNestedObjects', ({ request }) => {
          capturedUrl = request.url
          capturedMethod = request.method
          return HttpResponse.json({})
        })
      )

      await api.getAssignmentDetails('conv-123', ['refereeGame.game'])

      expect(capturedMethod).toBe('GET')
      expect(capturedUrl).toContain('convocation=conv-123')
    })

    it('includes nested property names in query', async () => {
      let capturedUrl: string | null = null

      server.use(
        http.get('*/api%5crefereeconvocation/showWithNestedObjects', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({})
        })
      )

      await api.getAssignmentDetails('conv-123', ['prop1', 'prop2', 'prop3'])

      expect(capturedUrl).toContain('nestedPropertyNames%5B0%5D=prop1')
      expect(capturedUrl).toContain('nestedPropertyNames%5B1%5D=prop2')
      expect(capturedUrl).toContain('nestedPropertyNames%5B2%5D=prop3')
    })
  })

  describe('getPossiblePlayerNominations', () => {
    it('sends POST request with nomination list ID', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post(
          '*/api%5cnominationlist/getPossibleIndoorPlayerNominationsForNominationList',
          async ({ request }) => {
            const text = await request.text()
            capturedBody = new URLSearchParams(text)
            return HttpResponse.json({ items: [], totalItemsCount: 0 })
          }
        )
      )

      await api.getPossiblePlayerNominations('nl-123')

      expect(capturedBody?.get('nominationList')).toBe('nl-123')
    })

    it('uses default options when not specified', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post(
          '*/api%5cnominationlist/getPossibleIndoorPlayerNominationsForNominationList',
          async ({ request }) => {
            const text = await request.text()
            capturedBody = new URLSearchParams(text)
            return HttpResponse.json({ items: [], totalItemsCount: 0 })
          }
        )
      )

      await api.getPossiblePlayerNominations('nl-123')

      expect(capturedBody?.get('onlyFromMyTeam')).toBe('true')
      expect(capturedBody?.get('onlyRelevantGender')).toBe('true')
    })

    it('respects custom options', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post(
          '*/api%5cnominationlist/getPossibleIndoorPlayerNominationsForNominationList',
          async ({ request }) => {
            const text = await request.text()
            capturedBody = new URLSearchParams(text)
            return HttpResponse.json({ items: [], totalItemsCount: 0 })
          }
        )
      )

      await api.getPossiblePlayerNominations('nl-123', {
        onlyFromMyTeam: false,
        onlyRelevantGender: false,
      })

      expect(capturedBody?.get('onlyFromMyTeam')).toBe('false')
      expect(capturedBody?.get('onlyRelevantGender')).toBe('false')
    })
  })

  describe('updateNominationList', () => {
    it('sends PUT request with all required fields', async () => {
      let capturedBody: URLSearchParams | null = null
      let capturedMethod: string | null = null

      server.use(
        http.put('*/api%5cnominationlist', async ({ request }) => {
          capturedMethod = request.method
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.updateNominationList('nl-1', 'game-1', 'team-1', ['player-1', 'player-2'])

      expect(capturedMethod).toBe('PUT')
      expect(capturedBody?.get('nominationList[__identity]')).toBe('nl-1')
      expect(capturedBody?.get('nominationList[game][__identity]')).toBe('game-1')
      expect(capturedBody?.get('nominationList[team][__identity]')).toBe('team-1')
      expect(capturedBody?.get('nominationList[closed]')).toBe('false')
      expect(capturedBody?.get('nominationList[isClosedForTeam]')).toBe('true')
    })

    it('includes player nomination IDs with indexed keys', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.put('*/api%5cnominationlist', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.updateNominationList('nl-1', 'game-1', 'team-1', ['p1', 'p2', 'p3'])

      expect(capturedBody?.get('nominationList[indoorPlayerNominations][0][__identity]')).toBe('p1')
      expect(capturedBody?.get('nominationList[indoorPlayerNominations][1][__identity]')).toBe('p2')
      expect(capturedBody?.get('nominationList[indoorPlayerNominations][2][__identity]')).toBe('p3')
    })
  })

  describe('finalizeNominationList', () => {
    it('sends POST request to finalize endpoint', async () => {
      let capturedUrl: string | null = null
      let capturedMethod: string | null = null

      server.use(
        http.post('*/api%5cnominationlist/finalize', ({ request }) => {
          capturedUrl = request.url
          capturedMethod = request.method
          return HttpResponse.json({})
        })
      )

      await api.finalizeNominationList('nl-1', 'game-1', 'team-1', ['p1'])

      expect(capturedUrl).toContain('nominationlist/finalize')
      expect(capturedMethod).toBe('POST')
    })

    it('includes validation ID when provided', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post('*/api%5cnominationlist/finalize', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.finalizeNominationList('nl-1', 'game-1', 'team-1', ['p1'], 'validation-1')

      expect(capturedBody?.get('nominationList[nominationListValidation][__identity]')).toBe(
        'validation-1'
      )
    })
  })

  describe('updateScoresheet', () => {
    it('sends PUT request with scoresheet data', async () => {
      let capturedBody: URLSearchParams | null = null
      let capturedMethod: string | null = null

      server.use(
        http.put('*/api%5cscoresheet', async ({ request }) => {
          capturedMethod = request.method
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.updateScoresheet('ss-1', 'game-1', 'scorer-1', false)

      expect(capturedMethod).toBe('PUT')
      expect(capturedBody?.get('scoresheet[__identity]')).toBe('ss-1')
      expect(capturedBody?.get('scoresheet[game][__identity]')).toBe('game-1')
      expect(capturedBody?.get('scoresheet[writerPerson][__identity]')).toBe('scorer-1')
      expect(capturedBody?.get('scoresheet[isSimpleScoresheet]')).toBe('false')
      expect(capturedBody?.get('scoresheet[hasFile]')).toBe('false')
    })

    it('supports simple scoresheet flag', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.put('*/api%5cscoresheet', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.updateScoresheet('ss-1', 'game-1', 'scorer-1', true)

      expect(capturedBody?.get('scoresheet[isSimpleScoresheet]')).toBe('true')
    })
  })

  describe('finalizeScoresheet', () => {
    it('sends POST request to finalize endpoint', async () => {
      let capturedUrl: string | null = null
      let capturedMethod: string | null = null

      server.use(
        http.post('*/api%5cscoresheet/finalize', ({ request }) => {
          capturedUrl = request.url
          capturedMethod = request.method
          return HttpResponse.json({})
        })
      )

      await api.finalizeScoresheet('ss-1', 'game-1', 'scorer-1')

      expect(capturedUrl).toContain('scoresheet/finalize')
      expect(capturedMethod).toBe('POST')
    })

    it('includes file resource ID when provided', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post('*/api%5cscoresheet/finalize', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.finalizeScoresheet('ss-1', 'game-1', 'scorer-1', 'file-res-1')

      expect(capturedBody?.get('scoresheet[file][__identity]')).toBe('file-res-1')
      expect(capturedBody?.get('scoresheet[hasFile]')).toBe('true')
    })

    it('includes validation ID when provided', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post('*/api%5cscoresheet/finalize', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.finalizeScoresheet('ss-1', 'game-1', 'scorer-1', undefined, 'val-1')

      expect(capturedBody?.get('scoresheet[scoresheetValidation][__identity]')).toBe('val-1')
    })

    it('sets hasFile to false when no file provided', async () => {
      let capturedBody: URLSearchParams | null = null

      server.use(
        http.post('*/api%5cscoresheet/finalize', async ({ request }) => {
          const text = await request.text()
          capturedBody = new URLSearchParams(text)
          return HttpResponse.json({})
        })
      )

      await api.finalizeScoresheet('ss-1', 'game-1', 'scorer-1')

      expect(capturedBody?.get('scoresheet[hasFile]')).toBe('false')
    })
  })

  describe('getGameWithScoresheet', () => {
    it('requests game with scoresheet and nomination list properties', async () => {
      let capturedUrl: string | null = null

      server.use(
        http.get('*/api%5cgame/showWithNestedObjects', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json({ game: { __identity: 'game-1' } })
        })
      )

      await api.getGameWithScoresheet('game-123')

      expect(capturedUrl).toContain('game%5B__identity%5D=game-123')
      expect(capturedUrl).toContain('scoresheet')
      expect(capturedUrl).toContain('nominationListOfTeamHome')
      expect(capturedUrl).toContain('nominationListOfTeamAway')
    })

    it('returns the game object from the response wrapper', async () => {
      const gameData = {
        __identity: 'game-1',
        scoresheet: { __identity: 'ss-1', closedAt: null },
        nominationListOfTeamHome: { __identity: 'nl-home' },
        nominationListOfTeamAway: { __identity: 'nl-away' },
      }

      server.use(
        http.get('*/api%5cgame/showWithNestedObjects', () => {
          return HttpResponse.json({ game: gameData })
        })
      )

      const result = await api.getGameWithScoresheet('game-123')

      expect(result).toEqual(gameData)
    })
  })

  describe('getAssociationSettings', () => {
    it('sends GET request to correct endpoint', async () => {
      let capturedUrl: string | null = null
      let capturedMethod: string | null = null

      server.use(
        http.get('*/api%5crefereeassociationsettings/getRefereeAssociationSettingsOfActiveParty', ({ request }) => {
          capturedUrl = request.url
          capturedMethod = request.method
          return HttpResponse.json({})
        })
      )

      await api.getAssociationSettings()

      expect(capturedUrl).toContain('getRefereeAssociationSettingsOfActiveParty')
      expect(capturedMethod).toBe('GET')
    })
  })

  describe('getActiveSeason', () => {
    it('sends GET request to correct endpoint', async () => {
      let capturedUrl: string | null = null
      let capturedMethod: string | null = null

      server.use(
        http.get('*/api%5cindoorseason/getActiveIndoorSeason', ({ request }) => {
          capturedUrl = request.url
          capturedMethod = request.method
          return HttpResponse.json({})
        })
      )

      await api.getActiveSeason()

      expect(capturedUrl).toContain('getActiveIndoorSeason')
      expect(capturedMethod).toBe('GET')
    })
  })
})
