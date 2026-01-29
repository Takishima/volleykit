/**
 * Offline Sync Queue - Public API
 *
 * This module provides offline mutation queuing with automatic sync
 * when connectivity is restored.
 */

// Type exports
export type {
  MutationType,
  DeduplicationStrategy,
  SyncItemStatus,
  ConflictReason,
  SyncQueueItem,
  SyncResult,
  SyncQueueState,
  SyncStorageAdapter,
  NetworkStatus,
  MutationConfig,
} from './types'

// Queue manipulation
export {
  addToQueue,
  removeFromQueue,
  updateItemStatus,
  getPendingItems,
  generateItemId,
  getMutationConfig,
} from './queue'

// Conflict resolution
export {
  categorizeConflict,
  isRetryableError,
  isConflictError,
  isSyncNetworkError,
  type ApiErrorWithStatus,
} from './conflictResolver'

// Sync engine
export { SyncEngine, type SyncEngineConfig, type MutationExecutor } from './syncEngine'
