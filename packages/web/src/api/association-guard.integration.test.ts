/**
 * Association guard through the real client, store and network layer.
 *
 * Reproduces the reported bug: saving a compensation distance reset the
 * server-side association, so the following assignments refetch returned
 * another association's games. The guard must put a role switch between the
 * write and the next read.
 */
import { describe, it, expect, beforeEach } from 'vitest'

import { server, http, HttpResponse } from '@/test/msw/server'
import { useAuthStore } from '@/common/stores/auth'

import { invalidateServerAssociation, noteServerAssociation } from './association-guard'
import { api, clearSession, setCsrfToken } from './client'

const OCCUPATION = 'b1111111-1111-4111-a111-111111111111'
const COMPENSATION = 'c1111111-1111-4111-a111-111111111111'

function recordRequests() {
  const requests: string[] = []
  server.use(
    http.put('*/api%5cparty/switchRoleAndAttribute', async ({ request }) => {
      const body = new URLSearchParams(await request.text())
      requests.push(`switch:${body.get('attributeValueAsArray[0]')}`)
      return HttpResponse.json({})
    }),
    http.put('*/api%5cconvocationcompensation', () => {
      requests.push('updateCompensation')
      return HttpResponse.json({})
    }),
    http.post('*/api%5crefereeconvocation/searchMyRefereeConvocations', () => {
      requests.push('searchAssignments')
      return HttpResponse.json({ items: [], totalItemsCount: 0 })
    })
  )
  return requests
}

describe('association guard (integration)', () => {
  beforeEach(() => {
    clearSession()
    setCsrfToken('csrf')
    useAuthStore.setState({ dataSource: 'api', activeOccupationId: OCCUPATION })
    invalidateServerAssociation()
  })

  it('switches the server back to the selected association between a save and the refetch', async () => {
    const requests = recordRequests()
    noteServerAssociation(OCCUPATION)

    await api.updateCompensation(COMPENSATION, { distanceInMetres: 5000 })
    await api.searchAssignments({})

    expect(requests).toEqual(['updateCompensation', `switch:${OCCUPATION}`, 'searchAssignments'])
  })

  it('switches once before the first read after a reload with unknown server state', async () => {
    const requests = recordRequests()

    await api.searchAssignments({})
    await api.searchAssignments({})

    expect(requests).toEqual([`switch:${OCCUPATION}`, 'searchAssignments', 'searchAssignments'])
  })

  it('does not switch when the session check saw the server on the selected association', async () => {
    const requests = recordRequests()
    noteServerAssociation(OCCUPATION)

    await api.searchAssignments({})

    expect(requests).toEqual(['searchAssignments'])
  })

  it('does not touch the association while nobody is logged in', async () => {
    const requests = recordRequests()
    useAuthStore.setState({ activeOccupationId: null })

    await api.searchAssignments({})

    expect(requests).toEqual(['searchAssignments'])
  })

  it('forgets the server association when the session is cleared', async () => {
    const requests = recordRequests()
    noteServerAssociation(OCCUPATION)

    clearSession()
    await api.searchAssignments({})

    expect(requests).toEqual([`switch:${OCCUPATION}`, 'searchAssignments'])
  })
})
