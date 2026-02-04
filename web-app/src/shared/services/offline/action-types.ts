/**
 * Offline action types for the mutation queue.
 *
 * Re-exports from @volleykit/shared for consistency.
 */

export type {
  CompensationUpdateData,
  ActionStatus,
  UpdateCompensationAction,
  UpdateAssignmentCompensationAction,
  BatchUpdateCompensationsAction,
  ApplyForExchangeAction,
  AddToExchangeAction,
  RemoveOwnExchangeAction,
  OfflineAction,
  ActionType,
  ActionPayload,
} from '@volleykit/shared/offline'

export { MAX_RETRY_COUNT, RETRY_DELAY_BASE_MS } from '@volleykit/shared/offline'
