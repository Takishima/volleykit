/**
 * Integration tests for the complete sync flow.
 *
 * Tests the full cycle of:
 * - Queueing operations while offline
 * - Persisting queue to storage
 * - Syncing when online
 * - Handling conflicts and errors
 * - Verifying callbacks are called correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncEngine } from '../syncEngine'
import { generateItemId } from '../queue'
import type { SyncQueueItem, SyncStorageAdapter, NetworkStatus, MutationType } from '../types'

/**
 * In-memory storage adapter for testing.
 * Simulates real storage behavior with async operations.
 */
function createInMemoryStorage(): SyncStorageAdapter & {
  data: SyncQueueItem[]
  reset: () => void
} {
  let data: SyncQueueItem[] = []

  return {
    get data() {
      return data
    },
    load: async () => {
      // Simulate async I/O
      await new Promise((r) => setTimeout(r, 1))
      return [...data]
    },
    save: async (items) => {
      await new Promise((r) => setTimeout(r, 1))
      data = [...items]
    },
    clear: async () => {
      await new Promise((r) => setTimeout(r, 1))
      data = []
    },
    reset: () => {
      data = []
    },
  }
}

/**
 * Create a test queue item with defaults.
 */
function createItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: generateItemId(),
    type: 'applyForExchange',
    entityId: `exchange-${Math.random().toString(36).slice(2, 9)}`,
    payload: { exchangeId: 'test' },
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
    displayLabel: 'Take over game',
    ...overrides,
  }
}

const onlineStatus: NetworkStatus = { isConnected: true, isKnown: true, type: 'wifi' }
const offlineStatus: NetworkStatus = { isConnected: false, isKnown: true, type: 'none' }

