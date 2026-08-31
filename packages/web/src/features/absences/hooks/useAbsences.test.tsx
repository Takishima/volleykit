import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { useAuthStore } from '@/common/stores/auth'
import { server } from '@/test/msw/server'

import { useAbsences } from './useAbsences'

import type { RefereeAbsence } from '@/api/client'
import type { ReactNode } from 'react'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

function createAbsence(index: number): RefereeAbsence {
  const day = String(index + 1).padStart(2, '0')
  return {
    __identity: `${String(index + 1)
      .repeat(8)
      .slice(0, 8)}-0000-4000-8000-000000000000`,
    fromDate: `2027-01-${day}T05:00:00.000000+00:00`,
    toDate: `2027-01-${day}T22:59:59.000000+00:00`,
    detailedReason: `Absence ${index}`,
  }
}

async function renderUntilSuccess() {
  const { result } = renderHook(() => useAbsences(), { wrapper: createWrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  return result
}

describe('useAbsences', () => {
  beforeEach(() => {
    useAuthStore.setState({ dataSource: 'api', activeOccupationId: 'occupation-1' })
  })

  // The live endpoint returns 500 when propertyFilters or propertyOrderings
  // are sent (smoke test, 2026-08-31) - VolleyManager's own page sends
  // neither. Pin their absence so a regression cannot silently break the
  // page against the real API.
  it('sends only offset and limit, no filters or orderings', async () => {
    let capturedBody: URLSearchParams | null = null
    server.use(
      http.post('*/api%5crefereeabsence/search', async ({ request }) => {
        capturedBody = new URLSearchParams(await request.text())
        return HttpResponse.json({ items: [], totalItemsCount: 0 })
      })
    )

    await renderUntilSuccess()

    const body: URLSearchParams | null = capturedBody
    expect(body?.get('searchConfiguration[offset]')).toBe('0')
    expect(body?.get('searchConfiguration[limit]')).toBe('100')
    for (const key of body?.keys() ?? []) {
      expect(key).not.toContain('propertyFilters')
      expect(key).not.toContain('propertyOrderings')
    }
  })

  // The server caps the requested limit at its own default (observed: 10 rows
  // back for limit=100), so the fetch must page by rows actually consumed.
  it('pages through a server that caps the limit, advancing by consumed rows', async () => {
    const all = [createAbsence(0), createAbsence(1), createAbsence(2)]
    const PAGE_CAP = 2
    const offsets: string[] = []

    server.use(
      http.post('*/api%5crefereeabsence/search', async ({ request }) => {
        const body = new URLSearchParams(await request.text())
        const offset = Number(body.get('searchConfiguration[offset]') ?? '0')
        offsets.push(String(offset))
        return HttpResponse.json({
          items: all.slice(offset, offset + PAGE_CAP),
          totalItemsCount: all.length,
        })
      })
    )

    const result = await renderUntilSuccess()

    expect(offsets).toEqual(['0', '2'])
    expect(result.current.data?.absences).toHaveLength(3)
    expect(result.current.data?.totalItemsCount).toBe(3)
    expect(result.current.data?.hasMore).toBe(false)
  })
})
