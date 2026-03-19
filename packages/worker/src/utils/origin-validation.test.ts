import { describe, it, expect } from 'vitest'

import { isAllowedOrigin, parseAllowedOrigins, validateAllowedOrigins } from './origin-validation'

describe('Origin Validation', () => {
  describe('parseAllowedOrigins', () => {
    it('parses comma-separated origins', () => {
      const result = parseAllowedOrigins('https://a.com, https://b.com')
      expect(result).toEqual(['https://a.com', 'https://b.com'])
    })

    it('trims whitespace', () => {
      const result = parseAllowedOrigins('  https://a.com  ,  https://b.com  ')
      expect(result).toEqual(['https://a.com', 'https://b.com'])
    })

    it('filters empty strings', () => {
      const result = parseAllowedOrigins('https://a.com,,https://b.com,')
      expect(result).toEqual(['https://a.com', 'https://b.com'])
    })

    it('handles single origin', () => {
      const result = parseAllowedOrigins('https://example.com')
      expect(result).toEqual(['https://example.com'])
    })
  })

  describe('validateAllowedOrigins', () => {
    it('accepts valid HTTPS origins', () => {
      expect(() => validateAllowedOrigins(['https://example.com'])).not.toThrow()
    })

    it('accepts valid HTTP origins', () => {
      expect(() => validateAllowedOrigins(['http://localhost:3000'])).not.toThrow()
    })

    it('rejects origins with paths', () => {
      expect(() => validateAllowedOrigins(['https://example.com/path'])).toThrow(
        'Origin should not include path, query, or fragment'
      )
    })

    it('rejects origins with query strings', () => {
      expect(() => validateAllowedOrigins(['https://example.com?foo=bar'])).toThrow(
        'Origin should not include path, query, or fragment'
      )
    })

    it('rejects origins with fragments', () => {
      expect(() => validateAllowedOrigins(['https://example.com#section'])).toThrow(
        'Origin should not include path, query, or fragment'
      )
    })

    it('rejects non-http protocols', () => {
      expect(() => validateAllowedOrigins(['ftp://example.com'])).toThrow(
        'Origin must use http or https protocol'
      )
    })

    it('rejects invalid URLs', () => {
      expect(() => validateAllowedOrigins(['not-a-url'])).toThrow('Invalid origin format')
    })
  })

  describe('isAllowedOrigin', () => {
    const allowedOrigins = ['https://example.com', 'https://test.com']

    it('returns true for allowed origin', () => {
      expect(isAllowedOrigin('https://example.com', allowedOrigins)).toBe(true)
    })

    it('returns false for disallowed origin', () => {
      expect(isAllowedOrigin('https://malicious.com', allowedOrigins)).toBe(false)
    })

    it('returns false for null origin', () => {
      expect(isAllowedOrigin(null, allowedOrigins)).toBe(false)
    })

    it('handles trailing slashes', () => {
      expect(isAllowedOrigin('https://example.com/', allowedOrigins)).toBe(true)
    })

    it('is case-insensitive (RFC 6454)', () => {
      expect(isAllowedOrigin('https://EXAMPLE.com', allowedOrigins)).toBe(true)
    })
  })
})
