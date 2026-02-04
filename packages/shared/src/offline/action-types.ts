/**
 * Offline action types for the mutation queue.
 *
 * Shared between web and mobile apps.
 *
 * All API mutations are modeled as discrete actions that can be:
 * - Executed immediately when online
 * - Queued in storage (IndexedDB for web, AsyncStorage for mobile) when offline
 * - Replayed when connectivity is restored
 */

/**
 * Compensation update data matching the API format.
 */
export interface CompensationUpdateData {
  /** Distance in metres (API field name) */
  distanceInMetres?: number
  /** Reason for correction (API field name) */
  correctionReason?: string
}

/**
 * Action status in the queue.
 */
export type ActionStatus = 'pending' | 'syncing' | 'failed'

/**
 * Base action interface with common fields.
 */
interface BaseAction {
  /** Unique identifier for this action */
  id: string
  /** When the action was created */
  createdAt: number
  /** Current status */
  status: ActionStatus
  /** Number of sync retry attempts */
  retryCount: number
  /** Last error message if failed */
  error?: string
}

/**
 * Update compensation action.
 * Used when editing travel expenses directly from compensations tab.
 */
export interface UpdateCompensationAction extends BaseAction {
  type: 'updateCompensation'
  payload: {
    compensationId: string
    data: CompensationUpdateData
  }
}

/**
 * Update compensation via assignment action.
 * Used when editing travel expenses from assignments tab.
 * Requires lookup of compensation ID from assignment.
 */
export interface UpdateAssignmentCompensationAction extends BaseAction {
  type: 'updateAssignmentCompensation'
  payload: {
    assignmentId: string
    /** Game number for conflict detection */
    gameNumber?: number
    data: CompensationUpdateData
  }
}

/**
 * Batch update compensations action.
 * Used for updating all compensations at the same hall.
 */
export interface BatchUpdateCompensationsAction extends BaseAction {
  type: 'batchUpdateCompensations'
  payload: {
    compensationIds: string[]
    data: CompensationUpdateData
  }
}

/**
 * Apply for exchange action.
 */
export interface ApplyForExchangeAction extends BaseAction {
  type: 'applyForExchange'
  payload: {
    exchangeId: string
    /** Game number for conflict detection */
    gameNumber?: number
  }
}

/**
 * Add assignment to exchange marketplace action.
 */
export interface AddToExchangeAction extends BaseAction {
  type: 'addToExchange'
  payload: {
    convocationId: string
    /** Game number for display/conflict detection */
    gameNumber?: number
  }
}

/**
 * Remove own assignment from exchange marketplace action.
 * Uses convocation ID to identify the exchange to remove.
 */
export interface RemoveOwnExchangeAction extends BaseAction {
  type: 'removeOwnExchange'
  payload: {
    convocationId: string
    /** Game number for display/conflict detection */
    gameNumber?: number
  }
}

/**
 * Union type of all possible offline actions.
 */
export type OfflineAction =
  | UpdateCompensationAction
  | UpdateAssignmentCompensationAction
  | BatchUpdateCompensationsAction
  | ApplyForExchangeAction
  | AddToExchangeAction
  | RemoveOwnExchangeAction

/**
 * Action type discriminator values.
 */
export type ActionType = OfflineAction['type']

/**
 * Extract payload type for a given action type.
 */
export type ActionPayload<T extends ActionType> = Extract<OfflineAction, { type: T }>['payload']

/**
 * Maximum retry attempts before marking action as permanently failed.
 */
export const MAX_RETRY_COUNT = 3

/**
 * Delay between retry attempts (exponential backoff base in ms).
 */
export const RETRY_DELAY_BASE_MS = 2000
