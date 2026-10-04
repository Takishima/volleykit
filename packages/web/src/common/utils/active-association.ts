/**
 * Re-asserts the locally selected association on the server session.
 *
 * VolleyManager scopes every list endpoint (assignments, compensations,
 * exchanges) to the active attribute stored in the server session. Some write
 * endpoints, notably the compensation PUT, reset that attribute. When a list is
 * refetched afterwards it silently returns another association's data while
 * the local store still shows the association the user picked.
 *
 * Calling this after such a write, before invalidating queries, puts the server
 * session back in line with the local selection so the refetch is correct.
 */

import type { ApiClient } from '@/api/client'
import type { DataSource } from '@/common/stores/auth'
import { createLogger } from '@/common/utils/logger'

const log = createLogger('activeAssociation')

type AssociationSwitcher = Pick<ApiClient, 'switchRoleAndAttribute'>

/**
 * Pushes `activeOccupationId` to the server session.
 *
 * Only runs in API mode: the demo client regenerates its data on every switch
 * and calendar mode has no server session. Failures are logged, never thrown,
 * because the write that preceded this call has already succeeded.
 */
export async function reassertActiveAssociation(
  apiClient: AssociationSwitcher,
  dataSource: DataSource,
  activeOccupationId: string | null
): Promise<void> {
  if (dataSource !== 'api' || !activeOccupationId) {
    return
  }

  try {
    await apiClient.switchRoleAndAttribute(activeOccupationId)
  } catch (error) {
    log.warn('Failed to re-assert active association on the server:', error)
  }
}
