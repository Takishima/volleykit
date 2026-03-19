import { renderHook, act, waitFor } from '@testing-library/react'
import { enUS } from 'date-fns/locale/en-US'
import { describe, it, expect, beforeEach } from 'vitest'

import { useLanguageStore } from '@/shared/stores/language'

import { useDateFormat, getDateLocale, safeParseISO } from './useDateFormat'

// Pattern for validating HH:mm time format (e.g., "14:30", "09:15")
const TIME_FORMAT_PATTERN = /^\d{2}:\d{2}$/

describe('useDateFormat', () => {
  beforeEach(() => {
    act(() => {
      useLanguageStore.getState().changeLocale('de')
    })
  })

  describe('basic date formatting', () => {
    it('formats dates correctly', () => {
      const { result } = renderHook(() => useDateFormat('2024-03-15T14:30:00Z'))

      expect(result.current.date).toBeInstanceOf(Date)
      // Time is formatted in local timezone, so just check format pattern
      expect(result.current.timeLabel).toMatch(TIME_FORMAT_PATTERN)
      expect(result.current.dateLabel).toBeDefined()
    })

    it('handles null date string', () => {
      const { result } = renderHook(() => useDateFormat(null))

      expect(result.current.date).toBeNull()
      expect(result.current.dateLabel).toBe('TBD')
      expect(result.current.timeLabel).toBe('')
    })

    it('handles undefined date string', () => {
      const { result } = renderHook(() => useDateFormat(undefined))

      expect(result.current.date).toBeNull()
      expect(result.current.dateLabel).toBe('TBD')
    })

    it('handles invalid date string', () => {
      const { result } = renderHook(() => useDateFormat('not-a-date'))

      expect(result.current.date).toBeNull()
      expect(result.current.dateLabel).toBe('TBD')
    })
  })

  describe('locale switching', () => {
    it('re-renders when locale changes', async () => {
      const { result } = renderHook(() => useDateFormat('2024-03-15T14:30:00Z'))

      const initialLabel = result.current.dateLabel

      act(() => {
        useLanguageStore.getState().changeLocale('fr')
      })

      await waitFor(() => {
        expect(result.current.dateLabel).not.toBe(initialLabel)
      })
    })

    it('handles rapid locale switches correctly', async () => {
      const { result } = renderHook(() => useDateFormat('2024-03-15T14:30:00Z'))

      // Rapidly switch locales
      act(() => {
        useLanguageStore.getState().changeLocale('de')
      })
      act(() => {
        useLanguageStore.getState().changeLocale('fr')
      })
      act(() => {
        useLanguageStore.getState().changeLocale('it')
      })

      // Wait for the final locale to be applied
      await waitFor(() => {
        // The hook should settle with Italian locale
        const store = useLanguageStore.getState()
        expect(store.locale).toBe('it')
      })

      // Date should still be valid and formatted
      expect(result.current.date).toBeInstanceOf(Date)
      // Time is formatted in local timezone, so just check format pattern
      expect(result.current.timeLabel).toMatch(TIME_FORMAT_PATTERN)
    })
  })

  describe('date status checks', () => {
    it('identifies past dates correctly', () => {
      const { result } = renderHook(() => useDateFormat('2020-01-01T12:00:00Z'))

      expect(result.current.isPast).toBe(true)
      expect(result.current.isToday).toBe(false)
      expect(result.current.isTomorrow).toBe(false)
    })

    it('returns correct status for invalid dates', () => {
      const { result } = renderHook(() => useDateFormat(null))

      expect(result.current.isPast).toBe(false)
      expect(result.current.isToday).toBe(false)
      expect(result.current.isTomorrow).toBe(false)
    })
  })
})

describe('getDateLocale', () => {
  it('returns enUS as fallback for unknown locale', () => {
    const locale = getDateLocale('unknown')
    expect(locale).toBe(enUS)
  })

  it('returns cached locale if available', () => {
    const locale = getDateLocale('en')
    expect(locale).toBe(enUS)
  })
})

describe('safeParseISO', () => {
  it('parses valid ISO date strings', () => {
    const date = safeParseISO('2024-03-15T14:30:00Z')
    expect(date).toBeInstanceOf(Date)
    expect(date?.toISOString()).toBe('2024-03-15T14:30:00.000Z')
  })

  it('returns null for null input', () => {
    expect(safeParseISO(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(safeParseISO(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(safeParseISO('')).toBeNull()
  })

  it('returns null for invalid date string', () => {
    expect(safeParseISO('not-a-date')).toBeNull()
  })
})
