/**
 * Offline action types for the mutation queue.
 *
 * All API mutations are modeled as discrete actions that can be:
 * - Executed immediately when online
 * - Queued in IndexedDB when offline
 * - Replayed when connectivity is restored
 */

import type { CompensationUpdateData } from '@/features/compensations/hooks/useCompensations'

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
 * Withdraw from exchange action.
 */
export interface WithdrawFromExchangeAction extends BaseAction {
  type: 'withdrawFromExchange'
  payload: {
    exchangeId: string
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
 * Union type of all possible offline actions.
 */
export type OfflineAction =
  | UpdateCompensationAction
  | UpdateAssignmentCompensationAction
  | BatchUpdateCompensationsAction
  | ApplyForExchangeAction
  | WithdrawFromExchangeAction
  | AddToExchangeAction

/**
 * Action type discriminator values.
 */
export type ActionType = OfflineAction['type']

/**
 * Extract payload type for a given action type.
 */
export type ActionPayload<T extends ActionType> = Extract<OfflineAction, { type: T }>['payload']

/**
 * Human-readable labels for action types (for UI display).
 * Keys correspond to i18n translation keys.
 */
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  updateCompensation: 'offline.actions.updateCompensation',
  updateAssignmentCompensation: 'offline.actions.updateCompensation',
  batchUpdateCompensations: 'offline.actions.batchUpdateCompensations',
  applyForExchange: 'offline.actions.applyForExchange',
  withdrawFromExchange: 'offline.actions.withdrawFromExchange',
  addToExchange: 'offline.actions.addToExchange',
}

/**
 * Maximum retry attempts before marking action as permanently failed.
 */
export const MAX_RETRY_COUNT = 3

/**
 * Delay between retry attempts (exponential backoff base in ms).
 */
export const RETRY_DELAY_BASE_MS = 2000
