import { describe, it, expect } from 'vitest'

import { formatPhoneNumber } from './phone-formatter'

describe('formatPhoneNumber', () => {
  describe('Swiss local numbers (starting with 0)', () => {
    it('formats mobile number without spaces', () => {
      expect(formatPhoneNumber('0791234567')).toBe('+41 79 123 45 67')
    })

    it('formats mobile number with spaces already present', () => {
      expect(formatPhoneNumber('079 123 45 67')).toBe('+41 79 123 45 67')
    })

    it('formats landline number', () => {
      expect(formatPhoneNumber('0441234567')).toBe('+41 44 123 45 67')
    })
  })

  describe('Swiss international numbers (starting with +41)', () => {
    it('formats already-international number without spaces', () => {
      expect(formatPhoneNumber('+41791234567')).toBe('+41 79 123 45 67')
    })

    it('re-formats already-spaced Swiss number', () => {
      expect(formatPhoneNumber('+41 79 123 45 67')).toBe('+41 79 123 45 67')
    })

    it('formats number with dashes', () => {
      expect(formatPhoneNumber('+41-79-123-45-67')).toBe('+41 79 123 45 67')
    })
  })

  describe('numbers with 00 prefix', () => {
    it('converts 0041 prefix to +41 format', () => {
      expect(formatPhoneNumber('0041791234567')).toBe('+41 79 123 45 67')
    })
  })

  describe('non-Swiss international numbers', () => {
    it('returns stripped e164 for non-CH numbers', () => {
      expect(formatPhoneNumber('+33612345678')).toBe('+33612345678')
    })

    it('strips spaces from non-CH numbers', () => {
      expect(formatPhoneNumber('+33 6 12 34 56 78')).toBe('+33612345678')
    })
  })

  describe('unrecognised formats', () => {
    it('returns raw string when format is unknown', () => {
      expect(formatPhoneNumber('not-a-number')).toBe('not-a-number')
    })
  })
})
