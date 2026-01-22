import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

import { server } from '@/test/msw/server'

import { useGeocode } from './useGeocode'

// Close MSW server for this file since we use manual fetch mocking
// These tests need fine-grained control over geocoding API responses
beforeAll(() => {
  server.close()
})

afterAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

describe('useGeocode', () => {
  const mockFetch = vi.fn()
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = mockFetch
    mockFetch.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  // Mock results without address details (fallback to display_name)
  const mockNominatimResultsWithoutAddress = [
    {
      place_id: 12345,
      lat: '47.3769',
      lon: '8.5417',
      display_name: 'Zürich, Switzerland',
    },
    {
      place_id: 67890,
      lat: '47.3667',
      lon: '8.55',
      display_name: 'Zürich Hauptbahnhof, Switzerland',
    },
  ]

  // Mock results with Swiss address details (formatted to Swiss SBB format)
  const mockNominatimResultsWithAddress = [
    {
      place_id: 12345,
      lat: '47.5183',
      lon: '6.7847',
      display_name:
        '31, Avenue des Roses, Château-Sec, Pully, District de Lavaux-Oron, Vaud, 1009, Suisse',
      address: {
        house_number: '31',
        road: 'Avenue des Roses',
        neighbourhood: 'Château-Sec',
        city: 'Pully',
        county: 'District de Lavaux-Oron',
        state: 'Vaud',
        postcode: '1009',
        country: 'Suisse',
        country_code: 'ch',
      },
    },
    {
      place_id: 67890,
      lat: '47.3667',
      lon: '8.55',
      display_name: 'Bahnhofstrasse, Zürich, Switzerland',
      address: {
        road: 'Bahnhofstrasse',
        city: 'Zürich',
        postcode: '8001',
        country: 'Switzerland',
        country_code: 'ch',
      },
    },
  ]

  describe('initial state', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => useGeocode())

      expect(result.current.results).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.search).toBe('function')
      expect(typeof result.current.clear).toBe('function')
    })
  })

  describe('search', () => {
    it('ignores queries shorter than 3 characters', async () => {
      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('ab')
      })

      expect(mockFetch).not.toHaveBeenCalled()
      expect(result.current.results).toEqual([])
      expect(result.current.isLoading).toBe(false)
    })

    it('sets loading state when searching', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResultsWithoutAddress,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('returns geocoded results with display_name when no address details', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResultsWithoutAddress,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2)
      })

      // Falls back to display_name when no address details
      expect(result.current.results[0]).toEqual({
        placeId: 12345,
        latitude: 47.3769,
        longitude: 8.5417,
        displayName: 'Zürich, Switzerland',
      })
      expect(result.current.results[1]).toEqual({
        placeId: 67890,
        latitude: 47.3667,
        longitude: 8.55,
        displayName: 'Zürich Hauptbahnhof, Switzerland',
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('formats addresses in Swiss SBB format when address details available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResultsWithAddress,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Avenue des Roses Pully')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2)
      })

      // Full address with house number: "1009 Pully, Avenue des Roses 31"
      expect(result.current.results[0]).toEqual({
        placeId: 12345,
        latitude: 47.5183,
        longitude: 6.7847,
        displayName: '1009 Pully, Avenue des Roses 31',
      })

      // Street without house number: "8001 Zürich, Bahnhofstrasse"
      expect(result.current.results[1]).toEqual({
        placeId: 67890,
        latitude: 47.3667,
        longitude: 8.55,
        displayName: '8001 Zürich, Bahnhofstrasse',
      })
    })

    it('formats addresses with town instead of city', async () => {
      const mockResultsWithTown = [
        {
          place_id: 11111,
          lat: '47.3678',
          lon: '7.9976',
          display_name: 'Betoncoupe Arena, Aarestrasse 20, Schönenwerd, Switzerland',
          address: {
            house_number: '20',
            road: 'Aarestrasse',
            town: 'Schönenwerd',
            postcode: '5012',
            country: 'Switzerland',
            country_code: 'ch',
          },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResultsWithTown,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Betoncoupe Arena Schönenwerd')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // Uses town when city is not available
      expect(result.current.results[0]?.displayName).toBe('5012 Schönenwerd, Aarestrasse 20')
    })

    it('formats Meilen address correctly', async () => {
      const mockResultsMeilen = [
        {
          place_id: 33333,
          lat: '47.2705',
          lon: '8.6423',
          display_name:
            '93, Dorfstrasse, Fuchsloch, Obermeilen, Meilen, Bezirk Meilen, Zurich, 8706, Suisse',
          address: {
            house_number: '93',
            road: 'Dorfstrasse',
            neighbourhood: 'Fuchsloch',
            village: 'Meilen',
            county: 'Bezirk Meilen',
            state: 'Zurich',
            postcode: '8706',
            country: 'Suisse',
            country_code: 'ch',
          },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResultsMeilen,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Dorfstrasse 93 Meilen')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // Uses village when city is not available
      expect(result.current.results[0]?.displayName).toBe('8706 Meilen, Dorfstrasse 93')
    })

    it('formats POI address correctly (ignores POI name)', async () => {
      const mockResultsPOI = [
        {
          place_id: 44444,
          lat: '47.2705',
          lon: '8.6423',
          display_name:
            'Credit Suisse, 93, Dorfstrasse, Fuchsloch, Obermeilen, Meilen, Bezirk Meilen, Zurich, 8706, Suisse',
          address: {
            house_number: '93',
            road: 'Dorfstrasse',
            neighbourhood: 'Fuchsloch',
            village: 'Meilen',
            county: 'Bezirk Meilen',
            state: 'Zurich',
            postcode: '8706',
            country: 'Suisse',
            country_code: 'ch',
          },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResultsPOI,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Credit Suisse Meilen')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // POI name is not included in formatted address
      expect(result.current.results[0]?.displayName).toBe('8706 Meilen, Dorfstrasse 93')
    })

    it('returns only postcode and city when street is missing', async () => {
      const mockResultsNoStreet = [
        {
          place_id: 22222,
          lat: '47.3769',
          lon: '8.5417',
          display_name: 'Zürich, Switzerland',
          address: {
            city: 'Zürich',
            postcode: '8000',
            country: 'Switzerland',
            country_code: 'ch',
          },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResultsNoStreet,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Zürich')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // Returns just postcode and city when no street
      expect(result.current.results[0]?.displayName).toBe('8000 Zürich')
    })

    it('makes request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Basel')
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('nominatim.openstreetmap.org/search')
      expect(url).toContain('q=Basel')
      expect(url).toContain('format=json')
      expect(url).toContain('countrycodes=ch')
      expect(url).toContain('limit=5')
    })

    it('uses custom country code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const { result } = renderHook(() => useGeocode({ countryCode: 'de', limit: 10 }))

      act(() => {
        result.current.search('Berlin')
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('countrycodes=de')
      expect(url).toContain('limit=10')
    })

    it('handles HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      await waitFor(() => {
        expect(result.current.error).toBe('geocode_failed')
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.results).toEqual([])
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      await waitFor(() => {
        expect(result.current.error).toBe('geocode_failed')
      })
      expect(result.current.isLoading).toBe(false)
    })

    it('cancels previous request when new search is made', async () => {
      const abortSpy = vi.fn()
      const OriginalAbortController = globalThis.AbortController
      globalThis.AbortController = class MockAbortController {
        signal = { aborted: false }
        abort = abortSpy
      } as unknown as typeof AbortController

      // First request takes a long time
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockNominatimResultsWithoutAddress,
                }),
              1000
            )
          )
      )

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('First query')
      })

      act(() => {
        result.current.search('Second query')
      })

      expect(abortSpy).toHaveBeenCalled()

      globalThis.AbortController = OriginalAbortController
    })

    it('ignores abort errors', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      // Wait a bit to ensure state doesn't change
      await new Promise((resolve) => setTimeout(resolve, 50))

      // AbortError should not set error state
      expect(result.current.error).toBeNull()
    })
  })

  describe('clear', () => {
    it('clears results and error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResultsWithoutAddress,
      })

      const { result } = renderHook(() => useGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(2)
      })

      act(() => {
        result.current.clear()
      })

      expect(result.current.results).toEqual([])
      expect(result.current.error).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })
  })
})
