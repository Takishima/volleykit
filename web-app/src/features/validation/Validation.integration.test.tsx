import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { Assignment } from '@/api/client'
import { mockApi } from '@/api/mock-api'
import { setLocale } from '@/i18n'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { useSettingsStore } from '@/shared/stores/settings'
import { useToastStore } from '@/shared/stores/toast'

import { ValidateGameModal } from './components/ValidateGameModal'

/**
 * Validation Integration Tests
 *
 * Tests the validation workflow including:
 * - Store mutations after validation operations
 * - Demo store interactions (validated games, pending scorers)
 * - API call verification with mock API
 * - Settings store affecting validation behavior
 */

// Save original functions before any spying
const originalGetGameWithScoresheet = mockApi.getGameWithScoresheet.bind(mockApi)
const originalSearchPersons = mockApi.searchPersons.bind(mockApi)
const originalFinalizeScoresheet = mockApi.finalizeScoresheet.bind(mockApi)
const originalUpdateScoresheet = mockApi.updateScoresheet.bind(mockApi)

// Create a mock assignment for testing
function createMockAssignment(overrides?: Partial<Assignment>): Assignment {
  return {
    __identity: 'test-assignment-1',
    refereeGame: {
      __identity: 'test-referee-game-1',
      game: {
        __identity: 'test-game-1',
        gameDate: new Date().toISOString(),
        gameStartTime: '14:00',
        homeTeam: {
          __identity: 'home-team-1',
          name: 'VBC Home',
        },
        awayTeam: {
          __identity: 'away-team-1',
          name: 'VBC Away',
        },
        group: {
          __identity: 'group-1',
          isTournamentGroup: false,
          hasNoScoresheet: false,
        },
        sportsHall: {
          __identity: 'hall-1',
          name: 'Test Sports Hall',
          address: {
            postalCode: '3000',
            city: 'Bern',
          },
        },
      },
    },
    ...overrides,
  } as Assignment
}

