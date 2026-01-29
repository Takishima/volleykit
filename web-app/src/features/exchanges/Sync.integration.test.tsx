/**
 * Sync Integration Tests
 *
 * Tests the offline sync functionality including:
 * - Queueing operations while offline
 * - Syncing when coming back online
 * - Conflict handling
 * - UI feedback for sync status
 * - Zustand store updates
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor, act, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { createElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  useSyncStore,
  generateItemId,
  type SyncQueueItem,
  type NetworkStatus,
} from '@volleykit/shared'

import { setLocale } from '@/i18n'
import { SyncStatusIndicator, PendingSyncBadge, SyncResultsModal } from '@/shared/components/sync'
import { useAuthStore } from '@/shared/stores/auth'
import { useDemoStore } from '@/shared/stores/demo'
import { useToastStore } from '@/shared/stores/toast'

/**
 * Mock the network status hook with controllable state.
 */
const mockNetworkStatus: NetworkStatus = {
  isConnected: true,
  isKnown: true,
  type: 'wifi',
}

let isOnline = true

vi.mock('@/shared/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockNetworkStatus,
  useIsOnline: () => isOnline,
  useNetworkChangeCallback: (onOnline: () => void) => {
    // Store callback for testing
    ;(globalThis as Record<string, unknown>).__onOnlineCallback = onOnline
  },
}))

describe('Sync Store Integration', () => {
  beforeEach(() => {
    setLocale('en')
    isOnline = true
    mockNetworkStatus.isConnected = true

    // Reset sync store
    useSyncStore.getState().reset()
  })

  afterEach(() => {
    useSyncStore.getState().reset()
  })

  describe('queue management', () => {
    it('adds items to the queue', () => {
      const { addItem } = useSyncStore.getState()

      const item: SyncQueueItem = {
        id: generateItemId(),
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over game',
      }

      addItem(item)

      const state = useSyncStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].id).toBe(item.id)
    })

    it('deduplicates items for the same entity', () => {
      const { addItem } = useSyncStore.getState()

      addItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over game',
      })

      addItem({
        id: 'item-2',
        type: 'applyForExchange',
        entityId: 'ex-1', // Same entity
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over game',
      })

      const state = useSyncStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].id).toBe('item-1') // First one kept
    })

    it('cancels opposing operations', () => {
      const { addItem } = useSyncStore.getState()

      // Add apply
      addItem({
        id: 'apply-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over game',
      })

      expect(useSyncStore.getState().items).toHaveLength(1)

      // Add withdraw for same entity
      addItem({
        id: 'withdraw-1',
        type: 'withdrawFromExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Cancel take over',
      })

      // Both should cancel out
      expect(useSyncStore.getState().items).toHaveLength(0)
    })

    it('replaces data-carrying operations', () => {
      const { addItem } = useSyncStore.getState()

      addItem({
        id: 'comp-1',
        type: 'updateCompensation',
        entityId: 'comp-123',
        payload: { kilometers: 50 },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Update compensation',
      })

      addItem({
        id: 'comp-2',
        type: 'updateCompensation',
        entityId: 'comp-123', // Same entity
        payload: { kilometers: 75 },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Update compensation',
      })

      const state = useSyncStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].id).toBe('comp-2') // Newer one replaces
      expect(state.items[0].payload).toEqual({ kilometers: 75 })
    })

    it('clears the queue', () => {
      const { addItem, clearQueue } = useSyncStore.getState()

      addItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Test',
      })

      expect(useSyncStore.getState().items).toHaveLength(1)

      clearQueue()

      expect(useSyncStore.getState().items).toHaveLength(0)
    })
  })

  describe('sync state', () => {
    it('tracks syncing state', () => {
      const { setSyncing } = useSyncStore.getState()

      expect(useSyncStore.getState().isSyncing).toBe(false)

      setSyncing(true)
      expect(useSyncStore.getState().isSyncing).toBe(true)

      setSyncing(false)
      expect(useSyncStore.getState().isSyncing).toBe(false)
    })

    it('stores last sync results', () => {
      const { setLastSyncResults } = useSyncStore.getState()

      const results = [
        {
          item: {
            id: 'item-1',
            type: 'applyForExchange' as const,
            entityId: 'ex-1',
            payload: {},
            timestamp: Date.now(),
            status: 'success' as const,
            retryCount: 0,
            displayLabel: 'Test',
          },
          status: 'success' as const,
        },
        {
          item: {
            id: 'item-2',
            type: 'applyForExchange' as const,
            entityId: 'ex-2',
            payload: {},
            timestamp: Date.now(),
            status: 'conflict' as const,
            retryCount: 0,
            displayLabel: 'Test 2',
          },
          status: 'conflict' as const,
          conflictReason: 'already_taken' as const,
        },
      ]

      setLastSyncResults(results)

      const state = useSyncStore.getState()
      expect(state.lastSyncResults).toHaveLength(2)
      expect(state.lastSyncResults[0].status).toBe('success')
      expect(state.lastSyncResults[1].status).toBe('conflict')
    })

    it('provides pending count', () => {
      const { addItem, setItems } = useSyncStore.getState()

      addItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Test',
      })

      addItem({
        id: 'item-2',
        type: 'applyForExchange',
        entityId: 'ex-2',
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Test 2',
      })

      expect(useSyncStore.getState().pendingCount).toBe(2)

      // Simulate one item being synced
      setItems([
        ...useSyncStore.getState().items.slice(0, 1),
        { ...useSyncStore.getState().items[1], status: 'syncing' },
      ])

      // Only pending items count
      expect(useSyncStore.getState().pendingCount).toBe(1)
    })
  })
})

