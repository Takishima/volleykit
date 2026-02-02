/**
 * Offline Workflow Integration Tests
 *
 * Tests the offline action queue functionality:
 * - Creating actions when offline
 * - Queuing mutations in IndexedDB
 * - Action store CRUD operations
 * - Action queue store reactivity
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useAuthStore } from '@/shared/stores/auth'
import { useActionQueueStore } from '@/shared/stores/action-queue'
import { useDemoStore } from '@/shared/stores/demo'

import type { OfflineAction, ActionStatus } from './action-types'

// In-memory store for testing (simulates IndexedDB)
const actionStore = new Map<string, OfflineAction>()

// Mock the indexed-db module
vi.mock('./indexed-db', () => ({
  STORES: {
    METADATA: 'metadata',
    QUERY_CACHE: 'queryCache',
    ACTION_QUEUE: 'actionQueue',
  },
  getDB: vi.fn().mockImplementation(async () => ({
    add: async (_store: string, value: OfflineAction) => {
      actionStore.set(value.id, value)
      return value.id
    },
    get: async (_store: string, key: string) => {
      return actionStore.get(key)
    },
    getAll: async () => {
      return Array.from(actionStore.values())
    },
    getAllFromIndex: async (_store: string, _index: string, status: ActionStatus) => {
      return Array.from(actionStore.values()).filter((a) => a.status === status)
    },
    put: async (_store: string, value: OfflineAction) => {
      actionStore.set(value.id, value)
    },
    delete: async (_store: string, key: string) => {
      actionStore.delete(key)
    },
    clear: async () => {
      actionStore.clear()
    },
    countFromIndex: async (_store: string, _index: string, status: ActionStatus) => {
      return Array.from(actionStore.values()).filter((a) => a.status === status).length
    },
  })),
  closeDB: vi.fn(),
  clearAllData: vi.fn(async () => {
    actionStore.clear()
  }),
}))

// Import after mocking
const { createAction, getPendingActions, deleteAction, clearAllActions } = await import(
  './action-store'
)

describe('Offline Action Queue', () => {
  beforeEach(async () => {
    // Clear the in-memory store
    actionStore.clear()

    // Reset stores
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
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    actionStore.clear()
  })

  describe('action creation', () => {
    it('creates a pending action with correct structure', async () => {
      const action = await createAction('updateCompensation', {
        compensationId: 'comp-123',
        data: { distanceInMetres: 5000 },
      })

      expect(action).not.toBeNull()
      expect(action?.type).toBe('updateCompensation')
      expect(action?.status).toBe('pending')
      expect(action?.retryCount).toBe(0)
      expect(action?.payload).toEqual({
        compensationId: 'comp-123',
        data: { distanceInMetres: 5000 },
      })
      expect(action?.createdAt).toBeGreaterThan(0)
      expect(action?.id).toMatch(/^\d+-[a-z0-9]+$/)
    })

    it('creates actions for different mutation types', async () => {
      const compensationAction = await createAction('updateCompensation', {
        compensationId: 'comp-1',
        data: { distanceInMetres: 1000 },
      })

      const batchAction = await createAction('batchUpdateCompensations', {
        compensationIds: ['comp-2', 'comp-3'],
        data: { distanceInMetres: 2000 },
      })

      const applyAction = await createAction('applyForExchange', {
        exchangeId: 'exchange-1',
      })

      const addAction = await createAction('addToExchange', {
        convocationId: 'convocation-1',
      })

      expect(compensationAction?.type).toBe('updateCompensation')
      expect(batchAction?.type).toBe('batchUpdateCompensations')
      expect(applyAction?.type).toBe('applyForExchange')
      expect(addAction?.type).toBe('addToExchange')
    })

    it('can retrieve pending actions', async () => {
      await createAction('updateCompensation', {
        compensationId: 'comp-1',
        data: { distanceInMetres: 1000 },
      })
      await createAction('applyForExchange', {
        exchangeId: 'exchange-1',
      })

      const pending = await getPendingActions()

      expect(pending.length).toBe(2)
      expect(pending.every((a) => a.status === 'pending')).toBe(true)
    })

    it('can delete an action', async () => {
      const action = await createAction('updateCompensation', {
        compensationId: 'comp-1',
        data: { distanceInMetres: 1000 },
      })

      expect(action).not.toBeNull()

      const deleted = await deleteAction(action!.id)
      expect(deleted).toBe(true)

      const pending = await getPendingActions()
      expect(pending.length).toBe(0)
    })

    it('can clear all actions', async () => {
      await createAction('updateCompensation', {
        compensationId: 'comp-1',
        data: { distanceInMetres: 1000 },
      })
      await createAction('updateCompensation', {
        compensationId: 'comp-2',
        data: { distanceInMetres: 2000 },
      })
      await createAction('applyForExchange', {
        exchangeId: 'exchange-1',
      })

      const beforeClear = await getPendingActions()
      expect(beforeClear.length).toBe(3)

      await clearAllActions()

      const afterClear = await getPendingActions()
      expect(afterClear.length).toBe(0)
    })
  })

  describe('action queue store', () => {
    it('tracks pending action count', async () => {
      const store = useActionQueueStore.getState()

      // Refresh to get initial state
      await store.refresh()
      expect(useActionQueueStore.getState().pendingCount).toBe(0)

      await createAction('updateCompensation', {
        compensationId: 'comp-1',
        data: { distanceInMetres: 1000 },
      })

      // Refresh the store to pick up the new action
      await store.refresh()

      expect(useActionQueueStore.getState().pendingCount).toBe(1)
    })

    it('can clear all actions via store', async () => {
      await createAction('updateCompensation', {
        compensationId: 'comp-1',
        data: { distanceInMetres: 1000 },
      })

      await useActionQueueStore.getState().refresh()
      expect(useActionQueueStore.getState().pendingCount).toBe(1)

      await useActionQueueStore.getState().clearAll()
      expect(useActionQueueStore.getState().pendingCount).toBe(0)
    })
  })

  describe('exchange actions', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('creates applyForExchange action', async () => {
      const action = await createAction('applyForExchange', {
        exchangeId: 'exchange-123',
      })

      expect(action?.type).toBe('applyForExchange')
      expect(action?.payload).toEqual({ exchangeId: 'exchange-123' })
    })

    it('creates addToExchange action', async () => {
      const action = await createAction('addToExchange', {
        convocationId: 'convocation-123',
      })

      expect(action?.type).toBe('addToExchange')
      expect(action?.payload).toEqual({ convocationId: 'convocation-123' })
    })

    it('stores exchange apply action with correct payload', async () => {
      const exchanges = useDemoStore.getState().exchanges
      const exchangeId = exchanges[0]?.__identity
      expect(exchangeId).toBeDefined()

      await createAction('applyForExchange', {
        exchangeId: exchangeId!,
      })

      const pending = await getPendingActions()
      expect(pending.length).toBe(1)
      expect(pending[0]?.type).toBe('applyForExchange')
      expect(pending[0]?.payload).toEqual({ exchangeId: exchangeId })
    })
  })

  describe('batch operations', () => {
    beforeEach(() => {
      useAuthStore.getState().setDemoAuthenticated()
      useDemoStore.getState().initializeDemoData('SV')
    })

    it('creates batchUpdateCompensations action', async () => {
      // Batch updates apply the same data to multiple compensations
      // (there's no batch API endpoint - it loops through individual updates)
      const action = await createAction('batchUpdateCompensations', {
        compensationIds: ['comp-1', 'comp-2', 'comp-3'],
        data: { distanceInMetres: 5000 },
      })

      expect(action?.type).toBe('batchUpdateCompensations')
      expect(action?.payload.compensationIds).toHaveLength(3)
      expect(action?.payload.data).toEqual({ distanceInMetres: 5000 })
    })

    it('stores batch update action with correct payload', async () => {
      const compensations = useDemoStore.getState().compensations
      const comp1 = compensations[0]?.convocationCompensation?.__identity
      const comp2 = compensations[1]?.convocationCompensation?.__identity

      expect(comp1).toBeDefined()
      expect(comp2).toBeDefined()

      await createAction('batchUpdateCompensations', {
        compensationIds: [comp1!, comp2!],
        data: { distanceInMetres: 10000, correctionReason: 'Batch update' },
      })

      const pending = await getPendingActions()
      expect(pending.length).toBe(1)
      expect(pending[0]?.type).toBe('batchUpdateCompensations')
      expect(pending[0]?.payload.compensationIds).toHaveLength(2)
      expect(pending[0]?.payload.data).toEqual({
        distanceInMetres: 10000,
        correctionReason: 'Batch update',
      })
    })
  })

  describe('updateAssignmentCompensation action', () => {
    it('creates updateAssignmentCompensation action', async () => {
      const action = await createAction('updateAssignmentCompensation', {
        assignmentId: 'assignment-123',
        data: { distanceInMetres: 10000 },
      })

      expect(action?.type).toBe('updateAssignmentCompensation')
      expect(action?.payload).toEqual({
        assignmentId: 'assignment-123',
        data: { distanceInMetres: 10000 },
      })
    })
  })
})
