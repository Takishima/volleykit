/**
 * Unit tests for the sync queue manipulation functions.
 */

import { describe, it, expect } from 'vitest'
import {
  addToQueue,
  removeFromQueue,
  updateItemStatus,
  getPendingItems,
  generateItemId,
  getMutationConfig,
} from '../queue'
import type { SyncQueueItem } from '../types'

/**
 * Helper to create a test queue item.
 */
function createItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: generateItemId(),
    type: 'applyForExchange',
    entityId: 'exchange-123',
    payload: {},
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
    displayLabel: 'Take over game',
    ...overrides,
  }
}

describe('addToQueue', () => {
  describe('deduplication strategy', () => {
    it('does not add duplicate applyForExchange for same entity', () => {
      const existing = createItem({ id: 'item-1', entityId: 'ex-1' })
      const duplicate = createItem({ id: 'item-2', entityId: 'ex-1' })

      const result = addToQueue(duplicate, [existing])

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-1')
    })

    it('allows applyForExchange for different entities', () => {
      const existing = createItem({ id: 'item-1', entityId: 'ex-1' })
      const different = createItem({ id: 'item-2', entityId: 'ex-2' })

      const result = addToQueue(different, [existing])

      expect(result).toHaveLength(2)
    })

    it('does not add duplicate withdrawFromExchange for same entity', () => {
      const existing = createItem({
        id: 'item-1',
        type: 'withdrawFromExchange',
        entityId: 'ex-1',
      })
      const duplicate = createItem({
        id: 'item-2',
        type: 'withdrawFromExchange',
        entityId: 'ex-1',
      })

      const result = addToQueue(duplicate, [existing])

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-1')
    })
  })

  describe('replace strategy', () => {
    it('replaces existing updateCompensation with newer one', () => {
      const existing = createItem({
        id: 'item-1',
        type: 'updateCompensation',
        entityId: 'comp-1',
        payload: { kilometers: 50 },
      })
      const newer = createItem({
        id: 'item-2',
        type: 'updateCompensation',
        entityId: 'comp-1',
        payload: { kilometers: 60 },
      })

      const result = addToQueue(newer, [existing])

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-2')
      expect(result[0].payload).toEqual({ kilometers: 60 })
    })

    it('replaces existing addToExchange with newer one', () => {
      const existing = createItem({
        id: 'item-1',
        type: 'addToExchange',
        entityId: 'assign-1',
        payload: { reason: 'Old reason' },
      })
      const newer = createItem({
        id: 'item-2',
        type: 'addToExchange',
        entityId: 'assign-1',
        payload: { reason: 'New reason' },
      })

      const result = addToQueue(newer, [existing])

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('item-2')
      expect(result[0].payload).toEqual({ reason: 'New reason' })
    })
  })

  describe('opposing operations', () => {
    it('removes applyForExchange when withdrawFromExchange is added for same entity', () => {
      const apply = createItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
      })
      const withdraw = createItem({
        id: 'item-2',
        type: 'withdrawFromExchange',
        entityId: 'ex-1',
      })

      const result = addToQueue(withdraw, [apply])

      expect(result).toHaveLength(0)
    })

    it('removes withdrawFromExchange when applyForExchange is added for same entity', () => {
      const withdraw = createItem({
        id: 'item-1',
        type: 'withdrawFromExchange',
        entityId: 'ex-1',
      })
      const apply = createItem({
        id: 'item-2',
        type: 'applyForExchange',
        entityId: 'ex-1',
      })

      const result = addToQueue(apply, [withdraw])

      expect(result).toHaveLength(0)
    })

    it('does not remove opposing operations for different entities', () => {
      const apply = createItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
      })
      const withdraw = createItem({
        id: 'item-2',
        type: 'withdrawFromExchange',
        entityId: 'ex-2', // Different entity
      })

      const result = addToQueue(withdraw, [apply])

      expect(result).toHaveLength(2)
    })

    it('handles apply -> withdraw -> apply sequence correctly', () => {
      let queue: SyncQueueItem[] = []

      // Apply
      const apply1 = createItem({
        id: 'item-1',
        type: 'applyForExchange',
        entityId: 'ex-1',
      })
      queue = addToQueue(apply1, queue)
      expect(queue).toHaveLength(1)

      // Withdraw (cancels apply)
      const withdraw = createItem({
        id: 'item-2',
        type: 'withdrawFromExchange',
        entityId: 'ex-1',
      })
      queue = addToQueue(withdraw, queue)
      expect(queue).toHaveLength(0)

      // Apply again
      const apply2 = createItem({
        id: 'item-3',
        type: 'applyForExchange',
        entityId: 'ex-1',
      })
      queue = addToQueue(apply2, queue)
      expect(queue).toHaveLength(1)
      expect(queue[0].id).toBe('item-3')
    })
  })

  describe('adding new items', () => {
    it('adds new item to empty queue', () => {
      const item = createItem()
      const result = addToQueue(item, [])

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(item)
    })

    it('adds new item to end of queue', () => {
      const existing = createItem({ id: 'item-1', entityId: 'ex-1' })
      const newItem = createItem({ id: 'item-2', entityId: 'ex-2' })

      const result = addToQueue(newItem, [existing])

      expect(result).toHaveLength(2)
      expect(result[1]).toBe(newItem)
    })
  })
})

