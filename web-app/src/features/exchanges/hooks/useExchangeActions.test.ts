import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { GameExchange } from '@/api/client'
import { MODAL_CLEANUP_DELAY } from '@/features/assignments/utils/assignment-helpers'
import * as useConvocations from '@/features/validation/hooks/useConvocations'
import * as authStore from '@/shared/stores/auth'
import * as settingsStore from '@/shared/stores/settings'
import { toast } from '@/shared/stores/toast'

import { useExchangeActions } from './useExchangeActions'

import type { UseMutationResult } from '@tanstack/react-query'

vi.mock('@/features/validation/hooks/useConvocations')
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
vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}))
vi.mock('@/i18n', () => ({
  t: (key: string) => key,
  getLocale: () => 'en',
  setLocale: vi.fn(),
  setLocaleImmediate: vi.fn(),
}))

function createMockExchange(): GameExchange {
  return {
    __identity: 'test-exchange-1',
    status: 'open',
    refereePosition: 'head-one',
    refereeGame: {
      activeRefereeConvocationFirstHeadReferee: {
        __identity: 'test-convocation-1',
      },
      game: {
        startingDateTime: '2025-12-15T18:00:00Z',
        encounter: {
          teamHome: { name: 'Team A' },
          teamAway: { name: 'Team B' },
        },
        hall: {
          name: 'Main Arena',
        },
      },
    },
  } as GameExchange
}

const mockExchange = createMockExchange()

const MOCK_ASYNC_OPERATION_DELAY_MS = 100