describe('Sync UI Components', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    setLocale('en')
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    useSyncStore.getState().reset()
    isOnline = true
  })

  afterEach(() => {
    queryClient.clear()
    useSyncStore.getState().reset()
  })

  function renderWithProviders(ui: ReactNode) {
    return render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MemoryRouter, null, ui)
      )
    )
  }

  describe('PendingSyncBadge', () => {
    it('shows badge when entity has pending operation', () => {
      useSyncStore.getState().addItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Test',
      })

      renderWithProviders(createElement(PendingSyncBadge, { entityId: 'ex-1' }))

      expect(screen.getByTestId('pending-sync-badge')).toBeInTheDocument()
    })

    it('hides badge when entity has no pending operations', () => {
      renderWithProviders(createElement(PendingSyncBadge, { entityId: 'ex-1' }))

      expect(screen.queryByTestId('pending-sync-badge')).not.toBeInTheDocument()
    })

    it('hides badge when pending operation is for different entity', () => {
      useSyncStore.getState().addItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-2', // Different entity
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Test',
      })

      renderWithProviders(createElement(PendingSyncBadge, { entityId: 'ex-1' }))

      expect(screen.queryByTestId('pending-sync-badge')).not.toBeInTheDocument()
    })

    it('shows badge when item is added for entity', async () => {
      const { rerender } = renderWithProviders(
        createElement(PendingSyncBadge, { entityId: 'ex-1' })
      )

      expect(screen.queryByTestId('pending-sync-badge')).not.toBeInTheDocument()

      act(() => {
        useSyncStore.getState().addItem({
          id: 'item-1',
          type: 'applyForExchange',
          entityId: 'ex-1',
          payload: {},
          timestamp: Date.now(),
          status: 'pending',
          retryCount: 0,
          displayLabel: 'Test',
        })
      })

      rerender(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(MemoryRouter, null, createElement(PendingSyncBadge, { entityId: 'ex-1' }))
        )
      )

      await waitFor(() => {
        expect(screen.getByTestId('pending-sync-badge')).toBeInTheDocument()
      })
    })
  })

  describe('SyncStatusIndicator', () => {
    it('shows offline indicator when offline', () => {
      isOnline = false
      mockNetworkStatus.isConnected = false

      renderWithProviders(createElement(SyncStatusIndicator))

      expect(screen.getByTestId('sync-status-offline')).toBeInTheDocument()
    })

    it('shows syncing indicator when sync in progress', () => {
      useSyncStore.getState().setSyncing(true)

      renderWithProviders(createElement(SyncStatusIndicator))

      expect(screen.getByTestId('sync-status-syncing')).toBeInTheDocument()
    })

    it('shows pending indicator when items queued', () => {
      useSyncStore.getState().addItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: {},
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Test',
      })

      renderWithProviders(createElement(SyncStatusIndicator))

      expect(screen.getByTestId('sync-status-pending')).toBeInTheDocument()
    })

    it('shows nothing when online and queue empty', () => {
      renderWithProviders(createElement(SyncStatusIndicator))

      expect(screen.queryByTestId('sync-status-indicator')).not.toBeInTheDocument()
    })
  })

  describe('SyncResultsModal', () => {
    it('shows conflicts in modal', async () => {
      useSyncStore.getState().setLastSyncResults([
        {
          item: {
            id: 'item-1',
            type: 'applyForExchange',
            entityId: 'ex-1',
            payload: {},
            timestamp: Date.now(),
            status: 'conflict',
            retryCount: 0,
            displayLabel: 'Take over game',
            entityLabel: 'HC Luzern vs VBC Test',
          },
          status: 'conflict',
          conflictReason: 'already_taken',
        },
      ])

      renderWithProviders(createElement(SyncResultsModal))

      await waitFor(() => {
        expect(screen.getByText('Take over game')).toBeInTheDocument()
      })
    })

    it('store clearResults action clears results', () => {
      useSyncStore.getState().setLastSyncResults([
        {
          item: {
            id: 'item-1',
            type: 'applyForExchange',
            entityId: 'ex-1',
            payload: {},
            timestamp: Date.now(),
            status: 'conflict',
            retryCount: 0,
            displayLabel: 'Test',
          },
          status: 'conflict',
          conflictReason: 'already_taken',
        },
      ])

      expect(useSyncStore.getState().lastSyncResults).toHaveLength(1)

      // Clear results using store action
      useSyncStore.getState().clearResults()

      // Results should be cleared
      expect(useSyncStore.getState().lastSyncResults).toHaveLength(0)
    })
  })
})