describe('removeFromQueue', () => {
  it('removes item by id', () => {
    const items = [createItem({ id: 'item-1' }), createItem({ id: 'item-2' })]

    const result = removeFromQueue('item-1', items)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('item-2')
  })

  it('returns same array if id not found', () => {
    const items = [createItem({ id: 'item-1' })]

    const result = removeFromQueue('nonexistent', items)

    expect(result).toHaveLength(1)
  })

  it('returns empty array when removing last item', () => {
    const items = [createItem({ id: 'item-1' })]

    const result = removeFromQueue('item-1', items)

    expect(result).toHaveLength(0)
  })
})

describe('updateItemStatus', () => {
  it('updates status of specified item', () => {
    const items = [
      createItem({ id: 'item-1', status: 'pending' }),
      createItem({ id: 'item-2', status: 'pending' }),
    ]

    const result = updateItemStatus('item-1', 'syncing', items)

    expect(result[0].status).toBe('syncing')
    expect(result[1].status).toBe('pending')
  })

  it('does not modify other items', () => {
    const items = [createItem({ id: 'item-1', status: 'pending' })]

    const result = updateItemStatus('nonexistent', 'syncing', items)

    expect(result[0].status).toBe('pending')
  })
})

describe('getPendingItems', () => {
  it('returns only pending items', () => {
    const items = [
      createItem({ id: 'item-1', status: 'pending' }),
      createItem({ id: 'item-2', status: 'syncing' }),
      createItem({ id: 'item-3', status: 'pending' }),
      createItem({ id: 'item-4', status: 'success' }),
      createItem({ id: 'item-5', status: 'error' }),
    ]

    const result = getPendingItems(items)

    expect(result).toHaveLength(2)
    expect(result.map((i) => i.id)).toEqual(['item-1', 'item-3'])
  })

  it('returns empty array when no pending items', () => {
    const items = [createItem({ id: 'item-1', status: 'success' })]

    const result = getPendingItems(items)

    expect(result).toHaveLength(0)
  })
})

describe('generateItemId', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateItemId()))
    expect(ids.size).toBe(100)
  })

  it('starts with sync_ prefix', () => {
    const id = generateItemId()
    expect(id).toMatch(/^sync_\d+_[a-z0-9]+$/)
  })
})

describe('getMutationConfig', () => {
  it('returns config for applyForExchange', () => {
    const config = getMutationConfig('applyForExchange')

    expect(config.strategy).toBe('deduplicate')
    expect(config.opposingType).toBe('withdrawFromExchange')
  })

  it('returns config for withdrawFromExchange', () => {
    const config = getMutationConfig('withdrawFromExchange')

    expect(config.strategy).toBe('deduplicate')
    expect(config.opposingType).toBe('applyForExchange')
  })

  it('returns config for updateCompensation', () => {
    const config = getMutationConfig('updateCompensation')

    expect(config.strategy).toBe('replace')
    expect(config.opposingType).toBeUndefined()
  })

  it('returns config for addToExchange', () => {
    const config = getMutationConfig('addToExchange')

    expect(config.strategy).toBe('replace')
    expect(config.opposingType).toBeUndefined()
  })
})
