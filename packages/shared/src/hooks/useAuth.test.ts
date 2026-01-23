/**
 * Tests for useAuth hook
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from './useAuth'
import { useAuthStore } from '../stores/auth'

describe('useAuth', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.getState().reset()
  })

  afterEach(() => {
    useAuthStore.getState().reset()
  })

  it('should return initial state', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.status).toBe('idle')
    expect(result.current.user).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should return isLoading true when status is loading', () => {
    // Set loading state
    act(() => {
      useAuthStore.getState().setStatus('loading')
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should return isAuthenticated true when status is authenticated', () => {
    // Set authenticated state
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [],
      })
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.user?.firstName).toBe('John')
  })

  it('should return error when present', () => {
    // Set error state
    act(() => {
      useAuthStore.getState().setError({
        message: 'Invalid credentials',
        code: 'invalid_credentials',
      })
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.error?.message).toBe('Invalid credentials')
    expect(result.current.error?.code).toBe('invalid_credentials')
    expect(result.current.status).toBe('error')
  })

  it('should provide logout function', () => {
    // First set authenticated state
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        occupations: [],
      })
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)

    // Call logout
    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.status).toBe('idle')
  })

  it('should update when store changes', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(false)

    // Update store
    act(() => {
      useAuthStore.getState().setUser({
        id: 'user-456',
        firstName: 'Jane',
        lastName: 'Smith',
        occupations: [{ id: 'occ-1', type: 'referee' }],
      })
    })

    // Hook should reflect new state
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.firstName).toBe('Jane')
  })
})