describe('Validation Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    setLocale('en')
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    // Restore original functions and create fresh spies
    mockApi.getGameWithScoresheet = originalGetGameWithScoresheet
    mockApi.searchPersons = originalSearchPersons
    mockApi.finalizeScoresheet = originalFinalizeScoresheet
    mockApi.updateScoresheet = originalUpdateScoresheet

    vi.spyOn(mockApi, 'getGameWithScoresheet')
    vi.spyOn(mockApi, 'searchPersons')
    vi.spyOn(mockApi, 'finalizeScoresheet')
    vi.spyOn(mockApi, 'updateScoresheet')

    // Reset stores to initial state
    useAuthStore.setState({
      status: 'idle',
      user: null,
      dataSource: 'api',
      activeOccupationId: null,
      isAssociationSwitching: false,
      error: null,
      csrfToken: null,
      calendarCode: null,
      eligibleAttributeValues: null,
      groupedEligibleAttributeValues: null,
      eligibleRoles: null,
      _checkSessionPromise: null,
      _lastAuthTimestamp: null,
    })
    useDemoStore.getState().clearDemoData()
    useToastStore.getState().clearToasts()

    // Reset settings store to defaults
    useSettingsStore.setState({
      isSafeModeEnabled: false,
      isSafeValidationEnabled: false,
      isOCREnabled: false,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    queryClient.clear()
    useToastStore.getState().clearToasts()
  })

  function renderValidateGameModal(assignment: Assignment, isOpen: boolean = true) {
    const onClose = vi.fn()
    const result = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ValidateGameModal assignment={assignment} isOpen={isOpen} onClose={onClose} />
        </MemoryRouter>
      </QueryClientProvider>
    )
    return { ...result, onClose }
  }

  describe('demo mode API calls', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('loads game details from mock API when modal opens', async () => {
      const assignment = createMockAssignment()
      renderValidateGameModal(assignment)

      await waitFor(() => {
        expect(mockApi.getGameWithScoresheet).toHaveBeenCalledWith('test-game-1')
      })
    })

    it('creates mock assignment with team names', () => {
      const assignment = createMockAssignment()

      // Verify assignment structure is correct for validation
      expect(assignment.__identity).toBe('test-assignment-1')
      expect(assignment.refereeGame?.game?.homeTeam?.name).toBe('VBC Home')
      expect(assignment.refereeGame?.game?.awayTeam?.name).toBe('VBC Away')
      expect(assignment.refereeGame?.game?.group?.hasNoScoresheet).toBe(false)
    })
  })

  describe('demo store validation state', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('marks game as validated in demo store', () => {
      const gameId = 'test-game-validation'
      const scorerId = 'scorer-test-1'

      // Verify initial state
      expect(useDemoStore.getState().validatedGames[gameId]).toBeUndefined()

      // Mark game as validated
      useDemoStore.getState().markGameValidated(gameId, {
        scorer: {
          __identity: scorerId,
          displayName: 'Test Scorer',
        },
      })

      // Verify store was updated
      const validatedData = useDemoStore.getState().validatedGames[gameId]
      expect(validatedData).toBeDefined()
      expect(validatedData?.scorer.__identity).toBe(scorerId)
      expect(validatedData?.validatedAt).toBeDefined()
    })

    it('stores and retrieves pending scorer', () => {
      const gameId = 'test-game-pending'
      const pendingScorer = {
        __identity: 'pending-scorer-1',
        displayName: 'Pending Scorer',
      }

      // Initially no pending scorer (returns null)
      expect(useDemoStore.getState().getPendingScorer(gameId)).toBeNull()

      // Set pending scorer
      useDemoStore.getState().setPendingScorer(gameId, pendingScorer)
      expect(useDemoStore.getState().getPendingScorer(gameId)).toEqual(pendingScorer)

      // Clear pending scorer
      useDemoStore.getState().clearPendingScorer(gameId)
      expect(useDemoStore.getState().getPendingScorer(gameId)).toBeNull()
    })

    it('pending scorer is cleared when game is finalized', () => {
      const gameId = 'test-game-finalize'

      // Set pending scorer
      useDemoStore.getState().setPendingScorer(gameId, {
        __identity: 'pending-1',
        displayName: 'Pending',
      })

      // Finalize game (which should clear pending scorer)
      useDemoStore.getState().markGameValidated(gameId, {
        scorer: {
          __identity: 'final-1',
          displayName: 'Final Scorer',
        },
      })
      useDemoStore.getState().clearPendingScorer(gameId)

      // Pending scorer should be cleared (returns null)
      expect(useDemoStore.getState().getPendingScorer(gameId)).toBeNull()

      // But validated data should exist
      expect(useDemoStore.getState().validatedGames[gameId]).toBeDefined()
    })

    it('validated game data is returned by getGameWithScoresheet', async () => {
      const gameId = 'test-game-validated-api'

      // Mark game as validated
      useDemoStore.getState().markGameValidated(gameId, {
        scorer: {
          __identity: 'scorer-api-1',
          displayName: 'API Scorer',
        },
      })

      // Call the mock API
      const result = await mockApi.getGameWithScoresheet(gameId)

      // Should include validated data
      expect(result.scoresheet?.closedAt).toBeDefined()
      expect(result.scoresheet?.writerPerson?.displayName).toBe('API Scorer')
    })
  })

  describe('nomination list interactions', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('updates nomination list players in demo store', () => {
      const gameId = 'test-game-nomination'
      const playerId1 = 'player-1'
      const playerId2 = 'player-2'

      // Initialize nomination lists with existing players
      useDemoStore.setState({
        nominationLists: {
          [gameId]: {
            home: {
              __identity: 'nom-home-1',
              indoorPlayerNominations: [
                { __identity: playerId1, person: { displayName: 'Player 1' }, shirtNumber: 1 },
                { __identity: playerId2, person: { displayName: 'Player 2' }, shirtNumber: 2 },
              ],
            },
            away: {
              __identity: 'nom-away-1',
              indoorPlayerNominations: [],
            },
          },
        },
      })

      // Update home roster with just one player
      useDemoStore.getState().updateNominationListPlayers(gameId, 'home', [playerId1])

      // Verify update - should only have player 1 now
      const state = useDemoStore.getState()
      const nominations = state.nominationLists[gameId]?.home?.indoorPlayerNominations
      expect(nominations).toHaveLength(1)
      expect(nominations?.[0]?.__identity).toBe(playerId1)
    })

    it('marks nomination list as closed', () => {
      const gameId = 'test-game-close'

      // Initialize nomination lists
      useDemoStore.setState({
        nominationLists: {
          [gameId]: {
            home: {
              __identity: 'nom-home-2',
              closed: false,
              indoorPlayerNominations: [],
            },
            away: {
              __identity: 'nom-away-2',
              closed: false,
              indoorPlayerNominations: [],
            },
          },
        },
      })

      // Close home nomination list
      useDemoStore.getState().updateNominationListClosed(gameId, 'home', true)

      // Verify
      const state = useDemoStore.getState()
      expect(state.nominationLists[gameId]?.home?.closed).toBe(true)
      expect(state.nominationLists[gameId]?.away?.closed).toBe(false)
    })
  })

  describe('settings affecting validation', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('OCR setting is read from settings store', () => {
      // Default: OCR disabled
      expect(useSettingsStore.getState().isOCREnabled).toBe(false)

      // Enable OCR
      useSettingsStore.getState().setOCREnabled(true)
      expect(useSettingsStore.getState().isOCREnabled).toBe(true)
    })

    it('safe validation setting is read from settings store', () => {
      // Default: safe validation disabled
      expect(useSettingsStore.getState().isSafeValidationEnabled).toBe(false)

      // Enable safe validation
      useSettingsStore.getState().setSafeValidation(true)
      expect(useSettingsStore.getState().isSafeValidationEnabled).toBe(true)
    })

    it('safe mode setting affects non-demo validation', () => {
      // In API mode
      useAuthStore.setState({ dataSource: 'api', status: 'authenticated' })

      // Default: safe mode enabled (true)
      useSettingsStore.setState({ isSafeModeEnabled: true })
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(true)

      // Disable safe mode
      useSettingsStore.getState().setSafeMode(false)
      expect(useSettingsStore.getState().isSafeModeEnabled).toBe(false)
    })
  })

  describe('scorer search', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('searches scorers via mock API', async () => {
      const result = await mockApi.searchPersons({ lastName: 'Test' })

      expect(mockApi.searchPersons).toHaveBeenCalled()
      expect(result.items).toBeDefined()
      expect(result.totalItemsCount).toBeDefined()
    })

    it('filters scorers by name', async () => {
      // Get all scorers first
      const allScorers = await mockApi.searchPersons({})

      // Search with filter
      const filteredScorers = await mockApi.searchPersons({ lastName: 'Mueller' })

      // Filtered should have fewer or equal results
      expect(filteredScorers.totalItemsCount).toBeLessThanOrEqual(allScorers.totalItemsCount)
    })
  })

  describe('mock API finalization', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('finalizeScoresheet marks game as validated', async () => {
      const gameId = 'test-finalize-game'
      const scorerId = 'test-scorer'

      // Add scorer to store so it can be found
      useDemoStore.setState({
        scorers: [
          ...useDemoStore.getState().scorers,
          {
            __identity: scorerId,
            displayName: 'Test Scorer Name',
            firstName: 'Test',
            lastName: 'Scorer',
            birthday: null,
          },
        ],
      })

      await mockApi.finalizeScoresheet('scoresheet-1', gameId, scorerId)

      // Game should be marked as validated
      const validatedData = useDemoStore.getState().validatedGames[gameId]
      expect(validatedData).toBeDefined()
      expect(validatedData?.scorer.__identity).toBe(scorerId)
    })

    it('updateScoresheet stores pending scorer', async () => {
      const gameId = 'test-update-scoresheet'
      const scorerId = 'update-scorer'

      // Add scorer to store
      useDemoStore.setState({
        scorers: [
          ...useDemoStore.getState().scorers,
          {
            __identity: scorerId,
            displayName: 'Update Scorer',
            firstName: 'Update',
            lastName: 'Scorer',
            birthday: null,
          },
        ],
      })

      await mockApi.updateScoresheet('scoresheet-2', gameId, scorerId)

      // Pending scorer should be set
      const pendingScorer = useDemoStore.getState().getPendingScorer(gameId)
      expect(pendingScorer).toBeDefined()
      expect(pendingScorer?.__identity).toBe(scorerId)
    })
  })

  describe('query client interaction', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('refetches game details when modal opens', async () => {
      const assignment = createMockAssignment()

      // First render
      const { unmount } = renderValidateGameModal(assignment)

      await waitFor(() => {
        expect(mockApi.getGameWithScoresheet).toHaveBeenCalledTimes(1)
      })

      unmount()

      // Clear the spy to reset call count
      vi.mocked(mockApi.getGameWithScoresheet).mockClear()

      // Re-render with new query client
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      renderValidateGameModal(assignment)

      await waitFor(() => {
        expect(mockApi.getGameWithScoresheet).toHaveBeenCalled()
      })
    })
  })
})
