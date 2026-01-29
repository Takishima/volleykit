/**
 * Unit tests for the sync engine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SyncEngine } from '../syncEngine'
import type {
  SyncQueueItem,
  SyncStorageAdapter,
  NetworkStatus,
  MutationType,
} from '../types'
import { generateItemId } from '../queue'

/**
 * Create a mock storage adapter.
 */
function createMockStorage(): SyncStorageAdapter {
  return {
    load: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Create a test queue item.
 */
function createItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: generateItemId(),
    type: 'applyForExchange',
    entityId: 'exchange-123',
    payload: { exchangeId: 'exchange-123' },
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
    displayLabel: 'Take over game',
    ...overrides,
  }
}

const onlineStatus: NetworkStatus = { isConnected: true, isKnown: true, type: 'wifi' }
const offlineStatus: NetworkStatus = { isConnected: false, isKnown: true, type: 'none' }

describe('SyncEngine', () => {
  let storage: SyncStorageAdapter
  let executors: Partial<Record<MutationType, ReturnType<typeof vi.fn>>>

  beforeEach(() => {
    storage = createMockStorage()
    executors = {
      applyForExchange: vi.fn().mockResolvedValue({ success: true }),
      withdrawFromExchange: vi.fn().mockResolvedValue(undefined),
      updateCompensation: vi.fn().mockResolvedValue({ id: 'comp-1' }),
      addToExchange: vi.fn().mockResolvedValue(undefined),
    }
  })

  describe('initialize', () => {
    it('loads queue from storage', async () => {
      const items = [createItem()]
      vi.mocked(storage.load).mockResolvedValue(items)

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      expect(storage.load).toHaveBeenCalled()
      expect(engine.getQueue()).toEqual(items)
    })

    it('handles storage load errors gracefully', async () => {
      vi.mocked(storage.load).mockRejectedValue(new Error('Storage error'))

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      expect(engine.getQueue()).toEqual([])
    })
  })

  describe('addItem', () => {
    it('adds item and persists to storage', async () => {
      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      const item = createItem()
      await engine.addItem(item)

      expect(engine.getQueue()).toContainEqual(item)
      expect(storage.save).toHaveBeenCalledWith([item])
    })

    it('calls onQueueChange callback', async () => {
      const onQueueChange = vi.fn()
      const engine = new SyncEngine({ storage, executors, onQueueChange })
      await engine.initialize()

      const item = createItem()
      await engine.addItem(item)

      expect(onQueueChange).toHaveBeenCalledWith([item])
    })
  })

  describe('removeItem', () => {
    it('removes item and persists to storage', async () => {
      const item = createItem({ id: 'item-1' })
      vi.mocked(storage.load).mockResolvedValue([item])

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      await engine.removeItem('item-1')

      expect(engine.getQueue()).toHaveLength(0)
      expect(storage.save).toHaveBeenCalledWith([])
    })
  })

  describe('getPendingCount', () => {
    it('returns count of pending items', async () => {
      const items = [
        createItem({ id: 'item-1', status: 'pending' }),
        createItem({ id: 'item-2', status: 'syncing' }),
        createItem({ id: 'item-3', status: 'pending' }),
      ]
      vi.mocked(storage.load).mockResolvedValue(items)

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      expect(engine.getPendingCount()).toBe(2)
    })
  })

  describe('hasPendingOperation', () => {
    it('returns true if entity has pending operation', async () => {
      const items = [createItem({ entityId: 'entity-1', status: 'pending' })]
      vi.mocked(storage.load).mockResolvedValue(items)

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      expect(engine.hasPendingOperation('entity-1')).toBe(true)
      expect(engine.hasPendingOperation('entity-2')).toBe(false)
    })
  })

  describe('sync', () => {
    it('does nothing when offline', async () => {
      const item = createItem()
      vi.mocked(storage.load).mockResolvedValue([item])

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      const results = await engine.sync(offlineStatus)

      expect(results).toEqual([])
      expect(executors.applyForExchange).not.toHaveBeenCalled()
    })

    it('does nothing when queue is empty', async () => {
      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      const results = await engine.sync(onlineStatus)

      expect(results).toEqual([])
    })

    it('does nothing when already syncing', async () => {
      const item = createItem()
      vi.mocked(storage.load).mockResolvedValue([item])

      // Make the executor slow
      executors.applyForExchange = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      // Start first sync
      const firstSync = engine.sync(onlineStatus)

      // Try to start second sync while first is running
      const secondSync = engine.sync(onlineStatus)

      const [firstResults, secondResults] = await Promise.all([firstSync, secondSync])

      expect(firstResults).toHaveLength(1)
      expect(secondResults).toHaveLength(0) // Should return empty since already syncing
    })

    it('processes pending items and removes successful ones', async () => {
      const item = createItem({ id: 'item-1' })
      vi.mocked(storage.load).mockResolvedValue([item])

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      const results = await engine.sync(onlineStatus)

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe('success')
      expect(engine.getQueue()).toHaveLength(0)
    })

    it('removes conflicting items from queue', async () => {
      const item = createItem({ id: 'item-1' })
      vi.mocked(storage.load).mockResolvedValue([item])
      executors.applyForExchange = vi.fn().mockRejectedValue(
        Object.assign(new Error('Already taken'), { status: 409 })
      )

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      const results = await engine.sync(onlineStatus)

      expect(results[0].status).toBe('conflict')
      expect(results[0].conflictReason).toBe('already_taken')
      expect(engine.getQueue()).toHaveLength(0)
    })

    it('keeps retryable errors in queue with incremented count', async () => {
      const item = createItem({ id: 'item-1', retryCount: 0 })
      vi.mocked(storage.load).mockResolvedValue([item])
      executors.applyForExchange = vi.fn().mockRejectedValue(
        Object.assign(new Error('Server error'), { status: 500 })
      )

      const engine = new SyncEngine({ storage, executors, maxRetries: 3 })
      await engine.initialize()

      const results = await engine.sync(onlineStatus)

      expect(results[0].status).toBe('error')
      expect(engine.getQueue()).toHaveLength(1)
      expect(engine.getQueue()[0].retryCount).toBe(1)
    })

    it('removes items after max retries exceeded', async () => {
      const item = createItem({ id: 'item-1', retryCount: 2 })
      vi.mocked(storage.load).mockResolvedValue([item])
      executors.applyForExchange = vi.fn().mockRejectedValue(
        Object.assign(new Error('Server error'), { status: 500 })
      )

      const engine = new SyncEngine({ storage, executors, maxRetries: 3 })
      await engine.initialize()

      await engine.sync(onlineStatus)

      expect(engine.getQueue()).toHaveLength(0)
    })

    it('calls onSyncStart callback', async () => {
      const item = createItem()
      vi.mocked(storage.load).mockResolvedValue([item])

      const onSyncStart = vi.fn()
      const engine = new SyncEngine({ storage, executors, onSyncStart })
      await engine.initialize()

      await engine.sync(onlineStatus)

      expect(onSyncStart).toHaveBeenCalledOnce()
    })

    it('calls onSyncComplete callback with results', async () => {
      const item = createItem()
      vi.mocked(storage.load).mockResolvedValue([item])

      const onSyncComplete = vi.fn()
      const engine = new SyncEngine({ storage, executors, onSyncComplete })
      await engine.initialize()

      await engine.sync(onlineStatus)

      expect(onSyncComplete).toHaveBeenCalledWith([
        expect.objectContaining({ status: 'success' }),
      ])
    })

    it('calls onItemProcessed callback for each item', async () => {
      const items = [
        createItem({ id: 'item-1', entityId: 'ex-1' }),
        createItem({ id: 'item-2', entityId: 'ex-2' }),
      ]
      vi.mocked(storage.load).mockResolvedValue(items)

      const onItemProcessed = vi.fn()
      const engine = new SyncEngine({ storage, executors, onItemProcessed })
      await engine.initialize()

      await engine.sync(onlineStatus)

      expect(onItemProcessed).toHaveBeenCalledTimes(2)
    })

    it('processes different mutation types correctly', async () => {
      const items = [
        createItem({ id: 'item-1', type: 'applyForExchange', entityId: 'ex-1' }),
        createItem({ id: 'item-2', type: 'updateCompensation', entityId: 'comp-1' }),
      ]
      vi.mocked(storage.load).mockResolvedValue(items)

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      const results = await engine.sync(onlineStatus)

      expect(results).toHaveLength(2)
      expect(executors.applyForExchange).toHaveBeenCalledTimes(1)
      expect(executors.updateCompensation).toHaveBeenCalledTimes(1)
    })

    it('handles missing executor gracefully', async () => {
      const item = createItem({ type: 'applyForExchange' })
      vi.mocked(storage.load).mockResolvedValue([item])

      const engine = new SyncEngine({ storage, executors: {} })
      await engine.initialize()

      const results = await engine.sync(onlineStatus)

      expect(results[0].status).toBe('error')
      expect(results[0].error?.message).toContain('No executor')
    })
  })

  describe('clearQueue', () => {
    it('clears queue and storage', async () => {
      const item = createItem()
      vi.mocked(storage.load).mockResolvedValue([item])

      const engine = new SyncEngine({ storage, executors })
      await engine.initialize()

      await engine.clearQueue()

      expect(engine.getQueue()).toHaveLength(0)
      expect(storage.clear).toHaveBeenCalled()
    })

    it('calls onQueueChange with empty array', async () => {
      const item = createItem()
      vi.mocked(storage.load).mockResolvedValue([item])

      const onQueueChange = vi.fn()
      const engine = new SyncEngine({ storage, executors, onQueueChange })
      await engine.initialize()

      await engine.clearQueue()

      expect(onQueueChange).toHaveBeenLastCalledWith([])
    })
  })
})
