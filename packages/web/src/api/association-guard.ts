/**
 * Association guard for the real API client.
 *
 * VolleyManager scopes its list and detail endpoints to the attribute (the
 * referee occupation, i.e. the association) that is active in the server
 * session, not to anything the client sends. Some write endpoints reset that
 * attribute as a side effect. Without protection a refetch after such a write
 * silently returns another association's data while the local store still
 * shows the association the user selected.
 *
 * The guard makes that drift structurally impossible from the client side by
 * wrapping every method of the real API client:
 *
 * - `read`   methods first make sure the server session is confirmed to be on
 *            the selected occupation, switching it when it is not.
 * - `write`  methods do the same before the request and mark the server
 *            association as unknown afterwards, so the next read re-confirms it.
 * - `switch` is the role switch itself; a successful call confirms the id.
 *
 * Every method of the raw client must be classified in {@link API_METHOD_SCOPES}.
 * The record is typed over the raw client's keys, so adding a method without
 * classifying it fails to compile.
 */

import type { api as rawApi } from './real-api'

type RawApi = typeof rawApi
type MethodName = keyof RawApi

/** How a method relates to the server session's active association */
export type MethodScope = 'read' | 'write' | 'switch'

/** Classification of every real API method; exhaustive by construction */
export const API_METHOD_SCOPES: Record<MethodName, MethodScope> = {
  searchAssignments: 'read',
  getAssignmentDetails: 'read',
  searchCompensations: 'read',
  getCompensationDetails: 'read',
  updateCompensation: 'write',
  searchExchanges: 'read',
  applyForExchange: 'write',
  addToExchange: 'write',
  removeOwnExchange: 'write',
  getAssociationSettings: 'read',
  getActiveSeason: 'read',
  getPossiblePlayerNominations: 'read',
  searchPersons: 'read',
  getGameWithScoresheet: 'read',
  updateNominationList: 'write',
  finalizeNominationList: 'write',
  updateScoresheet: 'write',
  validateScoresheet: 'write',
  finalizeScoresheet: 'write',
  uploadResource: 'write',
  switchRoleAndAttribute: 'switch',
  searchRefereeBackups: 'read',
}

/** Occupation id the server session is confirmed to have active; null = unknown */
let confirmedOccupationId: string | null = null

/** In-flight switch shared by concurrent callers so parallel reads switch once */
let pendingSwitch: Promise<void> | null = null

/**
 * Returns the occupation id the server session is confirmed to be on, or null
 * when it is unknown (after a write, a session reset, or at startup).
 */
export function getConfirmedServerAssociation(): string | null {
  return confirmedOccupationId
}

/**
 * Records what the server session currently has active, e.g. from the
 * dashboard's `activeAttributeValue` during a session check. Pass null when
 * the server state is unknown; the next read then re-asserts the selection.
 */
export function noteServerAssociation(occupationId: string | null): void {
  confirmedOccupationId = occupationId
}

/** Marks the server association as unknown; the next read re-asserts it. */
export function invalidateServerAssociation(): void {
  confirmedOccupationId = null
}

type Switcher = (occupationId: string) => Promise<void>

async function performSwitch(switcher: Switcher, occupationId: string): Promise<void> {
  await switcher(occupationId)
  confirmedOccupationId = occupationId
}

/**
 * Makes sure the server session is on the locally selected occupation before a
 * scoped request runs. Concurrent callers share one switch request, and the
 * selection is re-read after each switch so a change made while a switch was
 * in flight is followed. A failed switch propagates so the caller fails
 * instead of reading the wrong association.
 */
async function ensureServerAssociation(
  switcher: Switcher,
  getExpectedOccupationId: () => string | null
): Promise<void> {
  for (;;) {
    const expectedOccupationId = getExpectedOccupationId()
    if (!expectedOccupationId || confirmedOccupationId === expectedOccupationId) {
      // Nothing selected locally (not logged in yet), or already confirmed.
      return
    }

    if (!pendingSwitch) {
      pendingSwitch = performSwitch(switcher, expectedOccupationId).finally(() => {
        pendingSwitch = null
      })
    }
    await pendingSwitch
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic method forwarding
type AnyAsyncMethod = (...args: any[]) => Promise<any>

/**
 * Wraps the raw API client so every call honours the association invariant.
 *
 * @param client - The raw real API client
 * @param getExpectedOccupationId - Returns the locally selected occupation id
 */
export function withAssociationGuard(
  client: RawApi,
  getExpectedOccupationId: () => string | null
): RawApi {
  const switcher: Switcher = (occupationId) => client.switchRoleAndAttribute(occupationId)

  const guarded: Partial<Record<MethodName, AnyAsyncMethod>> = {}

  for (const name of Object.keys(API_METHOD_SCOPES) as MethodName[]) {
    const method = client[name] as AnyAsyncMethod
    const scope = API_METHOD_SCOPES[name]

    guarded[name] = async (...args: unknown[]) => {
      switch (scope) {
        case 'switch': {
          const [occupationId] = args as [string]
          await performSwitch(switcher, occupationId)
          return
        }
        case 'read': {
          await ensureServerAssociation(switcher, getExpectedOccupationId)
          return method.apply(client, args)
        }
        case 'write': {
          await ensureServerAssociation(switcher, getExpectedOccupationId)
          try {
            return await method.apply(client, args)
          } finally {
            // The server may have reset the active attribute, whether or not
            // the write succeeded. Force a re-check before the next read.
            invalidateServerAssociation()
          }
        }
        default: {
          const _exhaustive: never = scope
          throw new Error(`Unknown method scope: ${String(_exhaustive)}`)
        }
      }
    }
  }

  return guarded as RawApi
}
