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

describe('useAbsences', () => {
  beforeEach(() => {
    useAuthStore.setState({ dataSource: 'api', activeOccupationId: 'occupation-1' })
  })

  // The live endpoint returns the complete list ONLY for a bodyless request:
  // propertyFilters/propertyOrderings cause a 500, and offset/limit activate
  // a server-side page clamped to 10 rows (smoke tests, 2026-08-31). Pin the
  // absence of every searchConfiguration key so a regression cannot silently
  // truncate or break the page against the real API.
  it('sends no searchConfiguration at all', async () => {
    let capturedBody: URLSearchParams | null = null
    server.use(
      http.post('*/api%5crefereeabsence/search', async ({ request }) => {
        capturedBody = new URLSearchParams(await request.text())
        return HttpResponse.json({ items: [], totalItemsCount: 0 })
      })
    )

    const { result } = renderHook(() => useAbsences(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const body: URLSearchParams | null = capturedBody
    for (const key of body?.keys() ?? []) {
      expect(key).not.toContain('searchConfiguration')
    }
  })

  it('returns the whole list with truncation and totals derived from it', async () => {
    const all = [createAbsence(0), createAbsence(1), createAbsence(2)]
    server.use(
      http.post('*/api%5crefereeabsence/search', () =>
        HttpResponse.json({ items: all, totalItemsCount: all.length })
      )
    )

    const { result } = renderHook(() => useAbsences(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.absences).toHaveLength(3)
    expect(result.current.data?.totalItemsCount).toBe(3)
    expect(result.current.data?.hasMore).toBe(false)
  })

  it('flags hasMore when the server reports more rows than it returned', async () => {
    server.use(
      http.post('*/api%5crefereeabsence/search', () =>
        HttpResponse.json({ items: [createAbsence(0)], totalItemsCount: 5 })
      )
    )

    const { result } = renderHook(() => useAbsences(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.hasMore).toBe(true)
  })
})
