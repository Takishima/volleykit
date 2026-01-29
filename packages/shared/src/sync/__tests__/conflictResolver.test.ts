/**
 * Unit tests for conflict resolution functions.
 */

import { describe, it, expect } from 'vitest'
import {
  categorizeConflict,
  isRetryableError,
  isConflictError,
  isSyncNetworkError,
  type ApiErrorWithStatus,
} from '../conflictResolver'

/**
 * Helper to create an error with status code.
 */
function createError(message: string, status?: number): ApiErrorWithStatus {
  const error = new Error(message) as ApiErrorWithStatus
  if (status !== undefined) {
    error.status = status
  }
  return error
}

describe('categorizeConflict', () => {
  describe('HTTP status codes', () => {
    it('returns not_found for 404', () => {
      const error = createError('Not found', 404)

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('not_found')
    })

    it('returns permission_denied for 403', () => {
      const error = createError('Forbidden', 403)

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('permission_denied')
    })
  })

  describe('applyForExchange conflicts', () => {
    it('returns already_taken for 409', () => {
      const error = createError('Conflict', 409)

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('already_taken')
    })

    it('returns already_taken when message contains "already"', () => {
      const error = createError('Exchange already taken', 400)

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('already_taken')
    })

    it('returns already_taken when message contains "taken"', () => {
      const error = createError('This game has been taken', 400)

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('already_taken')
    })

    it('returns expired when message contains "closed"', () => {
      const error = createError('Exchange is closed', 400)

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('expired')
    })

    it('returns expired when message contains "expired"', () => {
      const error = createError('Exchange has expired', 400)

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('expired')
    })
  })

  describe('withdrawFromExchange conflicts', () => {
    it('returns already_taken for 409', () => {
      const error = createError('Conflict', 409)

      const result = categorizeConflict(error, 'withdrawFromExchange')

      expect(result).toBe('already_taken')
    })
  })

  describe('other mutation types', () => {
    it('returns unknown for unrecognized errors on updateCompensation', () => {
      const error = createError('Something went wrong', 400)

      const result = categorizeConflict(error, 'updateCompensation')

      expect(result).toBe('unknown')
    })
  })

  describe('fallback behavior', () => {
    it('returns unknown for unrecognized errors', () => {
      const error = createError('Something went wrong', 400)

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('unknown')
    })

    it('handles missing message gracefully', () => {
      const error = { status: 400 } as ApiErrorWithStatus

      const result = categorizeConflict(error, 'applyForExchange')

      expect(result).toBe('unknown')
    })
  })
})

describe('isRetryableError', () => {
  it('returns true for network errors (no status)', () => {
    const error = createError('Network request failed')

    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for 500 server error', () => {
    const error = createError('Internal server error', 500)

    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for 502 bad gateway', () => {
    const error = createError('Bad gateway', 502)

    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for 503 service unavailable', () => {
    const error = createError('Service unavailable', 503)

    expect(isRetryableError(error)).toBe(true)
  })

  it('returns true for 429 rate limited', () => {
    const error = createError('Too many requests', 429)

    expect(isRetryableError(error)).toBe(true)
  })

  it('returns false for 400 bad request', () => {
    const error = createError('Bad request', 400)

    expect(isRetryableError(error)).toBe(false)
  })

  it('returns false for 401 unauthorized', () => {
    const error = createError('Unauthorized', 401)

    expect(isRetryableError(error)).toBe(false)
  })

  it('returns false for 403 forbidden', () => {
    const error = createError('Forbidden', 403)

    expect(isRetryableError(error)).toBe(false)
  })

  it('returns false for 404 not found', () => {
    const error = createError('Not found', 404)

    expect(isRetryableError(error)).toBe(false)
  })

  it('returns false for 409 conflict', () => {
    const error = createError('Conflict', 409)

    expect(isRetryableError(error)).toBe(false)
  })
})

describe('isConflictError', () => {
  it('returns true for 400', () => {
    const error = createError('Bad request', 400)

    expect(isConflictError(error)).toBe(true)
  })

  it('returns true for 404', () => {
    const error = createError('Not found', 404)

    expect(isConflictError(error)).toBe(true)
  })

  it('returns true for 409', () => {
    const error = createError('Conflict', 409)

    expect(isConflictError(error)).toBe(true)
  })

  it('returns false for 401', () => {
    const error = createError('Unauthorized', 401)

    expect(isConflictError(error)).toBe(false)
  })

  it('returns false for 403', () => {
    const error = createError('Forbidden', 403)

    expect(isConflictError(error)).toBe(false)
  })

  it('returns false for 500', () => {
    const error = createError('Server error', 500)

    expect(isConflictError(error)).toBe(false)
  })

  it('returns false for network errors (no status)', () => {
    const error = createError('Network failed')

    expect(isConflictError(error)).toBe(false)
  })
})

describe('isSyncNetworkError', () => {
  it('returns true for errors without status code', () => {
    const error = createError('Network request failed')

    expect(isSyncNetworkError(error)).toBe(true)
  })

  it('returns true when message contains "network"', () => {
    const error = createError('Network error occurred', 0)
    error.status = undefined

    expect(isSyncNetworkError(error)).toBe(true)
  })

  it('returns true when message contains "fetch"', () => {
    const error = createError('Fetch failed', 0)
    error.status = undefined

    expect(isSyncNetworkError(error)).toBe(true)
  })

  it('returns true when message contains "timeout"', () => {
    const error = createError('Request timeout', 0)
    error.status = undefined

    expect(isSyncNetworkError(error)).toBe(true)
  })

  it('returns true when message contains "offline"', () => {
    const error = createError('Device is offline', 0)
    error.status = undefined

    expect(isSyncNetworkError(error)).toBe(true)
  })

  it('returns false for server errors with status', () => {
    const error = createError('Internal server error', 500)

    expect(isSyncNetworkError(error)).toBe(false)
  })

  it('returns false for client errors with status', () => {
    const error = createError('Bad request', 400)

    expect(isSyncNetworkError(error)).toBe(false)
  })
})