describe('useExchangeActions', () => {
  const mockApplyMutate = vi.fn()
  const mockRemoveOwnMutate = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
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

    vi.mocked(useConvocations.useApplyForExchange).mockReturnValue({
      mutateAsync: mockApplyMutate,
    } as unknown as UseMutationResult<void, Error, string>)

    vi.mocked(useConvocations.useRemoveOwnExchange).mockReturnValue({
      mutateAsync: mockRemoveOwnMutate,
    } as unknown as UseMutationResult<void, Error, string>)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with closed modals', () => {
    const { result } = renderHook(() => useExchangeActions())

    expect(result.current.takeOverModal.isOpen).toBe(false)
    expect(result.current.takeOverModal.exchange).toBeNull()
    expect(result.current.removeFromExchangeModal.isOpen).toBe(false)
    expect(result.current.removeFromExchangeModal.exchange).toBeNull()
  })

  it('should open and close take over modal', () => {
    const { result } = renderHook(() => useExchangeActions())

    act(() => {
      result.current.takeOverModal.open(mockExchange)
    })

    expect(result.current.takeOverModal.isOpen).toBe(true)
    expect(result.current.takeOverModal.exchange).toBe(mockExchange)

    act(() => {
      result.current.takeOverModal.close()
    })

    expect(result.current.takeOverModal.isOpen).toBe(false)
  })

  it('should open and close remove from exchange modal', () => {
    const { result } = renderHook(() => useExchangeActions())

    act(() => {
      result.current.removeFromExchangeModal.open(mockExchange)
    })

    expect(result.current.removeFromExchangeModal.isOpen).toBe(true)
    expect(result.current.removeFromExchangeModal.exchange).toBe(mockExchange)

    act(() => {
      result.current.removeFromExchangeModal.close()
    })

    expect(result.current.removeFromExchangeModal.isOpen).toBe(false)
  })

  it('should cleanup exchange data after modal close delay', () => {
    const { result } = renderHook(() => useExchangeActions())

    act(() => {
      result.current.takeOverModal.open(mockExchange)
    })

    expect(result.current.takeOverModal.exchange).toBe(mockExchange)

    act(() => {
      result.current.takeOverModal.close()
    })

    // Immediately after close, exchange should still be there
    expect(result.current.takeOverModal.exchange).toBe(mockExchange)

    // Fast-forward to trigger cleanup
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY)
    })

    expect(result.current.takeOverModal.exchange).toBeNull()
  })

  it('should cleanup timeout on unmount', () => {
    const { result, unmount } = renderHook(() => useExchangeActions())

    act(() => {
      result.current.takeOverModal.open(mockExchange)
    })

    act(() => {
      result.current.takeOverModal.close()
    })

    // Unmount before timeout completes
    unmount()

    // Should not throw or cause memory leak
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY)
    })
  })

  it('should clear previous timeout when closing multiple times', () => {
    const { result } = renderHook(() => useExchangeActions())

    act(() => {
      result.current.takeOverModal.open(mockExchange)
    })

    act(() => {
      result.current.takeOverModal.close()
    })

    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Open and close again before first timeout completes
    act(() => {
      result.current.takeOverModal.open(mockExchange)
    })

    act(() => {
      result.current.takeOverModal.close()
    })

    // First timeout should be cleared, only second one should fire
    act(() => {
      vi.advanceTimersByTime(MODAL_CLEANUP_DELAY)
    })

    expect(result.current.takeOverModal.exchange).toBeNull()
  })

  it('should handle take over action successfully', async () => {
    vi.useRealTimers()
    mockApplyMutate.mockResolvedValue(undefined)

    const { result } = renderHook(() => useExchangeActions())

    await act(async () => {
      await result.current.handleTakeOver(mockExchange)
    })

    expect(mockApplyMutate).toHaveBeenCalledWith(mockExchange.__identity)
    expect(toast.success).toHaveBeenCalledWith('exchange.applySuccess')
  })

  it('should handle take over action failure', async () => {
    vi.useRealTimers()
    mockApplyMutate.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useExchangeActions())

    await act(async () => {
      await result.current.handleTakeOver(mockExchange)
    })

    expect(mockApplyMutate).toHaveBeenCalledWith(mockExchange.__identity)
    expect(toast.error).toHaveBeenCalledWith('exchange.applyError')
  })

  it('should handle remove from exchange action successfully', async () => {
    vi.useRealTimers()
    mockRemoveOwnMutate.mockResolvedValue(undefined)

    const { result } = renderHook(() => useExchangeActions())

    await act(async () => {
      await result.current.handleRemoveFromExchange(mockExchange)
    })

    // Should use convocation ID from the exchange
    expect(mockRemoveOwnMutate).toHaveBeenCalledWith('test-convocation-1')
    expect(toast.success).toHaveBeenCalledWith('exchange.removeSuccess')
  })

  it('should handle remove from exchange action failure', async () => {
    vi.useRealTimers()
    mockRemoveOwnMutate.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useExchangeActions())

    await act(async () => {
      await result.current.handleRemoveFromExchange(mockExchange)
    })

    expect(mockRemoveOwnMutate).toHaveBeenCalledWith('test-convocation-1')
    expect(toast.error).toHaveBeenCalledWith('exchange.removeError')
  })

  it('should handle remove from exchange when convocation ID is missing', async () => {
    vi.useRealTimers()
    const exchangeWithoutConvocation = {
      ...mockExchange,
      refereePosition: undefined,
    } as GameExchange

    const { result } = renderHook(() => useExchangeActions())

    await act(async () => {
      await result.current.handleRemoveFromExchange(exchangeWithoutConvocation)
    })

    // Should show error because convocation ID could not be found
    expect(mockRemoveOwnMutate).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('exchange.removeError')
  })

  it('should prevent duplicate take over actions', async () => {
    vi.useRealTimers()
    mockApplyMutate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, MOCK_ASYNC_OPERATION_DELAY_MS))
    )

    const { result } = renderHook(() => useExchangeActions())

    // Try to trigger action twice concurrently
    await act(async () => {
      await Promise.all([
        result.current.handleTakeOver(mockExchange),
        result.current.handleTakeOver(mockExchange),
      ])
    })

    // Should only be called once
    expect(mockApplyMutate).toHaveBeenCalledTimes(1)
  })

  it('should prevent duplicate remove from exchange actions', async () => {
    vi.useRealTimers()
    mockRemoveOwnMutate.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, MOCK_ASYNC_OPERATION_DELAY_MS))
    )

    const { result } = renderHook(() => useExchangeActions())

    // Try to trigger action twice concurrently
    await act(async () => {
      await Promise.all([
        result.current.handleRemoveFromExchange(mockExchange),
        result.current.handleRemoveFromExchange(mockExchange),
      ])
    })

    // Should only be called once
    expect(mockRemoveOwnMutate).toHaveBeenCalledTimes(1)
  })

  it('should handle rapid open/close cycles correctly', () => {
    const { result } = renderHook(() => useExchangeActions())

    // Rapidly toggle modal
    act(() => {
      result.current.takeOverModal.open(mockExchange)
    })
    act(() => {
      result.current.takeOverModal.close()
    })
    act(() => {
      result.current.takeOverModal.open(mockExchange)
    })

    expect(result.current.takeOverModal.isOpen).toBe(true)
    expect(result.current.takeOverModal.exchange).toBe(mockExchange)
  })

  it('should handle rapid open/close cycles for removeFromExchange modal', () => {
    const { result } = renderHook(() => useExchangeActions())

    // Rapidly toggle modal
    act(() => {
      result.current.removeFromExchangeModal.open(mockExchange)
    })
    act(() => {
      result.current.removeFromExchangeModal.close()
    })
    act(() => {
      result.current.removeFromExchangeModal.open(mockExchange)
    })

    expect(result.current.removeFromExchangeModal.isOpen).toBe(true)
    expect(result.current.removeFromExchangeModal.exchange).toBe(mockExchange)
  })

  describe('demo mode behavior', () => {
    beforeEach(() => {
      vi.useRealTimers()
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: 'demo' } as ReturnType<typeof authStore.useAuthStore.getState>)
      )
    })

    it('should use mutation for take over in demo mode (routed to mock API)', async () => {
      const { result } = renderHook(() => useExchangeActions())

      await act(async () => {
        await result.current.handleTakeOver(mockExchange)
      })

      // In the new architecture, demo mode uses the same mutations
      // which are routed to the mock API via getApiClient
      expect(mockApplyMutate).toHaveBeenCalledWith(mockExchange.__identity)
    })

    it('should use mutation for remove from exchange in demo mode (routed to mock API)', async () => {
      const { result } = renderHook(() => useExchangeActions())

      await act(async () => {
        await result.current.handleRemoveFromExchange(mockExchange)
      })

      // In the new architecture, demo mode uses the same mutations
      // which are routed to the mock API via getApiClient
      expect(mockRemoveOwnMutate).toHaveBeenCalledWith('test-convocation-1')
    })

    it('should close modal after demo mode take over', async () => {
      const { result } = renderHook(() => useExchangeActions())

      act(() => {
        result.current.takeOverModal.open(mockExchange)
      })

      expect(result.current.takeOverModal.isOpen).toBe(true)

      await act(async () => {
        await result.current.handleTakeOver(mockExchange)
      })

      expect(result.current.takeOverModal.isOpen).toBe(false)
    })

    it('should close modal after demo mode remove from exchange', async () => {
      const { result } = renderHook(() => useExchangeActions())

      act(() => {
        result.current.removeFromExchangeModal.open(mockExchange)
      })

      expect(result.current.removeFromExchangeModal.isOpen).toBe(true)

      await act(async () => {
        await result.current.handleRemoveFromExchange(mockExchange)
      })

      expect(result.current.removeFromExchangeModal.isOpen).toBe(false)
    })
  })

  describe('safe mode guards', () => {
    beforeEach(() => {
      vi.useRealTimers()
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: 'api' } as ReturnType<typeof authStore.useAuthStore.getState>)
      )
      vi.mocked(settingsStore.useSettingsStore).mockImplementation((selector) =>
        selector({ isSafeModeEnabled: true } as ReturnType<
          typeof settingsStore.useSettingsStore.getState
        >)
      )
    })

    it('should block take over when safe mode is enabled', async () => {
      const { result } = renderHook(() => useExchangeActions())

      await act(async () => {
        await result.current.handleTakeOver(mockExchange)
      })

      expect(mockApplyMutate).not.toHaveBeenCalled()
      expect(toast.warning).toHaveBeenCalledWith('settings.safeModeBlocked')
    })

    it('should block remove from exchange when safe mode is enabled', async () => {
      const { result } = renderHook(() => useExchangeActions())

      await act(async () => {
        await result.current.handleRemoveFromExchange(mockExchange)
      })

      expect(mockRemoveOwnMutate).not.toHaveBeenCalled()
      expect(toast.warning).toHaveBeenCalledWith('settings.safeModeBlocked')
    })

    it('should not block operations in demo mode even with safe mode enabled', async () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({ dataSource: 'demo' } as ReturnType<typeof authStore.useAuthStore.getState>)
      )

      const { result } = renderHook(() => useExchangeActions())

      await act(async () => {
        await result.current.handleTakeOver(mockExchange)
      })

      // In demo mode, operations are allowed even with safe mode enabled
      // because demo mode uses local data and poses no risk
      expect(mockApplyMutate).toHaveBeenCalledWith(mockExchange.__identity)
    })
  })
})
