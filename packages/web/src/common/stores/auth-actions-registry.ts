/**
 * Auth actions registry — decoupled from the auth store to avoid
 * loading store dependencies (like @/api/session) during test setup.
 *
 * The auth store imports from this module to get registered actions.
 * Test setup files can import registerAuthActions without triggering
 * the full store module dependency tree.
 */

import type { AttributeValue } from '@/common/types/active-party'

import type { AuthState, Occupation } from './auth'

/** Reads the current auth store state */
type GetAuthState = () => AuthState

/** Applies a partial update to the auth store state */
type SetAuthState = (state: Partial<AuthState>) => void

/**
 * Auth actions interface — defines the contract for platform-specific
 * authentication operations. Only types are imported from the auth store,
 * so there is no runtime circular dependency.
 */
export interface AuthActions {
  performLogin: (
    username: string,
    password: string,
    get: GetAuthState,
    set: SetAuthState
  ) => Promise<boolean>
  performLogout: () => Promise<void>
  performSessionCheck: (
    get: GetAuthState,
    set: SetAuthState,
    signal?: AbortSignal
  ) => Promise<boolean>
  performCalendarLogin: (code: string, set: SetAuthState) => Promise<void>
  filterRefereeOccupations: (occupations: Occupation[]) => Occupation[]
  hasMultipleAssociations: (attributeValues: AttributeValue[] | null | undefined) => boolean
  sessionCheckGracePeriodMs: number
}

let registeredAuthActions: AuthActions | null = null

/**
 * Register auth action implementations.
 */
export function registerAuthActions(actions: AuthActions): () => void {
  registeredAuthActions = actions
  return () => {
    registeredAuthActions = null
  }
}

/**
 * Get registered auth actions. Throws if not registered.
 */
export function getAuthActions(): AuthActions {
  if (!registeredAuthActions) {
    throw new Error(
      'Auth actions not registered. Call registerAuthActions() during app initialization.'
    )
  }
  return registeredAuthActions
}
