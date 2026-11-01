import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { isOjpConfigured } from '@/common/services/transport'
import { useAuthStore, type AuthState } from '@/common/stores/auth'
import { partialMock } from '@/test/partial-mock'

import { useTravelTimeAvailable, useTravelTimeSource } from './useTravelTimeSource'

vi.mock('@/common/services/transport', () => ({
  isOjpConfigured: vi.fn(() => false),
}))

vi.mock('@/common/stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

function mockDataSource(dataSource: AuthState['dataSource']) {
  vi.mocked(useAuthStore).mockImplementation((selector) =>
    selector(partialMock<AuthState>({ dataSource }))
  )
}

describe('useTravelTimeSource', () => {
  it('uses the mock in demo mode', () => {
    mockDataSource('demo')
    vi.mocked(isOjpConfigured).mockReturnValue(true)

    expect(renderHook(() => useTravelTimeSource()).result.current).toEqual({ useMock: true })
  })

  it('uses the mock when OJP is not configured', () => {
    mockDataSource('api')
    vi.mocked(isOjpConfigured).mockReturnValue(false)

    expect(renderHook(() => useTravelTimeSource()).result.current).toEqual({ useMock: true })
  })

  it('uses the real API outside demo mode when OJP is configured', () => {
    mockDataSource('api')
    vi.mocked(isOjpConfigured).mockReturnValue(true)

    expect(renderHook(() => useTravelTimeSource()).result.current).toEqual({ useMock: false })
  })
})

describe('useTravelTimeAvailable', () => {
  it('returns true in demo mode', () => {
    mockDataSource('demo')
    vi.mocked(isOjpConfigured).mockReturnValue(false)

    expect(renderHook(() => useTravelTimeAvailable()).result.current).toBe(true)
  })

  it('returns true in calendar mode', () => {
    mockDataSource('calendar')
    vi.mocked(isOjpConfigured).mockReturnValue(false)

    expect(renderHook(() => useTravelTimeAvailable()).result.current).toBe(true)
  })

  it('returns true when OJP is configured', () => {
    mockDataSource('api')
    vi.mocked(isOjpConfigured).mockReturnValue(true)

    expect(renderHook(() => useTravelTimeAvailable()).result.current).toBe(true)
  })

  it('returns false when not in demo mode and OJP not configured', () => {
    mockDataSource('api')
    vi.mocked(isOjpConfigured).mockReturnValue(false)

    expect(renderHook(() => useTravelTimeAvailable()).result.current).toBe(false)
  })
})
