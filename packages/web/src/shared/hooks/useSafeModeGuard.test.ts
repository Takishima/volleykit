import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import * as authStore from '@/shared/stores/auth'
import * as settingsStore from '@/shared/stores/settings'
import { toast } from '@/shared/stores/toast'

import { useSafeModeGuard } from './useSafeModeGuard'

vi.mock('@/shared/stores/auth')
vi.mock('@/shared/stores/settings')
vi.mock('@/shared/stores/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))
vi.mock('@/i18n', () => ({
  t: (key: string) => key,
}))

describe('useSafeModeGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: not in demo mode, safe mode disabled
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({ dataSource: 'api' } as ReturnType<typeof authStore.useAuthStore.getState>)
    )

    vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
      selector({ isSafeModeEnabled: false } as ReturnType<
        typeof settingsStore.useSettingsStore.getState
      >)
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('guard function', () => {
    it('should return false when safe mode is disabled', () => {
      const { result } = renderHook(() => useSafeModeGuard())

      let isBlocked: boolean
      act(() => {
        isBlocked = result.current.guard({
          context: 'test',
          action: 'test action',
        })
      })

      expect(isBlocked!).toBe(false)
      expect(toast.warning).not.toHaveBeenCalled()
    })

    it('should return false when in demo mode, even with safe mode enabled', () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: 'demo' } as ReturnType<typeof authStore.useAuthStore.getState>)
      )
      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >)
      )

      const { result } = renderHook(() => useSafeModeGuard())

      let isBlocked: boolean
      act(() => {
        isBlocked = result.current.guard({
          context: 'test',
          action: 'test action',
        })
      })

      expect(isBlocked!).toBe(false)
      expect(toast.warning).not.toHaveBeenCalled()
    })

    it('should return true and show warning when safe mode is active', () => {
      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >)
      )

      const { result } = renderHook(() => useSafeModeGuard())

      let isBlocked: boolean
      act(() => {
        isBlocked = result.current.guard({
          context: 'useAssignmentActions',
          action: 'game validation',
        })
      })

      expect(isBlocked!).toBe(true)
      expect(toast.warning).toHaveBeenCalledWith('settings.safeModeBlocked')
    })

    it('should call onBlocked callback when blocked', () => {
      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >)
      )

      const onBlocked = vi.fn()
      const { result } = renderHook(() => useSafeModeGuard())

      act(() => {
        result.current.guard({
          context: 'test',
          action: 'test action',
          onBlocked,
        })
      })

      expect(onBlocked).toHaveBeenCalledTimes(1)
    })

    it('should not call onBlocked callback when not blocked', () => {
      const onBlocked = vi.fn()
      const { result } = renderHook(() => useSafeModeGuard())

      act(() => {
        result.current.guard({
          context: 'test',
          action: 'test action',
          onBlocked,
        })
      })

      expect(onBlocked).not.toHaveBeenCalled()
    })
  })

  describe('state exposure', () => {
    it('should expose isDemoMode state', () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: 'demo' } as ReturnType<typeof authStore.useAuthStore.getState>)
      )

      const { result } = renderHook(() => useSafeModeGuard())

      expect(result.current.isDemoMode).toBe(true)
    })

    it('should expose isSafeModeEnabled state', () => {
      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >)
      )

      const { result } = renderHook(() => useSafeModeGuard())

      expect(result.current.isSafeModeEnabled).toBe(true)
    })
  })

  describe('guard function stability', () => {
    it('should return stable guard function reference', () => {
      const { result, rerender } = renderHook(() => useSafeModeGuard())

      const firstGuard = result.current.guard
      rerender()
      const secondGuard = result.current.guard

      expect(firstGuard).toBe(secondGuard)
    })

    it('should update guard function when isDemoMode changes', () => {
      const { result, rerender } = renderHook(() => useSafeModeGuard())

      const firstGuard = result.current.guard

      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: 'demo' } as ReturnType<typeof authStore.useAuthStore.getState>)
      )

      rerender()
      const secondGuard = result.current.guard

      expect(firstGuard).not.toBe(secondGuard)
    })

    it('should update guard function when isSafeModeEnabled changes', () => {
      const { result, rerender } = renderHook(() => useSafeModeGuard())

      const firstGuard = result.current.guard

      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >)
      )

      rerender()
      const secondGuard = result.current.guard

      expect(firstGuard).not.toBe(secondGuard)
    })
  })
})
