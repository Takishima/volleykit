/**
 * Auth actions registry — decoupled from the auth store to avoid
 * loading store dependencies (like @/api/session) during test setup.
 *
 * The auth store imports from this module to get registered actions.
 * Test setup files can import registerAuthActions without triggering
 * the full store module dependency tree.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Loose typing to avoid circular deps with auth store */

/**
 * Auth actions interface — defines the contract for platform-specific
 * authentication operations. Uses loose typing to avoid circular dependency
 * with the auth store module.
 */
export interface AuthActions {
  performLogin: (
    username: string,
    password: string,
    get: () => any,
    set: (state: any) => void
  ) => Promise<boolean>
  performLogout: () => Promise<void>
  performSessionCheck: (
    get: () => any,
    set: (state: any) => void,
    signal?: AbortSignal
  ) => Promise<boolean>
  performCalendarLogin: (code: string, set: (state: any) => void) => Promise<void>
  filterRefereeOccupations: (occupations: any[]) => any[]
  hasMultipleAssociations: (attributeValues: any[] | null | undefined) => boolean
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
