/**
 * Offline Sync Queue - Type definitions
 *
 * This module defines the types for the offline sync queue system.
 * The sync queue allows mutations to be queued when offline and
 * automatically synced when connectivity is restored.
 */

/**
 * Supported mutation types that can be queued offline.
 */
export type MutationType =
  | 'applyForExchange'
  | 'withdrawFromExchange'
  | 'addToExchange'
  | 'updateCompensation'

/**
 * Strategy for handling duplicate operations in the queue.
 * - 'deduplicate': Only keep one operation per entity (for idempotent actions)
 * - 'replace': Replace existing operation with newer one (for data-carrying actions)
 */
export type DeduplicationStrategy = 'deduplicate' | 'replace'

/**
 * Status of an item in the sync queue.
 */
export type SyncItemStatus = 'pending' | 'syncing' | 'success' | 'conflict' | 'error'

/**
 * Reason why a sync operation resulted in a conflict.
 */
export type ConflictReason =
  | 'already_taken'
  | 'not_found'
  | 'expired'
  | 'permission_denied'
  | 'unknown'

/**
 * A single item in the sync queue.
 */
export interface SyncQueueItem {
  /** Unique identifier for this queue item */
  id: string
  /** Type of mutation to perform */
  type: MutationType
  /** ID of the entity being acted upon */
  entityId: string
  /** Mutation payload data */
  payload: unknown
  /** Timestamp when the item was queued */
  timestamp: number
  /** Current status of the item */
  status: SyncItemStatus
  /** Number of retry attempts */
  retryCount: number
  /** Human-readable label for UI display (e.g., "Take over game") */
  displayLabel: string
  /** Optional entity label for context (e.g., "HC Luzern vs VBC Steinhausen") */
  entityLabel?: string
}

/**
 * Result of syncing a single queue item.
 */
export interface SyncResult {
  /** The queue item that was processed */
  item: SyncQueueItem
  /** Result status */
  status: 'success' | 'conflict' | 'error'
  /** Reason for conflict (if status is 'conflict') */
  conflictReason?: ConflictReason
  /** Response data from the server (if successful) */
  serverResponse?: unknown
  /** Error object (if status is 'error' or 'conflict') */
  error?: Error
}

/**
 * State of the sync queue.
 */
export interface SyncQueueState {
  /** Items currently in the queue */
  items: SyncQueueItem[]
  /** Whether a sync operation is in progress */
  isSyncing: boolean
  /** Timestamp of the last sync attempt */
  lastSyncAt: number | null
  /** Results from the last sync operation */
  lastSyncResults: SyncResult[]
}

/**
 * Platform-specific storage adapter interface.
 * Implementations provide persistence for the sync queue.
 */
export interface SyncStorageAdapter {
  /** Load the queue from storage */
  load(): Promise<SyncQueueItem[]>
  /** Save the queue to storage */
  save(items: SyncQueueItem[]): Promise<void>
  /** Clear all items from storage */
  clear(): Promise<void>
}

/**
 * Network status information.
 */
export interface NetworkStatus {
  /** Whether the device is connected to a network */
  isConnected: boolean
  /** Whether the connection status is known */
  isKnown: boolean
  /** Type of network connection */
  type: 'wifi' | 'cellular' | 'none' | 'unknown'
}

/**
 * Configuration for a mutation type.
 */
export interface MutationConfig {
  /** Deduplication strategy to use */
  strategy: DeduplicationStrategy
  /** Type of mutation that opposes this one (for cancellation) */
  opposingType?: MutationType
}
