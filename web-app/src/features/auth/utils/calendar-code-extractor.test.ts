import { describe, it, expect } from 'vitest'

import {
  extractCalendarCodeFromHtml,
  isValidCalendarCode,
  getCalendarUrl,
} from './calendar-code-extractor'

describe('calendar-code-extractor', () => {
  describe('extractCalendarCodeFromHtml', () => {
    it('should return null for empty HTML', () => {
      expect(extractCalendarCodeFromHtml('')).toBeNull()
    })

    it('should return null for HTML without calendar code', () => {
      const html = '<html><body>No calendar code here</body></html>'
      expect(extractCalendarCodeFromHtml(html)).toBeNull()
    })

    it('should extract code from iCal URL path', () => {
      const html = '<a href="/iCal/referee/ABC123">Calendar</a>'
      expect(extractCalendarCodeFromHtml(html)).toBe('ABC123')
    })

    it('should extract code from indoor iCal URL path', () => {
      const html = '<a href="/indoor/iCal/referee/XYZ789">Calendar</a>'
      expect(extractCalendarCodeFromHtml(html)).toBe('XYZ789')
    })

    it('should extract code from full HTTPS URL', () => {
      const html = 'https://volleymanager.volleyball.ch/iCal/referee/TEST12'
      expect(extractCalendarCodeFromHtml(html)).toBe('TEST12')
    })

    it('should extract code from webcal URL', () => {
      const html = 'webcal://volleymanager.volleyball.ch/iCal/referee/CODE99'
      expect(extractCalendarCodeFromHtml(html)).toBe('CODE99')
    })

    it('should extract code from href attribute', () => {
      const html = `<a href="https://volleymanager.volleyball.ch/iCal/referee/ABCDEF">Subscribe</a>`
      expect(extractCalendarCodeFromHtml(html)).toBe('ABCDEF')
    })

    it('should extract code from calendar path', () => {
      const html = '/calendar/QWERTY'
      expect(extractCalendarCodeFromHtml(html)).toBe('QWERTY')
    })

    it('should extract code from JSON iCalHash property', () => {
      const html = '{"iCalHash": "HASH01"}'
      expect(extractCalendarCodeFromHtml(html)).toBe('HASH01')
    })

    it('should extract code from Vue component prop', () => {
      const html = '<calendar-component :ical-hash="VUEABC"></calendar-component>'
      expect(extractCalendarCodeFromHtml(html)).toBe('VUEABC')
    })

    it('should handle standard VolleyManager iCal path', () => {
      // Real VolleyManager uses "iCal" (capital C, lowercase al)
      const html = '/iCal/referee/UPPER1'
      expect(extractCalendarCodeFromHtml(html)).toBe('UPPER1')
    })

    it('should not extract invalid codes (too short)', () => {
      const html = '/iCal/referee/SHORT'
      expect(extractCalendarCodeFromHtml(html)).toBeNull()
    })

    it('should not extract invalid codes (too long)', () => {
      const html = '/iCal/referee/TOOLONGCODE'
      expect(extractCalendarCodeFromHtml(html)).toBeNull()
    })

    it('should not extract codes with special characters', () => {
      const html = '/iCal/referee/ABC-12'
      expect(extractCalendarCodeFromHtml(html)).toBeNull()
    })
  })

  describe('isValidCalendarCode', () => {
    it('should return true for valid 6-character alphanumeric code', () => {
      expect(isValidCalendarCode('ABC123')).toBe(true)
      expect(isValidCalendarCode('abcdef')).toBe(true)
      expect(isValidCalendarCode('ABCDEF')).toBe(true)
      expect(isValidCalendarCode('123456')).toBe(true)
    })

    it('should return false for codes that are too short', () => {
      expect(isValidCalendarCode('ABC12')).toBe(false)
      expect(isValidCalendarCode('')).toBe(false)
    })

    it('should return false for codes that are too long', () => {
      expect(isValidCalendarCode('ABC1234')).toBe(false)
    })

    it('should return false for codes with special characters', () => {
      expect(isValidCalendarCode('ABC-12')).toBe(false)
      expect(isValidCalendarCode('ABC_12')).toBe(false)
      expect(isValidCalendarCode('ABC.12')).toBe(false)
    })
  })

  describe('getCalendarUrl', () => {
    it('should construct URL with given code', () => {
      const url = getCalendarUrl('ABC123', '')
      expect(url).toBe('/iCal/referee/ABC123')
    })

    it('should prepend proxy URL when provided', () => {
      const url = getCalendarUrl('ABC123', 'https://proxy.example.com')
      expect(url).toBe('https://proxy.example.com/iCal/referee/ABC123')
    })
  })
})
