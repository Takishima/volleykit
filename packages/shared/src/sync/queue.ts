/**
 * Offline Sync Queue - Queue manipulation logic
 *
 * This module provides functions for managing the sync queue,
 * including adding, removing, and deduplicating items.
 */

import type { SyncQueueItem, MutationType, MutationConfig } from './types'

/**
 * Configuration for each mutation type.
 * Defines deduplication strategy and opposing operations.
 */
const MUTATION_CONFIG: Record<MutationType, MutationConfig> = {
  applyForExchange: {
    strategy: 'deduplicate',
    opposingType: 'withdrawFromExchange',
  },
  withdrawFromExchange: {
    strategy: 'deduplicate',
    opposingType: 'applyForExchange',
  },
  addToExchange: {
    strategy: 'replace',
  },
  updateCompensation: {
    strategy: 'replace',
  },
}

/**
 * Add an item to the queue with deduplication and conflict resolution.
 *
 * Handles three cases:
 * 1. Opposing operations cancel out (apply + withdraw = nothing)
 * 2. Duplicate operations are deduplicated (keep first) or replaced (keep latest)
 * 3. New operations are added to the queue
 *
 * @param item - The item to add
 * @param queue - The current queue
 * @returns The updated queue
 */
export function addToQueue(item: SyncQueueItem, queue: SyncQueueItem[]): SyncQueueItem[] {
  const config = MUTATION_CONFIG[item.type]

  // Check for opposing operations that cancel out
  if (config.opposingType) {
    const opposingIndex = queue.findIndex(
      (q) => q.entityId === item.entityId && q.type === config.opposingType
    )

    if (opposingIndex !== -1) {
      // Remove the opposing operation - they cancel out
      return queue.filter((_, i) => i !== opposingIndex)
    }
  }

  // Find existing item of same type + entity
  const existingIndex = queue.findIndex(
    (q) => q.entityId === item.entityId && q.type === item.type
  )

  if (existingIndex !== -1) {
    if (config.strategy === 'deduplicate') {
      // Already queued, skip
      return queue
    }
    // Replace strategy - remove old, add new
    return [...queue.filter((_, i) => i !== existingIndex), item]
  }

  return [...queue, item]
}

/**
 * Remove an item from the queue by ID.
 *
 * @param itemId - ID of the item to remove
 * @param queue - The current queue
 * @returns The updated queue
 */
export function removeFromQueue(itemId: string, queue: SyncQueueItem[]): SyncQueueItem[] {
  return queue.filter((item) => item.id !== itemId)
}

/**
 * Update the status of an item in the queue.
 *
 * @param itemId - ID of the item to update
 * @param status - New status
 * @param queue - The current queue
 * @returns The updated queue
 */
export function updateItemStatus(
  itemId: string,
  status: SyncQueueItem['status'],
  queue: SyncQueueItem[]
): SyncQueueItem[] {
  return queue.map((item) => (item.id === itemId ? { ...item, status } : item))
}

/**
 * Get all pending items from the queue.
 *
 * @param queue - The current queue
 * @returns Items with status 'pending'
 */
export function getPendingItems(queue: SyncQueueItem[]): SyncQueueItem[] {
  return queue.filter((item) => item.status === 'pending')
}

/**
 * Generate a unique ID for a queue item.
 *
 * @returns A unique string ID
 */
export function generateItemId(): string {
  return `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Get the configuration for a mutation type.
 *
 * @param type - The mutation type
 * @returns The mutation configuration
 */
export function getMutationConfig(type: MutationType): MutationConfig {
  return MUTATION_CONFIG[type]
}
