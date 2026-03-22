/**
 * Tests for the offline action store service.
 *
 * Tests CRUD operations for managing offline actions, using an in-memory
 * Map to simulate IndexedDB.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { OfflineAction, ActionStatus } from './action-types'

// In-memory store simulating IndexedDB
const actionStore = new Map<string, OfflineAction>()

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
    get: async (_store: string, key: string) => actionStore.get(key),
    getAllFromIndex: async (_store: string, _index: string, status: ActionStatus) =>
      Array.from(actionStore.values()).filter((a) => a.status === status),
    put: async (_store: string, value: OfflineAction) => {
      actionStore.set(value.id, value)
    },
    delete: async (_store: string, key: string) => {
      actionStore.delete(key)
    },
    clear: async () => {
      actionStore.clear()
    },
  })),
}))

const {
  createAction,
  getActionsByStatus,
  getPendingActions,
  updateActionStatus,
  markActionSyncing,
  markActionFailed,
  resetActionForRetry,
  deleteAction,
  clearAllActions,
} = await import('./action-store')

describe('action-store', () => {
  beforeEach(() => {
    actionStore.clear()
  })

  describe('createAction', () => {
    it('creates an action with pending status and retryCount 0', async () => {
      const action = await createAction('updateCompensation', {
        compensationId: 'comp-1',
        data: { distanceInMetres: 100 },
      })

      expect(action).not.toBeNull()
      expect(action!.type).toBe('updateCompensation')
      expect(action!.status).toBe('pending')
      expect(action!.retryCount).toBe(0)
      expect(action!.id).toMatch(/^action_/)
    })

    it('stores the action in the database', async () => {
      const action = await createAction('applyForExchange', { exchangeId: 'ex-1' })

      expect(actionStore.has(action!.id)).toBe(true)
      expect(actionStore.get(action!.id)!.type).toBe('applyForExchange')
    })
  })

  describe('getActionsByStatus', () => {
    it('returns actions matching the given status', async () => {
      await createAction('updateCompensation', { compensationId: 'c1', data: {} })
      await createAction('updateCompensation', { compensationId: 'c2', data: {} })

      const pending = await getActionsByStatus('pending')
      expect(pending).toHaveLength(2)
    })

    it('returns empty array when no actions match', async () => {
      await createAction('updateCompensation', { compensationId: 'c1', data: {} })

      const failed = await getActionsByStatus('failed')
      expect(failed).toHaveLength(0)
    })
  })

  describe('getPendingActions', () => {
    it('returns only pending actions', async () => {
      const action = await createAction('updateCompensation', { compensationId: 'c1', data: {} })
      await createAction('updateCompensation', { compensationId: 'c2', data: {} })

      // Mark first as failed
      await markActionFailed(action!.id, 'test error')

      const pending = await getPendingActions()
      expect(pending).toHaveLength(1)
    })
  })

  describe('updateActionStatus', () => {
    it('updates action status', async () => {
      const action = await createAction('updateCompensation', { compensationId: 'c1', data: {} })

      const result = await updateActionStatus(action!.id, 'failed', 'some error')
      expect(result).toBe(true)

      const stored = actionStore.get(action!.id)!
      expect(stored.status).toBe('failed')
      expect(stored.error).toBe('some error')
    })

    it('increments retryCount when status is syncing', async () => {
      const action = await createAction('updateCompensation', { compensationId: 'c1', data: {} })
      expect(action!.retryCount).toBe(0)

      await updateActionStatus(action!.id, 'syncing')
      const stored = actionStore.get(action!.id)!
      expect(stored.retryCount).toBe(1)
    })

    it('does not increment retryCount for non-syncing status', async () => {
      const action = await createAction('updateCompensation', { compensationId: 'c1', data: {} })

      await updateActionStatus(action!.id, 'failed', 'err')
      const stored = actionStore.get(action!.id)!
      expect(stored.retryCount).toBe(0)
    })

    it('returns false for non-existent action', async () => {
      const result = await updateActionStatus('nonexistent', 'failed')
      expect(result).toBe(false)
    })

    it('preserves existing error when no new error provided', async () => {
      const action = await createAction('updateCompensation', { compensationId: 'c1', data: {} })
      await updateActionStatus(action!.id, 'failed', 'original error')
      await updateActionStatus(action!.id, 'pending')

      const stored = actionStore.get(action!.id)!
      expect(stored.error).toBe('original error')
    })
  })

  describe('markActionSyncing', () => {
    it('sets status to syncing and increments retryCount', async () => {
      const action = await createAction('addToExchange', { convocationId: 'conv-1' })

      await markActionSyncing(action!.id)

      const stored = actionStore.get(action!.id)!
      expect(stored.status).toBe('syncing')
      expect(stored.retryCount).toBe(1)
    })
  })

  describe('markActionFailed', () => {
    it('sets status to failed with error message', async () => {
      const action = await createAction('addToExchange', { convocationId: 'conv-1' })

      await markActionFailed(action!.id, 'Network error')

      const stored = actionStore.get(action!.id)!
      expect(stored.status).toBe('failed')
      expect(stored.error).toBe('Network error')
    })
  })

  describe('resetActionForRetry', () => {
    it('resets status to pending', async () => {
      const action = await createAction('addToExchange', { convocationId: 'conv-1' })
      await markActionFailed(action!.id, 'error')

      await resetActionForRetry(action!.id)

      const stored = actionStore.get(action!.id)!
      expect(stored.status).toBe('pending')
    })
  })

  describe('deleteAction', () => {
    it('removes action from store', async () => {
      const action = await createAction('updateCompensation', { compensationId: 'c1', data: {} })

      const result = await deleteAction(action!.id)
      expect(result).toBe(true)
      expect(actionStore.has(action!.id)).toBe(false)
    })
  })

  describe('clearAllActions', () => {
    it('removes all actions from store', async () => {
      await createAction('updateCompensation', { compensationId: 'c1', data: {} })
      await createAction('updateCompensation', { compensationId: 'c2', data: {} })

      const result = await clearAllActions()
      expect(result).toBe(true)
      expect(actionStore.size).toBe(0)
    })
  })
})
