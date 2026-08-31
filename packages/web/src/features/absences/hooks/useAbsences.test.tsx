import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, it, expect, beforeEach } from 'vitest'

import { useAuthStore } from '@/common/stores/auth'
import { server } from '@/test/msw/server'

import { useAbsences } from './useAbsences'

import type { ReactNode } from 'react'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

async function captureSearchBody(): Promise<URLSearchParams> {
  let capturedBody: URLSearchParams | null = null
  server.use(
    http.post('*/api%5crefereeabsence/search', async ({ request }) => {
      capturedBody = new URLSearchParams(await request.text())
      return HttpResponse.json({ items: [], totalItemsCount: 0 })
    })
  )

  const { result } = renderHook(() => useAbsences(), { wrapper: createWrapper() })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))

  return capturedBody!
}

describe('useAbsences', () => {
  beforeEach(() => {
    useAuthStore.setState({ dataSource: 'api', activeOccupationId: 'occupation-1' })
  })

  it('sends only offset and limit', async () => {
    const body = await captureSearchBody()

    expect(body.get('searchConfiguration[offset]')).toBe('0')
    expect(body.get('searchConfiguration[limit]')).toBe('100')
  })

  // The live endpoint returns 500 when propertyFilters or propertyOrderings
  // are sent (smoke test, 2026-08-31) - VolleyManager's own page sends
  // neither. Pin their absence so a regression cannot silently break the
  // page against the real API.
  it('sends neither propertyFilters nor propertyOrderings', async () => {
    const body = await captureSearchBody()

    for (const key of body.keys()) {
      expect(key).not.toContain('propertyFilters')
      expect(key).not.toContain('propertyOrderings')
    }
  })
})
