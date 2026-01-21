import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { GameExchange } from '@/api/client'
import * as useConvocations from '@/features/validation/hooks/useConvocations'
import * as authStore from '@/shared/stores/auth'
import * as demoStore from '@/shared/stores/demo'
import * as settingsStore from '@/shared/stores/settings'

import { ExchangePage } from './ExchangePage'

import type { UseQueryResult } from '@tanstack/react-query'

// Mock useTour to disable tour mode during tests (see src/test/mocks.ts for shared pattern)
const mockUseTour = vi.hoisted(() => ({
  useTour: () => ({
    isActive: false,
    isTourMode: false,
    showDummyData: false,
    startTour: vi.fn(),
    endTour: vi.fn(),
    currentStep: 0,
    nextStep: vi.fn(),
    shouldShow: false,
  }),
}))

vi.mock('@/features/validation/hooks/useConvocations')
vi.mock('@/shared/stores/auth')
vi.mock('@/shared/stores/demo')
vi.mock('@/shared/stores/settings')
vi.mock('@/shared/hooks/useTour', () => mockUseTour)
vi.mock('@/features/assignments/hooks/useCalendarConflicts', () => ({
  useCalendarConflicts: () => ({
    conflicts: new Map(),
    assignments: [],
    isLoading: false,
    isError: false,
    error: null,
    hasCalendarCode: false,
  }),
}))
vi.mock('@/features/auth/hooks/useActiveAssociation', () => ({
  useActiveAssociationCode: () => 'TEST',
}))
vi.mock('@/shared/hooks/useTravelTime', () => ({
  useTravelTimeAvailable: () => false,
}))
vi.mock('@/shared/hooks/useTravelTimeFilter', () => ({
  useTravelTimeFilter: () => ({
    exchangesWithTravelTime: null,
    filteredExchanges: null,
    isLoading: false,
    filterByTravelTime: () => true,
    isAvailable: false,
  }),
}))
vi.mock('@/shared/hooks/useExchangeActions', () => ({
  useExchangeActions: () => ({
    takeOverModal: {
      isOpen: false,
      exchange: null,
      open: vi.fn(),
      close: vi.fn(),
    },
    removeFromExchangeModal: {
      isOpen: false,
      exchange: null,
      open: vi.fn(),
      close: vi.fn(),
    },
    handleTakeOver: vi.fn(),
    handleRemoveFromExchange: vi.fn(),
  }),
}))

function createMockExchange(overrides: Partial<GameExchange> = {}): GameExchange {
  return {
    __identity: `exchange-${Math.random()}`,
    status: 'open',
    requiredRefereeLevel: 'N2',
    requiredRefereeLevelGradationValue: '2',
    refereeGame: {
      game: {
        startingDateTime: '2025-12-15T18:00:00Z',
        encounter: {
          teamHome: { name: 'Team A' },
          teamAway: { name: 'Team B' },
        },
        hall: { name: 'Main Arena' },
      },
    },
    ...overrides,
  } as GameExchange
}

function createMockQueryResult(
  data: GameExchange[] | undefined,
  isLoading = false,
  error: Error | null = null
): UseQueryResult<GameExchange[], Error> {
  return {
    data,
    isLoading,
    isFetching: false,
    isError: !!error,
    error,
    isSuccess: !isLoading && !error && !!data,
    status: isLoading ? 'pending' : error ? 'error' : 'success',
    refetch: vi.fn(),
  } as unknown as UseQueryResult<GameExchange[], Error>
}

