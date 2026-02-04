/**
 * Offline action types for the mutation queue.
 *
 * Re-exports from @volleykit/shared with mobile-specific subset.
 */

// Re-export common types and constants from shared
export type {
  CompensationUpdateData,
  ActionStatus,
  UpdateCompensationAction,
  ApplyForExchangeAction,
  AddToExchangeAction,
  RemoveOwnExchangeAction,
} from '@volleykit/shared/offline'

export { MAX_RETRY_COUNT, RETRY_DELAY_BASE_MS } from '@volleykit/shared/offline'

// Import action types for the union
import type {
  UpdateCompensationAction,
  ApplyForExchangeAction,
  AddToExchangeAction,
  RemoveOwnExchangeAction,
} from '@volleykit/shared/offline'

/**
 * Union type of offline actions supported by mobile.
 * Mobile doesn't currently support batch updates or assignment-based compensation updates.
 */
export type OfflineAction =
  | UpdateCompensationAction
  | ApplyForExchangeAction
  | AddToExchangeAction
  | RemoveOwnExchangeAction

/**
 * Action type discriminator values for mobile.
 */
export type ActionType = OfflineAction['type']

/**
 * Extract payload type for a given action type.
 */
export type ActionPayload<T extends ActionType> = Extract<OfflineAction, { type: T }>['payload']
