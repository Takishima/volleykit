import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  buildFullAddress,
  buildGoogleMapsUrl,
  buildNativeMapsUrl,
  buildMapsUrls,
  type PostalAddress,
} from './maps-url'

describe('maps-url', () => {
  describe('buildFullAddress', () => {
    it('returns null for null input', () => {
      expect(buildFullAddress(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(buildFullAddress(undefined)).toBeNull()
    })

    it('builds address from components when all are available', () => {
      const address: PostalAddress = {
        combinedAddress: 'Sportstrasse 1, 8000 Zürich',
        streetAndHouseNumber: 'Sportstrasse 1',
        postalCodeAndCity: '8000 Zürich',
      }
      // Should build from components, result happens to match combinedAddress
      expect(buildFullAddress(address)).toBe('Sportstrasse 1, 8000 Zürich')
    })

    it('builds address from street and postal code when combinedAddress is missing', () => {
      const address: PostalAddress = {
        streetAndHouseNumber: 'Hallenweg 42',
        postalCodeAndCity: '3000 Bern',
      }
      expect(buildFullAddress(address)).toBe('Hallenweg 42, 3000 Bern')
    })

    it('returns null when only street is available', () => {
      const address: PostalAddress = {
        streetAndHouseNumber: 'Hallenweg 42',
      }
      expect(buildFullAddress(address)).toBeNull()
    })

    it('returns postalCodeAndCity when only that is available', () => {
      const address: PostalAddress = {
        postalCodeAndCity: '3000 Bern',
      }
      expect(buildFullAddress(address)).toBe('3000 Bern')
    })

    it('builds postalCodeAndCity from separate postalCode and city fields', () => {
      const address: PostalAddress = {
        postalCode: '8000',
        city: 'Zürich',
      }
      expect(buildFullAddress(address)).toBe('8000 Zürich')
    })

    it('returns city alone when only city is available', () => {
      const address: PostalAddress = {
        city: 'Basel',
      }
      expect(buildFullAddress(address)).toBe('Basel')
    })

    it('returns null for empty object', () => {
      expect(buildFullAddress({})).toBeNull()
    })

    it('builds from components even when combinedAddress differs', () => {
      const address: PostalAddress = {
        combinedAddress: 'Different Combined Address',
        streetAndHouseNumber: 'Musterstrasse 1',
        postalCodeAndCity: '8000 Zürich',
      }
      // Components take precedence - builds full address from street + postalCodeAndCity
      expect(buildFullAddress(address)).toBe('Musterstrasse 1, 8000 Zürich')
    })

    it('handles API case where combinedAddress only has street', () => {
      // Real API data: combinedAddress matches streetAndHouseNumber (no postal info)
      const address: PostalAddress = {
        combinedAddress: 'Steingrubenweg 30',
        streetAndHouseNumber: 'Steingrubenweg 30',
        postalCode: '4125',
        city: 'Riehen',
      }
      expect(buildFullAddress(address)).toBe('Steingrubenweg 30, 4125 Riehen')
    })

    it('returns combinedAddress when only it is available', () => {
      const address: PostalAddress = {
        combinedAddress: 'Full Address Here',
      }
      expect(buildFullAddress(address)).toBe('Full Address Here')
    })
  })

  describe('buildGoogleMapsUrl', () => {
    it('returns null for null input', () => {
      expect(buildGoogleMapsUrl(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(buildGoogleMapsUrl(undefined)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(buildGoogleMapsUrl('')).toBeNull()
    })

    it('builds correct URL for Plus Code', () => {
      const plusCode = '8FVC9G8F+5W'
      const url = buildGoogleMapsUrl(plusCode)
      expect(url).toBe(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plusCode)}`
      )
    })

    it('properly encodes special characters in Plus Code', () => {
      const plusCode = '8FVC+5W'
      const url = buildGoogleMapsUrl(plusCode)
      expect(url).toContain(encodeURIComponent('+'))
    })
  })

  describe('buildNativeMapsUrl', () => {
    const originalUserAgent = navigator.userAgent

    beforeEach(() => {
      // Reset userAgent before each test
      vi.stubGlobal('navigator', { userAgent: originalUserAgent })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    describe('on iOS devices', () => {
      beforeEach(() => {
        vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone)' })
      })

      it('builds maps: URL with address', () => {
        const url = buildNativeMapsUrl('Sportstrasse 1, 8000 Zürich', null, 'Sporthalle')
        expect(url).toBe(`maps:?q=${encodeURIComponent('Sportstrasse 1, 8000 Zürich')}`)
      })

      it('builds maps: URL with coordinates when no address', () => {
        const coords = { latitude: 47.3769, longitude: 8.5417 }
        const url = buildNativeMapsUrl(null, coords, 'Sporthalle')
        expect(url).toBe(`maps:?q=47.3769,8.5417&ll=47.3769,8.5417`)
      })

      it('prefers address over coordinates', () => {
        const coords = { latitude: 47.3769, longitude: 8.5417 }
        const url = buildNativeMapsUrl('Sportstrasse 1', coords, 'Sporthalle')
        expect(url).toContain('maps:?q=')
        expect(url).not.toContain('ll=')
      })
    })

    describe('on iPad devices', () => {
      beforeEach(() => {
        vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPad)' })
      })

      it('builds maps: URL for iPad', () => {
        const url = buildNativeMapsUrl('Test Address', null, 'Hall')
        expect(url).toContain('maps:')
      })
    })

    describe('on iPod devices', () => {
      beforeEach(() => {
        vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPod)' })
      })

      it('builds maps: URL for iPod', () => {
        const url = buildNativeMapsUrl('Test Address', null, 'Hall')
        expect(url).toContain('maps:')
      })
    })

    describe('on Android devices', () => {
      beforeEach(() => {
        vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 12)' })
      })

      it('builds geo: URL with address', () => {
        const url = buildNativeMapsUrl('Bahnhofstrasse 10, 8001 Zürich', null, 'Halle')
        expect(url).toBe(`geo:0,0?q=${encodeURIComponent('Bahnhofstrasse 10, 8001 Zürich')}`)
      })

      it('builds geo: URL with coordinates and hall name', () => {
        const coords = { latitude: 47.3769, longitude: 8.5417 }
        const url = buildNativeMapsUrl(null, coords, 'Sporthalle Zürich')
        expect(url).toBe(
          `geo:47.3769,8.5417?q=47.3769,8.5417(${encodeURIComponent('Sporthalle Zürich')})`
        )
      })
    })

    describe('on other platforms', () => {
      beforeEach(() => {
        vi.stubGlobal('navigator', {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        })
      })

      it('builds geo: URL for desktop browsers', () => {
        const url = buildNativeMapsUrl('Test Address', null, 'Hall')
        expect(url).toContain('geo:')
      })
    })

    it('returns null when no address and no coordinates', () => {
      const url = buildNativeMapsUrl(null, null, 'Sporthalle')
      expect(url).toBeNull()
    })
  })

  describe('buildMapsUrls', () => {
    beforeEach(() => {
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone)' })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('returns all null values for null input', () => {
      const result = buildMapsUrls(null, 'Sporthalle')
      expect(result).toEqual({
        googleMapsUrl: null,
        nativeMapsUrl: null,
        fullAddress: null,
      })
    })

    it('returns all null values for undefined input', () => {
      const result = buildMapsUrls(undefined, 'Sporthalle')
      expect(result).toEqual({
        googleMapsUrl: null,
        nativeMapsUrl: null,
        fullAddress: null,
      })
    })

    it('builds Google Maps URL from Plus Code', () => {
      const address: PostalAddress = {
        geographicalLocation: {
          plusCode: '8FVC9G8F+5W',
        },
      }
      const result = buildMapsUrls(address, 'Sporthalle')
      expect(result.googleMapsUrl).toContain('google.com/maps')
      expect(result.googleMapsUrl).toContain('8FVC9G8F%2B5W')
    })

    it('builds native maps URL from address', () => {
      const address: PostalAddress = {
        combinedAddress: 'Sportstrasse 1, 8000 Zürich',
      }
      const result = buildMapsUrls(address, 'Sporthalle')
      expect(result.nativeMapsUrl).toContain('maps:')
      expect(result.fullAddress).toBe('Sportstrasse 1, 8000 Zürich')
    })

    it('builds native maps URL from coordinates when no address', () => {
      const address: PostalAddress = {
        geographicalLocation: {
          latitude: 47.3769,
          longitude: 8.5417,
        },
      }
      const result = buildMapsUrls(address, 'Sporthalle')
      expect(result.nativeMapsUrl).toContain('47.3769')
      expect(result.nativeMapsUrl).toContain('8.5417')
    })

    it('builds all URLs when all data is available', () => {
      const address: PostalAddress = {
        combinedAddress: 'Sportstrasse 1, 8000 Zürich',
        geographicalLocation: {
          plusCode: '8FVC9G8F+5W',
          latitude: 47.3769,
          longitude: 8.5417,
        },
      }
      const result = buildMapsUrls(address, 'Sporthalle')

      expect(result.googleMapsUrl).not.toBeNull()
      expect(result.nativeMapsUrl).not.toBeNull()
      expect(result.fullAddress).toBe('Sportstrasse 1, 8000 Zürich')
    })

    it('handles missing Plus Code gracefully', () => {
      const address: PostalAddress = {
        combinedAddress: 'Sportstrasse 1, 8000 Zürich',
        geographicalLocation: {
          latitude: 47.3769,
          longitude: 8.5417,
        },
      }
      const result = buildMapsUrls(address, 'Sporthalle')

      expect(result.googleMapsUrl).toBeNull()
      expect(result.nativeMapsUrl).not.toBeNull()
      expect(result.fullAddress).toBe('Sportstrasse 1, 8000 Zürich')
    })

    it('handles partial geographicalLocation data', () => {
      const address: PostalAddress = {
        geographicalLocation: {
          latitude: 47.3769,
          // longitude is missing
        },
      }
      const result = buildMapsUrls(address, 'Sporthalle')

      expect(result.googleMapsUrl).toBeNull()
      expect(result.nativeMapsUrl).toBeNull()
      expect(result.fullAddress).toBeNull()
    })

    it('passes hallName to native maps URL builder', () => {
      vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 12)' })

      const address: PostalAddress = {
        geographicalLocation: {
          latitude: 47.3769,
          longitude: 8.5417,
        },
      }
      const result = buildMapsUrls(address, 'Turnhalle Muster')

      expect(result.nativeMapsUrl).toContain(encodeURIComponent('Turnhalle Muster'))
    })
  })
})