describe('ExchangePage', () => {
  const mockSetLevelFilterEnabled = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default: not in demo mode, not in calendar mode
    vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
      selector({
        dataSource: 'api',
        isAssociationSwitching: false,
        isCalendarMode: () => false,
      } as unknown as ReturnType<typeof authStore.useAuthStore.getState>)
    )

    vi.mocked(demoStore.useDemoStore).mockReturnValue({
      userRefereeLevel: null,
      userRefereeLevelGradationValue: null,
    })

    // Default settings store mock - use mockImplementation to handle selectors
    const defaultState = {
      homeLocation: null,
      distanceFilter: { enabled: false, maxDistanceKm: 50 },
      setDistanceFilterEnabled: vi.fn(),
      transportEnabled: false,
      isTransportEnabledForAssociation: () => false,
      getArrivalBufferForAssociation: () => 30,
      travelTimeFilter: {
        enabled: false,
        maxTravelTimeMinutes: 120,
        arrivalBufferMinutes: 30,
        cacheInvalidatedAt: null,
      },
      setTravelTimeFilterEnabled: vi.fn(),
      setMaxDistanceKm: vi.fn(),
      setMaxTravelTimeMinutes: vi.fn(),
      levelFilterEnabled: false,
      setLevelFilterEnabled: mockSetLevelFilterEnabled,
      gameGapFilter: { enabled: false, minGapMinutes: 120 },
      setGameGapFilterEnabled: vi.fn(),
      hideOwnExchangesByAssociation: {},
      setHideOwnExchangesForAssociation: vi.fn(),
    }
    vi.mocked(settingsStore.useSettingsStore).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector?: (state: any) => any) => (selector ? selector(defaultState) : defaultState)
    )

    vi.mocked(useConvocations.useGameExchanges).mockReturnValue(createMockQueryResult([]))
  })

  describe('Filter Menu', () => {
    it('should show filter menu button on Open tab', () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({
          dataSource: 'api',
          isAssociationSwitching: false,
          isCalendarMode: () => false,
        } as unknown as ReturnType<typeof authStore.useAuthStore.getState>)
      )

      render(<ExchangePage />)

      // Filter menu button should be visible on Open tab
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
    })

    it('should show active filter count badge when filters are enabled', () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({
          dataSource: 'demo',
          isAssociationSwitching: false,
          isCalendarMode: () => false,
        } as unknown as ReturnType<typeof authStore.useAuthStore.getState>)
      )

      vi.mocked(demoStore.useDemoStore).mockReturnValue({
        userRefereeLevel: 'N2',
        userRefereeLevelGradationValue: 2,
      })

      render(<ExchangePage />)

      // With hideOwnExchanges enabled by default, filter button should be visible
      // Use getByRole button to find the filter menu button specifically
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
    })

    it('should not show filter menu on Added by Me tab', () => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({
          dataSource: 'demo',
          isAssociationSwitching: false,
          isCalendarMode: () => false,
        } as unknown as ReturnType<typeof authStore.useAuthStore.getState>)
      )

      vi.mocked(demoStore.useDemoStore).mockReturnValue({
        userRefereeLevel: 'N2',
        userRefereeLevelGradationValue: 2,
      })

      render(<ExchangePage />)

      // Click on "Added by Me" tab
      fireEvent.click(screen.getByText(/added by me/i))

      // Filter menu should not be visible on this tab
      expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument()
    })
  })

  describe('Level Filtering', () => {
    const exchangeN1 = createMockExchange({
      __identity: 'exchange-n1',
      requiredRefereeLevel: 'N1',
      requiredRefereeLevelGradationValue: '1',
      submittedByPerson: { __identity: 'other-person' },
    })

    const exchangeN2 = createMockExchange({
      __identity: 'exchange-n2',
      requiredRefereeLevel: 'N2',
      requiredRefereeLevelGradationValue: '2',
      submittedByPerson: { __identity: 'other-person' },
    })

    const exchangeN3 = createMockExchange({
      __identity: 'exchange-n3',
      requiredRefereeLevel: 'N3',
      requiredRefereeLevelGradationValue: '3',
    })

    beforeEach(() => {
      vi.mocked(authStore.useAuthStore).mockImplementation((selector) =>
        selector({
          dataSource: 'demo',
          isAssociationSwitching: false,
          isCalendarMode: () => false,
        } as unknown as ReturnType<typeof authStore.useAuthStore.getState>)
      )

      // User is N2 level (gradation value 2)
      vi.mocked(demoStore.useDemoStore).mockReturnValue({
        userRefereeLevel: 'N2',
        userRefereeLevelGradationValue: 2,
      })

      vi.mocked(useConvocations.useGameExchanges).mockReturnValue(
        createMockQueryResult([exchangeN1, exchangeN2, exchangeN3])
      )
    })

    it('should show all exchanges when filter is off', () => {
      // Mock hideOwnExchanges as false so all exchanges are visible
      const stateNoHide = {
        homeLocation: null,
        distanceFilter: { enabled: false, maxDistanceKm: 50 },
        setDistanceFilterEnabled: vi.fn(),
        transportEnabled: false,
        isTransportEnabledForAssociation: () => false,
        getArrivalBufferForAssociation: () => 30,
        travelTimeFilter: {
          enabled: false,
          maxTravelTimeMinutes: 120,
          arrivalBufferMinutes: 30,
          cacheInvalidatedAt: null,
        },
        setTravelTimeFilterEnabled: vi.fn(),
        setMaxDistanceKm: vi.fn(),
        setMaxTravelTimeMinutes: vi.fn(),
        levelFilterEnabled: false,
        setLevelFilterEnabled: mockSetLevelFilterEnabled,
        gameGapFilter: { enabled: false, minGapMinutes: 120 },
        setGameGapFilterEnabled: vi.fn(),
        hideOwnExchangesByAssociation: { TEST: false },
        setHideOwnExchangesForAssociation: vi.fn(),
      }
      vi.mocked(settingsStore.useSettingsStore).mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector?: (state: any) => any) => (selector ? selector(stateNoHide) : stateNoHide)
      )

      render(<ExchangePage />)

      // All three exchanges should be visible (use getAllByText since they share team names)
      const exchanges = screen.getAllByText(/Team A vs Team B/i)
      expect(exchanges).toHaveLength(3)
    })

    it('should show active filter icons when filters are enabled', () => {
      // Mock level filter as enabled
      const stateWithFilter = {
        homeLocation: null,
        distanceFilter: { enabled: false, maxDistanceKm: 50 },
        setDistanceFilterEnabled: vi.fn(),
        transportEnabled: false,
        isTransportEnabledForAssociation: () => false,
        getArrivalBufferForAssociation: () => 30,
        travelTimeFilter: {
          enabled: false,
          maxTravelTimeMinutes: 120,
          arrivalBufferMinutes: 30,
          cacheInvalidatedAt: null,
        },
        setTravelTimeFilterEnabled: vi.fn(),
        setMaxDistanceKm: vi.fn(),
        setMaxTravelTimeMinutes: vi.fn(),
        levelFilterEnabled: true,
        setLevelFilterEnabled: mockSetLevelFilterEnabled,
        gameGapFilter: { enabled: false, minGapMinutes: 120 },
        setGameGapFilterEnabled: vi.fn(),
        hideOwnExchangesByAssociation: {},
        setHideOwnExchangesForAssociation: vi.fn(),
      }
      vi.mocked(settingsStore.useSettingsStore).mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector?: (state: any) => any) => (selector ? selector(stateWithFilter) : stateWithFilter)
      )

      render(<ExchangePage />)

      // Should show active filter icons and filter menu button
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
    })

    it('should show filtered empty state message when no exchanges match level', () => {
      // Only return exchanges requiring higher level than user has
      vi.mocked(useConvocations.useGameExchanges).mockReturnValue(
        createMockQueryResult([exchangeN1])
      )

      // Mock filter as enabled
      const stateWithFilter = {
        homeLocation: null,
        distanceFilter: { enabled: false, maxDistanceKm: 50 },
        setDistanceFilterEnabled: vi.fn(),
        transportEnabled: false,
        isTransportEnabledForAssociation: () => false,
        getArrivalBufferForAssociation: () => 30,
        travelTimeFilter: {
          enabled: false,
          maxTravelTimeMinutes: 120,
          arrivalBufferMinutes: 30,
          cacheInvalidatedAt: null,
        },
        setTravelTimeFilterEnabled: vi.fn(),
        setMaxDistanceKm: vi.fn(),
        setMaxTravelTimeMinutes: vi.fn(),
        levelFilterEnabled: true,
        setLevelFilterEnabled: mockSetLevelFilterEnabled,
        gameGapFilter: { enabled: false, minGapMinutes: 120 },
        setGameGapFilterEnabled: vi.fn(),
        hideOwnExchangesByAssociation: {},
        setHideOwnExchangesForAssociation: vi.fn(),
      }
      vi.mocked(settingsStore.useSettingsStore).mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selector?: (state: any) => any) => (selector ? selector(stateWithFilter) : stateWithFilter)
      )

      render(<ExchangePage />)

      // Should show filtered empty state message
      expect(screen.getByText(/no exchanges match your filters/i)).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should default to Open tab', () => {
      render(<ExchangePage />)

      const openTab = screen.getByRole('tab', { name: /^open$/i })
      expect(openTab).toHaveClass('border-primary-500')
      expect(openTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should switch to Added by Me tab when clicked', () => {
      vi.mocked(useConvocations.useGameExchanges).mockReturnValue(createMockQueryResult([]))

      render(<ExchangePage />)

      fireEvent.click(screen.getByText(/added by me/i))

      const myOffersTab = screen.getByRole('tab', { name: /added by me/i })
      expect(myOffersTab).toHaveClass('border-primary-500')
      expect(myOffersTab).toHaveAttribute('aria-selected', 'true')
    })
  })
})
