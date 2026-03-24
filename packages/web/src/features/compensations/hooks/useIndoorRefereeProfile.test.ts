import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { server, http, HttpResponse } from '@/test/msw'
import { useAuthStore } from '@/common/stores/auth'

vi.mock('@/common/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

import { useIndoorRefereeProfile } from './useIndoorRefereeProfile'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useIndoorRefereeProfile', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        user: { id: 'user-1', firstName: 'Jean', lastName: 'Dupont', email: '', occupations: [] },
        dataSource: 'api',
      } as never)
    )
    server.use(
      http.get('*/showWithNestedObjects', () =>
        HttpResponse.json({ person: { firstName: 'Jean', lastName: 'Dupont' } })
      )
    )
  })

  it('returns demo data when in demo mode', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) =>
      selector({
        user: { id: 'user-1', firstName: 'Demo', lastName: 'User', email: '', occupations: [] },
        dataSource: 'demo',
      } as never)
    )

    const { result } = renderHook(() => useIndoorRefereeProfile(), {
      wrapper: createWrapper(),
    })

    expect(result.current.showTwintAction).toBe(true)
    expect(result.current.mobilePhone).toBe('+41 79 000 00 00')
    expect(result.current.firstName).toBe('Demo')
    expect(result.current.lastName).toBe('User')
  })

  it('returns showTwintAction=true when API flag is true', async () => {
    server.use(
      http.get('*/getIndoorRefereeByActivePerson', () =>
        HttpResponse.json({
          mobilePhoneNumbers: '+41 79 123 45 67',
          showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses: true,
        })
      )
    )

    const { result } = renderHook(() => useIndoorRefereeProfile(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.showTwintAction).toBe(true)
    })
    expect(result.current.mobilePhone).toBe('+41 79 123 45 67')
  })

  it('returns showTwintAction=false when API flag is false', async () => {
    server.use(
      http.get('*/getIndoorRefereeByActivePerson', () =>
        HttpResponse.json({
          mobilePhoneNumbers: '+41 79 123 45 67',
          showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses: false,
        })
      )
    )

    const { result } = renderHook(() => useIndoorRefereeProfile(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.showTwintAction).toBe(false)
    })
  })

  it('returns firstName and lastName from person API', async () => {
    server.use(
      http.get('*/getIndoorRefereeByActivePerson', () =>
        HttpResponse.json({
          mobilePhoneNumbers: '+41 79 123 45 67',
          showPhoneNumberForTwintPaymentOnRefereeStatementOfExpenses: true,
        })
      ),
      http.get('*/showWithNestedObjects', () =>
        HttpResponse.json({ person: { firstName: 'Marie', lastName: 'Müller' } })
      )
    )

    const { result } = renderHook(() => useIndoorRefereeProfile(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.firstName).toBe('Marie')
      expect(result.current.lastName).toBe('Müller')
    })
  })

  it('returns defaults when API call fails', async () => {
    server.use(
      http.get('*/getIndoorRefereeByActivePerson', () => new HttpResponse(null, { status: 500 })),
      http.get('*/showWithNestedObjects', () => new HttpResponse(null, { status: 500 }))
    )

    const { result } = renderHook(() => useIndoorRefereeProfile(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      // After failed fetch, data is undefined → defaults apply
      expect(result.current.showTwintAction).toBe(false)
      expect(result.current.mobilePhone).toBeNull()
      expect(result.current.firstName).toBe('')
      expect(result.current.lastName).toBe('')
    })
  })
})
