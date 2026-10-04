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
 * - `read`   methods wait for in-flight writes, then make sure the server
 *            session is confirmed to be on the selected occupation, switching
 *            it when it is not.
 * - `write`  methods do the same before the request and mark the server
 *            association as unknown afterwards, so the next read re-confirms it.
 * - `switch` is the role switch itself, serialized behind any switch in
 *            flight; a successful call confirms the id.
 *
 * The invariant holds for every request issued through the guarded client,
 * which the lint rule on `@/api/real-api` makes the only client in use.
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

/**
 * In-flight switch. Reads share it so parallel reads switch once; an explicit
 * switch queues behind it so the last request issued is also the last one the
 * server applies, and the one that gets confirmed.
 */
let pendingSwitch: Promise<void> | null = null

/**
 * Writes in flight. A write may reset the server's active attribute at any
 * point before its response arrives, so a read must not trust a confirmation
 * while one is pending; it waits for them to settle and re-checks.
 */
const inFlightWrites = new Set<Promise<unknown>>()

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

/** Installs a switch as the shared in-flight one; callers await the returned promise. */
function startSwitch(switcher: Switcher, occupationId: string): Promise<void> {
  const current = performSwitch(switcher, occupationId).finally(() => {
    if (pendingSwitch === current) {
      pendingSwitch = null
    }
  })
  pendingSwitch = current
  return current
}

/**
 * Runs an explicit switch after any switch already in flight has settled, so
 * two switches never race on the server session. A failure of the earlier
 * switch is its own caller's problem; this one still runs.
 */
async function queueSwitch(switcher: Switcher, occupationId: string): Promise<void> {
  while (pendingSwitch) {
    await pendingSwitch.catch(() => undefined)
  }
  await startSwitch(switcher, occupationId)
}

async function settleInFlightWrites(): Promise<void> {
  while (inFlightWrites.size > 0) {
    await Promise.allSettled([...inFlightWrites])
  }
}

/**
 * Makes sure the server session is on the locally selected occupation before a
 * scoped request runs. It first lets in-flight writes settle (they void the
 * confirmation when done), then confirms or switches. Concurrent callers share
 * one switch request, and the selection is re-read after each switch so a
 * change made while a switch was in flight is followed. A failed switch
 * propagates so the caller fails instead of reading the wrong association.
 */
async function ensureServerAssociation(
  switcher: Switcher,
  getExpectedOccupationId: () => string | null
): Promise<void> {
  for (;;) {
    await settleInFlightWrites()

    const expectedOccupationId = getExpectedOccupationId()
    if (!expectedOccupationId || confirmedOccupationId === expectedOccupationId) {
      // Nothing selected locally (not logged in yet), or already confirmed.
      return
    }

    await (pendingSwitch ?? startSwitch(switcher, expectedOccupationId))
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
          await queueSwitch(switcher, occupationId)
          return
        }
        case 'read': {
          await ensureServerAssociation(switcher, getExpectedOccupationId)
          return method.apply(client, args)
        }
        case 'write': {
          await ensureServerAssociation(switcher, getExpectedOccupationId)
          const request: Promise<unknown> = method.apply(client, args)
          inFlightWrites.add(request)
          try {
            return await request
          } finally {
            inFlightWrites.delete(request)
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
