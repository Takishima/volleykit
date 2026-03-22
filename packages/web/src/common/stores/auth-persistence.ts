/**
 * Auth store persistence configuration.
 *
 * Controls which parts of the auth state are persisted to localStorage,
 * how migrations between versions work, and how persisted state is merged
 * with the current store state on rehydration.
 */

import { setCsrfToken } from '@/api/session'
import type { AttributeValue } from '@/common/types/active-party'

import type { AuthState, DataSource, UserProfile } from './auth'

/**
 * Storage version for the auth store.
 * Increment this to invalidate all cached auth state and force re-login.
 *
 * Version history:
 * - 1: Initial version (pre-groupedEligibleAttributeValues)
 * - 2: Added groupedEligibleAttributeValues for multi-association detection
 */
export const AUTH_STORE_VERSION = 2

export const AUTH_STORE_NAME = 'volleykit-auth'

export function partializeAuthState(state: AuthState) {
  return {
    // Persist minimal user data for UX (immediate name display).
    // Session cookies are HttpOnly and managed by browser.
    // CSRF token is persisted to enable POST requests after page reload.
    // groupedEligibleAttributeValues persisted for hasMultipleAssociations() on refresh.
    user: state.user,
    csrfToken: state.csrfToken,
    _wasAuthenticated: state.status === 'authenticated',
    dataSource: state.dataSource,
    calendarCode: state.calendarCode,
    activeOccupationId: state.activeOccupationId,
    eligibleAttributeValues: state.eligibleAttributeValues,
    groupedEligibleAttributeValues: state.groupedEligibleAttributeValues,
  }
}

// Clean break: invalidate old cached state when version changes
// Users will need to re-login to get fresh association data
export function migrateAuthState(persistedState: unknown, version: number): unknown {
  if (version < AUTH_STORE_VERSION) {
    // Return undefined to use defaults (forces re-login)
    return undefined
  }
  return persistedState
}

export function mergeAuthState(persisted: unknown, current: AuthState): AuthState {
  const persistedState = persisted as
    | {
        user?: UserProfile | null
        csrfToken?: string | null
        _wasAuthenticated?: boolean
        dataSource?: DataSource
        calendarCode?: string | null
        isDemoMode?: boolean
        activeOccupationId?: string | null
        eligibleAttributeValues?: AttributeValue[] | null
        groupedEligibleAttributeValues?: AttributeValue[] | null
      }
    | undefined

  const restoredCsrfToken = persistedState?.csrfToken ?? null
  if (restoredCsrfToken) {
    setCsrfToken(restoredCsrfToken)
  }

  // Derive dataSource from isDemoMode for backwards compatibility with old persisted state
  const dataSource: DataSource =
    persistedState?.dataSource ?? (persistedState?.isDemoMode ? 'demo' : 'api')

  return {
    ...current,
    user: persistedState?.user ?? null,
    csrfToken: restoredCsrfToken,
    status: persistedState?._wasAuthenticated ? 'authenticated' : 'idle',
    dataSource,
    calendarCode: persistedState?.calendarCode ?? null,
    activeOccupationId: persistedState?.activeOccupationId ?? null,
    eligibleAttributeValues: persistedState?.eligibleAttributeValues ?? null,
    groupedEligibleAttributeValues: persistedState?.groupedEligibleAttributeValues ?? null,
    _checkSessionPromise: null,
  }
}
