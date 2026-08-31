import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { useAuthStore } from '@/common/stores/auth'
import { server } from '@/test/msw/server'

import { useAbsences } from './useAbsences'

import type { ReactNode } from 'react'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DAYS_PER_YEAR = 365

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAbsences', () => {
  beforeEach(() => {
    useAuthStore.setState({ dataSource: 'api', activeOccupationId: 'occupation-1' })
  })

  // The window and ordering are load-bearing: without the fromDate range the
  // server's default ordering decides which entries survive the page limit.
  it('sends the bounded fromDate window and newest-first ordering', async () => {
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
    expect(body?.get('searchConfiguration[propertyFilters][0][propertyName]')).toBe('fromDate')

    const from = body?.get('searchConfiguration[propertyFilters][0][dateRange][from]')
    const to = body?.get('searchConfiguration[propertyFilters][0][dateRange][to]')
    expect(from).toBeTruthy()
    expect(to).toBeTruthy()
    // Roughly one year back and two years ahead
    expect(Date.now() - new Date(from!).getTime()).toBeGreaterThan(
      (DAYS_PER_YEAR - 10) * MS_PER_DAY
    )
    expect(new Date(to!).getTime() - Date.now()).toBeGreaterThan(
      (2 * DAYS_PER_YEAR - 10) * MS_PER_DAY
    )

    expect(body?.get('searchConfiguration[propertyOrderings][0][propertyName]')).toBe('fromDate')
    expect(body?.get('searchConfiguration[propertyOrderings][0][descending]')).toBe('true')
    expect(body?.get('searchConfiguration[limit]')).toBe('100')
    expect(body?.get('searchConfiguration[offset]')).toBe('0')
  })
})
