import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { usePerAssociationFlag } from './usePerAssociationFlag'

describe('usePerAssociationFlag', () => {
  it('falls back to the default when the association has no entry', () => {
    const { result } = renderHook(() => usePerAssociationFlag({}, vi.fn(), 'SV', true))

    expect(result.current[0]).toBe(true)
  })

  it('reads the stored value for the active association', () => {
    const { result } = renderHook(() =>
      usePerAssociationFlag({ SV: false, SVRBA: true }, vi.fn(), 'SV', true)
    )

    expect(result.current[0]).toBe(false)
  })

  it('writes the flipped value through the setter', () => {
    const setter = vi.fn()
    const { result } = renderHook(() => usePerAssociationFlag({ SV: false }, setter, 'SV', true))

    act(() => result.current[1]())

    expect(setter).toHaveBeenCalledWith('SV', true)
  })

  it('does nothing without an active association', () => {
    const setter = vi.fn()
    const { result } = renderHook(() => usePerAssociationFlag({}, setter, undefined, true))

    act(() => result.current[1]())

    expect(result.current[0]).toBe(true)
    expect(setter).not.toHaveBeenCalled()
  })
})
