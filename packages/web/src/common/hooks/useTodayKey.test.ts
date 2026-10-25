import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { formatDateKey, useTodayKey } from './useTodayKey'

describe('useTodayKey', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the local date as a YYYY-MM-DD key', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 25, 15, 30))

    const { result } = renderHook(() => useTodayKey())

    expect(result.current).toBe('2026-10-25')
  })

  it('rolls over to the next day on a render after midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 25, 23, 59))
    const { result, rerender } = renderHook(() => useTodayKey())

    vi.setSystemTime(new Date(2026, 9, 26, 0, 1))
    rerender()

    expect(result.current).toBe('2026-10-26')
  })
})

describe('formatDateKey', () => {
  it('pads month and day', () => {
    expect(formatDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})
