import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import { useCurrentMinute, useTodayKey } from './useClock'

afterEach(() => {
  vi.useRealTimers()
})

describe('useTodayKey', () => {
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

describe('useCurrentMinute', () => {
  it('returns the current time floored to the minute', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 25, 15, 30, 45, 500))

    const { result } = renderHook(() => useCurrentMinute())

    expect(result.current).toBe(new Date(2026, 9, 25, 15, 30).getTime())
  })

  it('is stable within the same minute', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 25, 15, 30, 5))
    const { result, rerender } = renderHook(() => useCurrentMinute())
    const first = result.current

    vi.setSystemTime(new Date(2026, 9, 25, 15, 30, 55))
    rerender()

    expect(result.current).toBe(first)
  })

  it('advances on a render after a minute boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 25, 15, 30, 55))
    const { result, rerender } = renderHook(() => useCurrentMinute())

    vi.setSystemTime(new Date(2026, 9, 25, 15, 31, 2))
    rerender()

    expect(result.current).toBe(new Date(2026, 9, 25, 15, 31).getTime())
  })
})
