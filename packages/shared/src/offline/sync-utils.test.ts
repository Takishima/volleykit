/**
 * Tests for platform-agnostic offline sync utilities.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'

import { MAX_RETRY_COUNT, RETRY_DELAY_BASE_MS } from './action-types'
import type { OfflineAction } from './types'

import {
  isSessionExpiredError,
  isConflictError,
  getRetryDelay,
  sleep,
  generateActionId,
  shouldRetryAction,
  emptySyncResult,
  sortActionsByCreatedAt,
} from './sync-utils'

// Helper to create a minimal OfflineAction for testing
function createAction(overrides: Partial<OfflineAction> = {}): OfflineAction {
  return {
    id: 'action_123_abc',
    type: 'updateCompensation',
    payload: { compensationId: 'comp-1', data: {} },
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
    ...overrides,
  } as OfflineAction
}

describe('isSessionExpiredError', () => {
  it('returns false for non-Error values', () => {
    expect(isSessionExpiredError(null)).toBe(false)
    expect(isSessionExpiredError(undefined)).toBe(false)
    expect(isSessionExpiredError('unauthorized')).toBe(false)
    expect(isSessionExpiredError(401)).toBe(false)
  })

  it('detects "unauthorized" keyword', () => {
    expect(isSessionExpiredError(new Error('Unauthorized access'))).toBe(true)
  })

  it('detects "401" status code in message', () => {
    expect(isSessionExpiredError(new Error('Request failed with status 401'))).toBe(true)
  })

  it('detects "session" keyword', () => {
    expect(isSessionExpiredError(new Error('Session has expired'))).toBe(true)
  })

  it('detects "login" keyword', () => {
    expect(isSessionExpiredError(new Error('Please login again'))).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isSessionExpiredError(new Error('UNAUTHORIZED'))).toBe(true)
    expect(isSessionExpiredError(new Error('Session Expired'))).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isSessionExpiredError(new Error('Network timeout'))).toBe(false)
    expect(isSessionExpiredError(new Error('Internal server error'))).toBe(false)
  })
})

describe('isConflictError', () => {
  it('returns false for non-Error values', () => {
    expect(isConflictError(null)).toBe(false)
    expect(isConflictError(undefined)).toBe(false)
    expect(isConflictError('not found')).toBe(false)
    expect(isConflictError(404)).toBe(false)
  })

  it('detects "not found" keyword', () => {
    expect(isConflictError(new Error('Resource not found'))).toBe(true)
  })

  it('detects "404" status code in message', () => {
    expect(isConflictError(new Error('Request failed with status 404'))).toBe(true)
  })

  it('detects "conflict" keyword', () => {
    expect(isConflictError(new Error('Conflict detected'))).toBe(true)
  })

  it('detects "409" status code in message', () => {
    expect(isConflictError(new Error('Request failed with status 409'))).toBe(true)
  })

  it('detects "already" keyword', () => {
    expect(isConflictError(new Error('Exchange already applied'))).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isConflictError(new Error('NOT FOUND'))).toBe(true)
    expect(isConflictError(new Error('CONFLICT'))).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isConflictError(new Error('Network timeout'))).toBe(false)
    expect(isConflictError(new Error('Unauthorized'))).toBe(false)
  })
})

describe('getRetryDelay', () => {
  it('calculates exponential backoff from base delay', () => {
    expect(getRetryDelay(0)).toBe(RETRY_DELAY_BASE_MS)
    expect(getRetryDelay(1)).toBe(RETRY_DELAY_BASE_MS * 2)
    expect(getRetryDelay(2)).toBe(RETRY_DELAY_BASE_MS * 4)
    expect(getRetryDelay(3)).toBe(RETRY_DELAY_BASE_MS * 8)
  })
})

describe('sleep', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves after specified duration', async () => {
    vi.useFakeTimers()
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await expect(promise).resolves.toBeUndefined()
  })
})

describe('generateActionId', () => {
  it('returns a string starting with "action_"', () => {
    const id = generateActionId()
    expect(id).toMatch(/^action_/)
  })

  it('includes a timestamp component', () => {
    const before = Date.now()
    const id = generateActionId()
    const after = Date.now()

    const parts = id.split('_')
    const timestamp = Number(parts[1])
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateActionId()))
    expect(ids.size).toBe(100)
  })
})

describe('shouldRetryAction', () => {
  it('returns true when retryCount is below MAX_RETRY_COUNT', () => {
    expect(shouldRetryAction(createAction({ retryCount: 0 }))).toBe(true)
    expect(shouldRetryAction(createAction({ retryCount: MAX_RETRY_COUNT - 1 }))).toBe(true)
  })

  it('returns false when retryCount equals MAX_RETRY_COUNT', () => {
    expect(shouldRetryAction(createAction({ retryCount: MAX_RETRY_COUNT }))).toBe(false)
  })

  it('returns false when retryCount exceeds MAX_RETRY_COUNT', () => {
    expect(shouldRetryAction(createAction({ retryCount: MAX_RETRY_COUNT + 1 }))).toBe(false)
  })
})

describe('emptySyncResult', () => {
  it('returns a result with all counters at zero', () => {
    const result = emptySyncResult()
    expect(result).toEqual({
      processed: 0,
      succeeded: 0,
      failed: 0,
      requiresReauth: false,
      results: [],
    })
  })
})

describe('sortActionsByCreatedAt', () => {
  it('returns actions sorted by createdAt ascending', () => {
    const actions = [
      createAction({ id: 'c', createdAt: 3000 }),
      createAction({ id: 'a', createdAt: 1000 }),
      createAction({ id: 'b', createdAt: 2000 }),
    ]

    const sorted = sortActionsByCreatedAt(actions)
    expect(sorted.map((a) => a.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate the original array', () => {
    const actions = [
      createAction({ id: 'b', createdAt: 2000 }),
      createAction({ id: 'a', createdAt: 1000 }),
    ]

    const sorted = sortActionsByCreatedAt(actions)
    expect(sorted).not.toBe(actions)
    expect(actions[0]!.id).toBe('b')
  })

  it('handles empty array', () => {
    expect(sortActionsByCreatedAt([])).toEqual([])
  })

  it('handles single element', () => {
    const actions = [createAction({ id: 'only' })]
    const sorted = sortActionsByCreatedAt(actions)
    expect(sorted).toHaveLength(1)
    expect(sorted[0]!.id).toBe('only')
  })
})
