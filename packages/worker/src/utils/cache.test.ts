import { describe, it, expect } from 'vitest'

import { isDynamicContent, noCacheHeaders } from './cache'

describe('Cache Control Headers', () => {
  it('returns strict no-cache headers', () => {
    const headers = noCacheHeaders()
    expect(headers['Cache-Control']).toBe('no-store, no-cache, must-revalidate, max-age=0')
  })

  it('includes Pragma no-cache for HTTP/1.0 compatibility', () => {
    const headers = noCacheHeaders()
    expect(headers['Pragma']).toBe('no-cache')
  })

  it('includes Expires header set to 0', () => {
    const headers = noCacheHeaders()
    expect(headers['Expires']).toBe('0')
  })

  it('contains all required cache-busting headers', () => {
    const headers = noCacheHeaders()
    const keys = Object.keys(headers)
    expect(keys).toContain('Cache-Control')
    expect(keys).toContain('Pragma')
    expect(keys).toContain('Expires')
    expect(keys.length).toBe(3)
  })
})

describe('Dynamic Content Detection', () => {
  describe('isDynamicContent', () => {
    it('returns true for null content type (unknown = dynamic)', () => {
      expect(isDynamicContent(null)).toBe(true)
    })

    it('returns true for HTML content', () => {
      expect(isDynamicContent('text/html')).toBe(true)
      expect(isDynamicContent('text/html; charset=utf-8')).toBe(true)
      expect(isDynamicContent('TEXT/HTML')).toBe(true)
    })

    it('returns true for JSON content', () => {
      expect(isDynamicContent('application/json')).toBe(true)
      expect(isDynamicContent('application/json; charset=utf-8')).toBe(true)
      expect(isDynamicContent('APPLICATION/JSON')).toBe(true)
    })

    it('returns true for form data content', () => {
      expect(isDynamicContent('application/x-www-form-urlencoded')).toBe(true)
    })

    it('returns false for static content types', () => {
      expect(isDynamicContent('image/png')).toBe(false)
      expect(isDynamicContent('image/jpeg')).toBe(false)
      expect(isDynamicContent('application/pdf')).toBe(false)
      expect(isDynamicContent('text/css')).toBe(false)
      expect(isDynamicContent('application/javascript')).toBe(false)
    })

    it('returns false for calendar content (iCal has separate cache)', () => {
      expect(isDynamicContent('text/calendar')).toBe(false)
    })
  })
})
