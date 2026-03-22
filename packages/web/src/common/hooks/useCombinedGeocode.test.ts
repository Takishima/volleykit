import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

import { server } from '@/test/msw/server'

import { useCombinedGeocode } from './useCombinedGeocode'

// Close MSW server for this file since we use manual fetch mocking
// These tests need fine-grained control over geocoding API responses
beforeAll(() => {
  server.close()
})

afterAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

describe('useCombinedGeocode', () => {
  const mockFetch = vi.fn()
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = mockFetch
    mockFetch.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const mockSwissResults = {
    results: [
      {
        id: 2867655,
        weight: 1602,
        attrs: {
          origin: 'address',
          detail: 'bederstrasse 1 8002 zuerich',
          label: 'Bederstrasse 1 <b>8002 Zürich</b>',
          lat: 47.364768,
          lon: 8.531177,
          x: 246566.03,
          y: 682527.12,
          rank: 7,
          num: 1,
          zoomlevel: 10,
        },
      },
    ],
  }

  const mockNominatimResults = [
    {
      place_id: 12345,
      lat: '47.3769',
      lon: '8.5417',
      display_name: 'Zürich, Switzerland',
      type: 'city',
      class: 'place',
    },
  ]

  describe('initial state', () => {
    it('returns correct initial state', () => {
      const { result } = renderHook(() => useCombinedGeocode())

      expect(result.current.results).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.search).toBe('function')
      expect(typeof result.current.clear).toBe('function')
    })
  })

  describe('search', () => {
    it('ignores queries shorter than 3 characters', async () => {
      const { result } = renderHook(() => useCombinedGeocode())

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
        json: async () => mockSwissResults,
      })

      const { result } = renderHook(() => useCombinedGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('returns Swiss results when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwissResults,
      })

      const { result } = renderHook(() => useCombinedGeocode())

      act(() => {
        result.current.search('Bederstrasse Zurich')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      expect(result.current.results[0]).toEqual({
        id: 2867655,
        latitude: 47.364768,
        longitude: 8.531177,
        displayName: 'Bederstrasse 1 8002 Zürich',
        source: 'swiss',
        swissData: {
          lv95X: 246566.03,
          lv95Y: 682527.12,
          featureId: 2867655,
        },
      })
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()

      // Should only call Swiss API, not Nominatim
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('api3.geo.admin.ch')
    })

    it('falls back to Nominatim when Swiss returns no results', async () => {
      // First call (Swiss) returns empty
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })
      // Second call (Nominatim) returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResults,
      })

      const { result } = renderHook(() => useCombinedGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      expect(result.current.results[0]).toEqual({
        id: 12345,
        latitude: 47.3769,
        longitude: 8.5417,
        displayName: 'Zürich, Switzerland',
        source: 'nominatim',
      })

      // Should call both APIs
      expect(mockFetch).toHaveBeenCalledTimes(2)
      const swissUrl = mockFetch.mock.calls[0]?.[0] as string
      const nominatimUrl = mockFetch.mock.calls[1]?.[0] as string
      expect(swissUrl).toContain('api3.geo.admin.ch')
      expect(nominatimUrl).toContain('nominatim.openstreetmap.org')
    })

    it('makes Swiss request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwissResults,
      })

      const { result } = renderHook(() => useCombinedGeocode())

      act(() => {
        result.current.search('Basel')
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('searchText=Basel')
      expect(url).toContain('type=locations')
      expect(url).toContain('origins=address%2Czipcode')
      expect(url).toContain('limit=5')
    })

    it('uses custom limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwissResults,
      })

      const { result } = renderHook(() => useCombinedGeocode({ limit: 10 }))

      act(() => {
        result.current.search('Bern')
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      const url = mockFetch.mock.calls[0]?.[0] as string
      expect(url).toContain('limit=10')
    })

    it('falls back to Nominatim when Swiss API returns HTTP error', async () => {
      // Swiss API fails with HTTP error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      // Nominatim returns results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResults,
      })

      const { result } = renderHook(() => useCombinedGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
      })

      // Should have fallen back to Nominatim
      expect(result.current.results[0]?.source).toBe('nominatim')
      expect(result.current.error).toBeNull()
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('handles error when both APIs fail', async () => {
      // Swiss API fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      // Nominatim also fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useCombinedGeocode())

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

      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockSwissResults,
                }),
              1000
            )
          )
      )

      const { result } = renderHook(() => useCombinedGeocode())

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

      const { result } = renderHook(() => useCombinedGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(result.current.error).toBeNull()
    })
  })

  describe('clear', () => {
    it('clears results and error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSwissResults,
      })

      const { result } = renderHook(() => useCombinedGeocode())

      act(() => {
        result.current.search('Zurich')
      })

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1)
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
