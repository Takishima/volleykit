import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 200))

    expect(result.current).toBe('initial')
  })

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'initial' },
    })

    expect(result.current).toBe('initial')

    rerender({ value: 'updated' })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe('updated')
  })

  it('only updates once for multiple rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    rerender({ value: 'abc' })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    rerender({ value: 'abcd' })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(result.current).toBe('abcd')
  })

  it('resets timer when value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: 'first' },
    })

    rerender({ value: 'second' })

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe('first')

    rerender({ value: 'third' })

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe('first')

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('third')
  })

  it('works with different types', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 100), {
      initialProps: { value: 42 },
    })

    expect(result.current).toBe(42)

    rerender({ value: 100 })
    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current).toBe(100)
  })

  it('handles delay changes', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: 'test', delay: 200 },
    })

    rerender({ value: 'updated', delay: 500 })

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('test')

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('updated')
  })
})
