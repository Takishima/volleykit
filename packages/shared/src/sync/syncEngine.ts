/**
 * Offline Sync Queue - Sync Engine
 *
 * The sync engine orchestrates the synchronization of queued operations
 * when the device comes back online.
 */

import type {
  SyncQueueItem,
  SyncResult,
  SyncStorageAdapter,
  NetworkStatus,
  MutationType,
} from './types'
import { addToQueue, removeFromQueue, getPendingItems } from './queue'
import {
  categorizeConflict,
  isRetryableError,
  isConflictError,
  type ApiErrorWithStatus,
} from './conflictResolver'

/**
 * Type for mutation executor functions.
 */
export type MutationExecutor = (item: SyncQueueItem) => Promise<unknown>

/**
 * Configuration for the sync engine.
 */
export interface SyncEngineConfig {
  /** Storage adapter for persisting the queue */
  storage: SyncStorageAdapter
  /** Executor functions for each mutation type */
  executors: Partial<Record<MutationType, MutationExecutor>>
  /** Called when sync starts */
  onSyncStart?: () => void
  /** Called when sync completes with all results */
  onSyncComplete?: (results: SyncResult[]) => void
  /** Called after each item is processed */
  onItemProcessed?: (result: SyncResult) => void
  /** Called when the queue changes */
  onQueueChange?: (items: SyncQueueItem[]) => void
  /** Maximum number of retries before giving up */
  maxRetries?: number
}

/**
 * Default configuration values.
 */
const DEFAULT_MAX_RETRIES = 3

/**
 * The sync engine manages the offline sync queue and processes
 * pending operations when connectivity is restored.
 */
export class SyncEngine {
  private queue: SyncQueueItem[] = []
  private isSyncing = false
  private config: Required<
    Pick<SyncEngineConfig, 'storage' | 'executors' | 'maxRetries'>
  > &
    Omit<SyncEngineConfig, 'storage' | 'executors' | 'maxRetries'>

  constructor(config: SyncEngineConfig) {
    this.config = {
      maxRetries: DEFAULT_MAX_RETRIES,
      ...config,
    }
  }

  /**
   * Initialize the sync engine by loading the queue from storage.
   */
  async initialize(): Promise<void> {
    try {
      this.queue = await this.config.storage.load()
      this.config.onQueueChange?.(this.queue)
    } catch (error) {
      // If loading fails (e.g., corrupt data), start with empty queue
      console.error('Failed to load sync queue from storage:', error)
      this.queue = []
    }
  }

  /**
   * Add an item to the queue.
   *
   * @param item - The item to add
   */
  async addItem(item: SyncQueueItem): Promise<void> {
    this.queue = addToQueue(item, this.queue)
    await this.persistQueue()
    this.config.onQueueChange?.(this.queue)
  }

  /**
   * Remove an item from the queue.
   *
   * @param itemId - ID of the item to remove
   */
  async removeItem(itemId: string): Promise<void> {
    this.queue = removeFromQueue(itemId, this.queue)
    await this.persistQueue()
    this.config.onQueueChange?.(this.queue)
  }

  /**
   * Get a copy of the current queue.
   */
  getQueue(): SyncQueueItem[] {
    return [...this.queue]
  }

  /**
   * Get the count of pending items.
   */
  getPendingCount(): number {
    return getPendingItems(this.queue).length
  }

  /**
   * Check if a sync operation is in progress.
   */
  getIsSyncing(): boolean {
    return this.isSyncing
  }

  /**
   * Check if an entity has a pending operation.
   *
   * @param entityId - The entity ID to check
   * @returns True if there's a pending operation for this entity
   */
  hasPendingOperation(entityId: string): boolean {
    return this.queue.some(
      (item) => item.entityId === entityId && item.status === 'pending'
    )
  }

  /**
   * Sync all pending items.
   *
   * @param networkStatus - Current network status
   * @returns Array of sync results
   */
  async sync(networkStatus: NetworkStatus): Promise<SyncResult[]> {
    // Don't sync if offline or already syncing
    if (!networkStatus.isConnected || this.isSyncing) {
      return []
    }

    const pending = getPendingItems(this.queue)
    if (pending.length === 0) {
      return []
    }

    this.isSyncing = true
    this.config.onSyncStart?.()

    const results: SyncResult[] = []

    for (const item of pending) {
      const result = await this.processItem(item)
      results.push(result)
      this.config.onItemProcessed?.(result)

      // Update queue based on result
      if (result.status === 'success' || result.status === 'conflict') {
        // Remove successful or conflicted items
        this.queue = removeFromQueue(item.id, this.queue)
      } else if (result.status === 'error') {
        // Increment retry count
        const updatedItem = { ...item, retryCount: item.retryCount + 1 }

        if (updatedItem.retryCount >= this.config.maxRetries) {
          // Max retries exceeded, remove from queue
          this.queue = removeFromQueue(item.id, this.queue)
        } else {
          // Update item in queue with incremented retry count
          this.queue = this.queue.map((q) =>
            q.id === item.id ? updatedItem : q
          )
        }
      }
    }

    await this.persistQueue()
    this.config.onQueueChange?.(this.queue)
    this.isSyncing = false
    this.config.onSyncComplete?.(results)

    return results
  }

  /**
   * Process a single queue item.
   *
   * @param item - The item to process
   * @returns The sync result
   */
  private async processItem(item: SyncQueueItem): Promise<SyncResult> {
    const executor = this.config.executors[item.type]

    if (!executor) {
      return {
        item,
        status: 'error',
        error: new Error(`No executor registered for mutation type: ${item.type}`),
      }
    }

    try {
      const response = await executor(item)
      return {
        item,
        status: 'success',
        serverResponse: response,
      }
    } catch (error) {
      const err = error as ApiErrorWithStatus

      if (isConflictError(err)) {
        return {
          item,
          status: 'conflict',
          conflictReason: categorizeConflict(err, item.type),
          error: err,
        }
      }

      if (isRetryableError(err)) {
        return {
          item,
          status: 'error',
          error: err,
        }
      }

      // Non-retryable, non-conflict error - treat as conflict with unknown reason
      return {
        item,
        status: 'conflict',
        conflictReason: 'unknown',
        error: err,
      }
    }
  }

  /**
   * Clear all items from the queue.
   */
  async clearQueue(): Promise<void> {
    this.queue = []
    await this.config.storage.clear()
    this.config.onQueueChange?.(this.queue)
  }

  /**
   * Persist the queue to storage.
   */
  private async persistQueue(): Promise<void> {
    try {
      await this.config.storage.save(this.queue)
    } catch (error) {
      console.error('Failed to persist sync queue:', error)
    }
  }
}