describe('Sync Integration - Full Flow', () => {
  let storage: ReturnType<typeof createInMemoryStorage>
  let executors: Partial<Record<MutationType, ReturnType<typeof vi.fn>>>

  beforeEach(() => {
    storage = createInMemoryStorage()
    executors = {
      applyForExchange: vi.fn().mockResolvedValue({ success: true }),
      withdrawFromExchange: vi.fn().mockResolvedValue(undefined),
      updateCompensation: vi.fn().mockResolvedValue({ id: 'comp-1' }),
      addToExchange: vi.fn().mockResolvedValue(undefined),
    }
  })

  describe('offline queueing to online sync flow', () => {
    it('persists queued items and syncs them when online', async () => {
      const onQueueChange = vi.fn()
      const onSyncStart = vi.fn()
      const onSyncComplete = vi.fn()

      const engine = new SyncEngine({
        storage,
        executors,
        onQueueChange,
        onSyncStart,
        onSyncComplete,
      })

      await engine.initialize()
      expect(engine.getQueue()).toHaveLength(0)

      // Reset call count after initialize
      onQueueChange.mockClear()

      // Queue items while "offline"
      const item1 = createItem({ entityId: 'ex-1' })
      const item2 = createItem({ entityId: 'ex-2' })

      await engine.addItem(item1)
      await engine.addItem(item2)

      // Verify items are in queue and storage
      expect(engine.getQueue()).toHaveLength(2)
      expect(storage.data).toHaveLength(2)
      expect(onQueueChange).toHaveBeenCalledTimes(2)

      // Verify sync does nothing while offline
      const offlineResults = await engine.sync(offlineStatus)
      expect(offlineResults).toHaveLength(0)
      expect(executors.applyForExchange).not.toHaveBeenCalled()

      // Now "come online" and sync
      const results = await engine.sync(onlineStatus)

      expect(onSyncStart).toHaveBeenCalledOnce()
      expect(results).toHaveLength(2)
      expect(results.every((r) => r.status === 'success')).toBe(true)
      expect(onSyncComplete).toHaveBeenCalledWith(results)

      // Verify queue is empty after successful sync
      expect(engine.getQueue()).toHaveLength(0)
      expect(storage.data).toHaveLength(0)
    })

    it('restores queue from storage on initialization', async () => {
      // Pre-populate storage
      const preexistingItems = [
        createItem({ id: 'pre-1', entityId: 'ex-1' }),
        createItem({ id: 'pre-2', entityId: 'ex-2' }),
      ]
      await storage.save(preexistingItems)

      // Create engine and initialize
      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      // Should have loaded items from storage
      expect(engine.getQueue()).toHaveLength(2)
      expect(engine.getPendingCount()).toBe(2)
    })

    it('handles opposing operations correctly', async () => {
      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      // Add apply operation
      const applyItem = createItem({
        type: 'applyForExchange',
        entityId: 'ex-1',
      })
      await engine.addItem(applyItem)
      expect(engine.getQueue()).toHaveLength(1)

      // Add withdraw for same entity - should cancel out
      const withdrawItem = createItem({
        type: 'withdrawFromExchange',
        entityId: 'ex-1',
      })
      await engine.addItem(withdrawItem)

      // Queue should be empty (opposing operations cancel)
      expect(engine.getQueue()).toHaveLength(0)
      expect(storage.data).toHaveLength(0)

      // Sync should have nothing to do
      const results = await engine.sync(onlineStatus)
      expect(results).toHaveLength(0)
      expect(executors.applyForExchange).not.toHaveBeenCalled()
      expect(executors.withdrawFromExchange).not.toHaveBeenCalled()
    })

    it('deduplicates repeated operations on same entity', async () => {
      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      // Add same operation twice
      const item1 = createItem({ entityId: 'ex-1' })
      const item2 = createItem({ entityId: 'ex-1' })

      await engine.addItem(item1)
      await engine.addItem(item2)

      // Should only have one item (deduplicated)
      expect(engine.getQueue()).toHaveLength(1)
      expect(engine.getQueue()[0].id).toBe(item1.id)

      // Sync should only call executor once
      await engine.sync(onlineStatus)
      expect(executors.applyForExchange).toHaveBeenCalledTimes(1)
    })

    it('replaces data-carrying operations with newer payload', async () => {
      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      // Add compensation update
      const item1 = createItem({
        type: 'updateCompensation',
        entityId: 'comp-1',
        payload: { kilometers: 50 },
      })
      await engine.addItem(item1)

      // Add newer update for same compensation
      const item2 = createItem({
        type: 'updateCompensation',
        entityId: 'comp-1',
        payload: { kilometers: 75 },
      })
      await engine.addItem(item2)

      // Should have one item with newer payload
      expect(engine.getQueue()).toHaveLength(1)
      expect(engine.getQueue()[0].payload).toEqual({ kilometers: 75 })

      // Sync should use newer payload
      await engine.sync(onlineStatus)
      expect(executors.updateCompensation).toHaveBeenCalledTimes(1)
      expect(executors.updateCompensation).toHaveBeenCalledWith(
        expect.objectContaining({ payload: { kilometers: 75 } })
      )
    })
  })

  describe('conflict handling', () => {
    it('removes items with conflicts from queue', async () => {
      const onSyncComplete = vi.fn()

      // Setup executor to return conflict
      executors.applyForExchange = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('Already taken'), { status: 409 }))

      const engine = new SyncEngine({
        storage,
        executors,
        onSyncComplete,
      })
      await engine.initialize()

      // Add item
      const item = createItem({ entityId: 'ex-1' })
      await engine.addItem(item)

      // Sync
      const results = await engine.sync(onlineStatus)

      // Verify conflict was detected
      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('conflict')
      expect(results[0].conflictReason).toBe('already_taken')

      // Verify item was removed from queue
      expect(engine.getQueue()).toHaveLength(0)
      expect(storage.data).toHaveLength(0)
    })

    it('retries transient errors with exponential backoff tracking', async () => {
      const onItemProcessed = vi.fn()

      // Setup executor to fail with server error
      executors.applyForExchange = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error('Server error'), { status: 500 }))

      const engine = new SyncEngine({
        storage,
        executors,
        onItemProcessed,
        maxRetries: 3,
      })
      await engine.initialize()

      // Add item
      const item = createItem({ id: 'retry-item', entityId: 'ex-1' })
      await engine.addItem(item)

      // First sync attempt
      let results = await engine.sync(onlineStatus)
      expect(results[0].status).toBe('error')
      expect(engine.getQueue()).toHaveLength(1)
      expect(engine.getQueue()[0].retryCount).toBe(1)

      // Second sync attempt
      results = await engine.sync(onlineStatus)
      expect(results[0].status).toBe('error')
      expect(engine.getQueue()[0].retryCount).toBe(2)

      // Third sync attempt - max retries exceeded
      results = await engine.sync(onlineStatus)
      expect(results[0].status).toBe('error')
      expect(engine.getQueue()).toHaveLength(0) // Removed after max retries
    })

    it('processes mixed success/conflict/error results correctly', async () => {
      const onSyncComplete = vi.fn()

      // Different results for different items
      executors.applyForExchange = vi
        .fn()
        .mockResolvedValueOnce({ success: true }) // First call succeeds
        .mockRejectedValueOnce(Object.assign(new Error('Taken'), { status: 409 })) // Second conflicts
        .mockRejectedValueOnce(Object.assign(new Error('Server error'), { status: 500 })) // Third errors

      const engine = new SyncEngine({
        storage,
        executors,
        onSyncComplete,
        maxRetries: 3,
      })
      await engine.initialize()

      // Add three items
      await engine.addItem(createItem({ id: 'item-1', entityId: 'ex-1' }))
      await engine.addItem(createItem({ id: 'item-2', entityId: 'ex-2' }))
      await engine.addItem(createItem({ id: 'item-3', entityId: 'ex-3' }))

      // Sync
      const results = await engine.sync(onlineStatus)

      // Verify results
      expect(results).toHaveLength(3)
      expect(results[0].status).toBe('success')
      expect(results[1].status).toBe('conflict')
      expect(results[2].status).toBe('error')

      // Queue should have only the errored item (for retry)
      expect(engine.getQueue()).toHaveLength(1)
      expect(engine.getQueue()[0].id).toBe('item-3')
    })
  })

  describe('concurrent sync prevention', () => {
    it('prevents multiple concurrent syncs', async () => {
      // Make executor slow
      executors.applyForExchange = vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)))

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      await engine.addItem(createItem({ entityId: 'ex-1' }))
      await engine.addItem(createItem({ entityId: 'ex-2' }))

      // Start first sync
      const sync1 = engine.sync(onlineStatus)

      // Try to start second sync while first is running
      const sync2 = engine.sync(onlineStatus)

      const [results1, results2] = await Promise.all([sync1, sync2])

      // First sync should process all items
      expect(results1).toHaveLength(2)
      // Second sync should be blocked
      expect(results2).toHaveLength(0)

      // Executor should only be called twice (not four times)
      expect(executors.applyForExchange).toHaveBeenCalledTimes(2)
    })
  })

  describe('queue management', () => {
    it('clears queue and storage', async () => {
      const onQueueChange = vi.fn()
      const engine = new SyncEngine({ storage, executors, onQueueChange })
      await engine.initialize()

      // Add items
      await engine.addItem(createItem({ entityId: 'ex-1' }))
      await engine.addItem(createItem({ entityId: 'ex-2' }))

      expect(engine.getQueue()).toHaveLength(2)

      // Clear queue
      await engine.clearQueue()

      expect(engine.getQueue()).toHaveLength(0)
      expect(storage.data).toHaveLength(0)
      expect(onQueueChange).toHaveBeenLastCalledWith([])
    })

    it('correctly reports pending operations for entities', async () => {
      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      await engine.addItem(createItem({ entityId: 'ex-1' }))

      expect(engine.hasPendingOperation('ex-1')).toBe(true)
      expect(engine.hasPendingOperation('ex-2')).toBe(false)

      // After sync, should have no pending operations
      await engine.sync(onlineStatus)
      expect(engine.hasPendingOperation('ex-1')).toBe(false)
    })

    it('handles multiple mutation types in single sync', async () => {
      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      await engine.addItem(
        createItem({
          type: 'applyForExchange',
          entityId: 'ex-1',
        })
      )
      await engine.addItem(
        createItem({
          type: 'updateCompensation',
          entityId: 'comp-1',
          payload: { kilometers: 100 },
        })
      )
      await engine.addItem(
        createItem({
          type: 'addToExchange',
          entityId: 'assign-1',
          payload: { assignmentId: 'assign-1', reason: 'test' },
        })
      )

      const results = await engine.sync(onlineStatus)

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.status === 'success')).toBe(true)

      // Verify each executor was called
      expect(executors.applyForExchange).toHaveBeenCalledTimes(1)
      expect(executors.updateCompensation).toHaveBeenCalledTimes(1)
      expect(executors.addToExchange).toHaveBeenCalledTimes(1)
    })
  })

  describe('error recovery', () => {
    it('recovers from storage load failure', async () => {
      const failingStorage: SyncStorageAdapter = {
        load: vi.fn().mockRejectedValue(new Error('Storage corrupt')),
        save: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      }

      const engine = new SyncEngine({ storage: failingStorage, executors })
      await engine.initialize()

      // Should start with empty queue
      expect(engine.getQueue()).toHaveLength(0)

      // Should still be able to add items
      await engine.addItem(createItem({ entityId: 'ex-1' }))
      expect(engine.getQueue()).toHaveLength(1)
    })

    it('continues sync if one item fails', async () => {
      executors.applyForExchange = vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('Failed'), { status: 500 }))
        .mockResolvedValueOnce({ success: true })

      const engine = new SyncEngine({ storage, executors, maxRetries: 3 })
      await engine.initialize()

      await engine.addItem(createItem({ id: 'fail-item', entityId: 'ex-1' }))
      await engine.addItem(createItem({ id: 'success-item', entityId: 'ex-2' }))

      const results = await engine.sync(onlineStatus)

      // Both should have been attempted
      expect(results).toHaveLength(2)
      expect(results[0].status).toBe('error')
      expect(results[1].status).toBe('success')

      // Only failed item should remain
      expect(engine.getQueue()).toHaveLength(1)
      expect(engine.getQueue()[0].id).toBe('fail-item')
    })
  })

  describe('callback timing', () => {
    it('calls callbacks in correct order', async () => {
      const callOrder: string[] = []

      const engine = new SyncEngine({
        storage,
        executors,
        onQueueChange: () => callOrder.push('queueChange'),
        onSyncStart: () => callOrder.push('syncStart'),
        onItemProcessed: () => callOrder.push('itemProcessed'),
        onSyncComplete: () => callOrder.push('syncComplete'),
      })

      await engine.initialize()
      callOrder.length = 0 // Clear init calls

      await engine.addItem(createItem({ entityId: 'ex-1' }))
      expect(callOrder).toEqual(['queueChange'])

      callOrder.length = 0
      await engine.sync(onlineStatus)

      expect(callOrder).toEqual(['syncStart', 'itemProcessed', 'queueChange', 'syncComplete'])
    })
  })
})

describe('Sync Integration - Persistence', () => {
  it('survives page reload simulation', async () => {
    const storage = createInMemoryStorage()
    const executors = {
      applyForExchange: vi.fn().mockResolvedValue({ success: true }),
    }

    // Session 1: Add items
    const engine1 = new SyncEngine({ storage, executors })
    await engine1.initialize()
    await engine1.addItem(createItem({ id: 'persist-1', entityId: 'ex-1' }))
    await engine1.addItem(createItem({ id: 'persist-2', entityId: 'ex-2' }))

    // Simulate "page unload" - engine1 goes away but storage persists
    expect(storage.data).toHaveLength(2)

    // Session 2: New engine loads from storage
    const engine2 = new SyncEngine({ storage, executors })
    await engine2.initialize()

    // Should have restored items
    expect(engine2.getQueue()).toHaveLength(2)
    expect(engine2.getQueue().map((i) => i.id)).toEqual(['persist-1', 'persist-2'])

    // Should be able to sync
    const results = await engine2.sync(onlineStatus)
    expect(results).toHaveLength(2)
    expect(executors.applyForExchange).toHaveBeenCalledTimes(2)
  })
})