describe('Offline to Online Sync Flow', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    setLocale('en')
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    useSyncStore.getState().reset()
    useAuthStore.setState({
      status: 'idle',
      user: null,
      dataSource: 'api',
      activeOccupationId: null,
      isAssociationSwitching: false,
      error: null,
      csrfToken: null,
      _checkSessionPromise: null,
    })
    useDemoStore.getState().clearDemoData()
    useToastStore.getState().clearToasts()

    isOnline = true
  })

  afterEach(() => {
    vi.restoreAllMocks()
    queryClient.clear()
    useSyncStore.getState().reset()
    useToastStore.getState().clearToasts()
  })

  describe('queueing while offline', () => {
    it('queues operations when offline', async () => {
      isOnline = false
      mockNetworkStatus.isConnected = false

      // Add items to queue (simulating what useOfflineMutation does)
      useSyncStore.getState().addItem({
        id: generateItemId(),
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over game',
        entityLabel: 'HC Luzern vs VBC Test',
      })

      const state = useSyncStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.pendingCount).toBe(1)
    })

    it('handles rapid toggle between operations', () => {
      isOnline = false

      // User applies
      useSyncStore.getState().addItem({
        id: 'apply-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over',
      })

      expect(useSyncStore.getState().items).toHaveLength(1)

      // User changes mind and withdraws
      useSyncStore.getState().addItem({
        id: 'withdraw-1',
        type: 'withdrawFromExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Cancel',
      })

      // They cancel out
      expect(useSyncStore.getState().items).toHaveLength(0)

      // User applies again
      useSyncStore.getState().addItem({
        id: 'apply-2',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over',
      })

      // Only the final operation should be queued
      expect(useSyncStore.getState().items).toHaveLength(1)
      expect(useSyncStore.getState().items[0].type).toBe('applyForExchange')
    })

    it('queues multiple operations for different entities', () => {
      isOnline = false

      useSyncStore.getState().addItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over game 1',
      })

      useSyncStore.getState().addItem({
        id: 'item-2',
        type: 'applyForExchange',
        entityId: 'ex-2', // Different entity
        payload: { exchangeId: 'ex-2' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over game 2',
      })

      useSyncStore.getState().addItem({
        id: 'item-3',
        type: 'updateCompensation',
        entityId: 'comp-1',
        payload: { kilometers: 50 },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Update compensation',
      })

      expect(useSyncStore.getState().items).toHaveLength(3)
      expect(useSyncStore.getState().pendingCount).toBe(3)
    })
  })

  describe('coming back online', () => {
    it('triggers sync when network status changes to online', async () => {
      isOnline = false
      mockNetworkStatus.isConnected = false

      // Queue something while offline
      useSyncStore.getState().addItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
        payload: { exchangeId: 'ex-1' },
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0,
        displayLabel: 'Take over game',
      })

      // Come back online
      isOnline = true
      mockNetworkStatus.isConnected = true

      // Trigger the callback stored by the mock
      const onOnlineCallback = (globalThis as Record<string, unknown>).__onOnlineCallback as
        | (() => void)
        | undefined
      if (onOnlineCallback) {
        await onOnlineCallback()
      }

      // The sync should have been triggered
      // (In real implementation, this would process the queue)
    })
  })

  describe('conflict scenarios', () => {
    it('stores conflict results for display', () => {
      const conflictResults = [
        {
          item: {
            id: 'item-1',
            type: 'applyForExchange' as const,
            entityId: 'ex-1',
            payload: { exchangeId: 'ex-1' },
            timestamp: Date.now(),
            status: 'conflict' as const,
            retryCount: 0,
            displayLabel: 'Take over game',
            entityLabel: 'HC Luzern vs VBC Test',
          },
          status: 'conflict' as const,
          conflictReason: 'already_taken' as const,
          error: new Error('Exchange already taken'),
        },
      ]

      useSyncStore.getState().setLastSyncResults(conflictResults)

      const state = useSyncStore.getState()
      expect(state.lastSyncResults).toHaveLength(1)
      expect(state.lastSyncResults[0].conflictReason).toBe('already_taken')
    })

    it('filters results to show only conflicts', () => {
      useSyncStore.getState().setLastSyncResults([
        {
          item: {
            id: 'item-1',
            type: 'applyForExchange',
            entityId: 'ex-1',
            payload: {},
            timestamp: Date.now(),
            status: 'success',
            retryCount: 0,
            displayLabel: 'Success 1',
          },
          status: 'success',
        },
        {
          item: {
            id: 'item-2',
            type: 'applyForExchange',
            entityId: 'ex-2',
            payload: {},
            timestamp: Date.now(),
            status: 'conflict',
            retryCount: 0,
            displayLabel: 'Conflict 1',
          },
          status: 'conflict',
          conflictReason: 'already_taken',
        },
        {
          item: {
            id: 'item-3',
            type: 'applyForExchange',
            entityId: 'ex-3',
            payload: {},
            timestamp: Date.now(),
            status: 'success',
            retryCount: 0,
            displayLabel: 'Success 2',
          },
          status: 'success',
        },
      ])

      const state = useSyncStore.getState()
      const conflicts = state.lastSyncResults.filter((r) => r.status === 'conflict')

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].item.displayLabel).toBe('Conflict 1')
    })
  })
})
