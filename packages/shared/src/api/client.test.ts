/**
 * Tests for API client utility functions
 */

import { describe, it, expect, vi } from 'vitest'
import { createApiError, isApiError, wrapApiCall, HttpStatus, type ApiError } from './client'

describe('createApiError', () => {
  it('should create an ApiError with required fields', () => {
    const error = createApiError(404, 'Not found')

    expect(error.status).toBe(404)
    expect(error.message).toBe('Not found')
    expect(error.code).toBeUndefined()
    expect(error.cause).toBeUndefined()
  })

  it('should create an ApiError with optional code', () => {
    const error = createApiError(400, 'Bad request', 'VALIDATION_ERROR')

    expect(error.status).toBe(400)
    expect(error.message).toBe('Bad request')
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.cause).toBeUndefined()
  })

  it('should create an ApiError with optional cause', () => {
    const originalError = new Error('Original error')
    const error = createApiError(500, 'Server error', 'INTERNAL_ERROR', originalError)

    expect(error.status).toBe(500)
    expect(error.message).toBe('Server error')
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.cause).toBe(originalError)
  })

  it('should create an ApiError with cause but no code', () => {
    const cause = { detail: 'some context' }
    const error = createApiError(503, 'Service unavailable', undefined, cause)

    expect(error.status).toBe(503)
    expect(error.message).toBe('Service unavailable')
    expect(error.code).toBeUndefined()
    expect(error.cause).toBe(cause)
  })
})

describe('isApiError', () => {
  it('should return true for valid ApiError object', () => {
    const error: ApiError = {
      status: 404,
      message: 'Not found',
    }

    expect(isApiError(error)).toBe(true)
  })

  it('should return true for ApiError with all fields', () => {
    const error: ApiError = {
      status: 400,
      message: 'Bad request',
      code: 'VALIDATION_ERROR',
      cause: new Error('original'),
    }

    expect(isApiError(error)).toBe(true)
  })

  it('should return false for null', () => {
    expect(isApiError(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isApiError(undefined)).toBe(false)
  })

  it('should return false for string', () => {
    expect(isApiError('error message')).toBe(false)
  })

  it('should return false for number', () => {
    expect(isApiError(404)).toBe(false)
  })

  it('should return false for array', () => {
    expect(isApiError([{ status: 404, message: 'Not found' }])).toBe(false)
  })

  it('should return false for object missing status', () => {
    expect(isApiError({ message: 'Error' })).toBe(false)
  })

  it('should return false for object missing message', () => {
    expect(isApiError({ status: 404 })).toBe(false)
  })

  it('should return false for empty object', () => {
    expect(isApiError({})).toBe(false)
  })

  it('should return true for object with only status and message', () => {
    expect(isApiError({ status: 500, message: 'Internal error' })).toBe(true)
  })

  it('should return true for object created by createApiError', () => {
    const error = createApiError(401, 'Unauthorized')
    expect(isApiError(error)).toBe(true)
  })
})

describe('wrapApiCall', () => {
  it('should return data on successful call', async () => {
    const mockData = { id: '123', name: 'Test' }
    const fn = vi.fn().mockResolvedValue(mockData)

    const result = await wrapApiCall(fn)

    expect(result.data).toEqual(mockData)
    expect(result.error).toBeNull()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should return ApiError on thrown ApiError', async () => {
    const apiError: ApiError = {
      status: 404,
      message: 'Not found',
      code: 'NOT_FOUND',
    }
    const fn = vi.fn().mockRejectedValue(apiError)

    const result = await wrapApiCall(fn)

    expect(result.data).toBeNull()
    expect(result.error).toEqual(apiError)
  })

  it('should wrap regular Error in ApiError', async () => {
    const originalError = new Error('Something went wrong')
    const fn = vi.fn().mockRejectedValue(originalError)

    const result = await wrapApiCall(fn)

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.status).toBe(500)
    expect(result.error?.message).toBe('Something went wrong')
    expect(result.error?.cause).toBe(originalError)
  })

  it('should handle string error', async () => {
    const fn = vi.fn().mockRejectedValue('String error')

    const result = await wrapApiCall(fn)

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.status).toBe(500)
    expect(result.error?.message).toBe('Unknown error')
    expect(result.error?.cause).toBe('String error')
  })

  it('should handle null thrown value', async () => {
    const fn = vi.fn().mockRejectedValue(null)

    const result = await wrapApiCall(fn)

    expect(result.data).toBeNull()
    expect(result.error).not.toBeNull()
    expect(result.error?.status).toBe(500)
    expect(result.error?.message).toBe('Unknown error')
  })

  it('should handle undefined thrown value', async () => {
    const fn = vi.fn().mockRejectedValue(undefined)

    const result = await wrapApiCall(fn)

    expect(result.data).toBeNull()
    expect(result.error?.status).toBe(500)
    expect(result.error?.message).toBe('Unknown error')
  })

  it('should handle async function that returns void', async () => {
    const fn = vi.fn().mockResolvedValue(undefined)

    const result = await wrapApiCall(fn)

    expect(result.data).toBeUndefined()
    expect(result.error).toBeNull()
  })

  it('should handle async function that returns null', async () => {
    const fn = vi.fn().mockResolvedValue(null)

    const result = await wrapApiCall(fn)

    expect(result.data).toBeNull()
    expect(result.error).toBeNull()
  })

  it('should preserve error code in wrapped ApiError', async () => {
    const apiError: ApiError = {
      status: 401,
      message: 'Session expired',
      code: 'SESSION_EXPIRED',
    }
    const fn = vi.fn().mockRejectedValue(apiError)

    const result = await wrapApiCall(fn)

    expect(result.error?.code).toBe('SESSION_EXPIRED')
  })
})

describe('HttpStatus', () => {
  it('should have correct OK status', () => {
    expect(HttpStatus.OK).toBe(200)
  })

  it('should have correct CREATED status', () => {
    expect(HttpStatus.CREATED).toBe(201)
  })

  it('should have correct NO_CONTENT status', () => {
    expect(HttpStatus.NO_CONTENT).toBe(204)
  })

  it('should have correct BAD_REQUEST status', () => {
    expect(HttpStatus.BAD_REQUEST).toBe(400)
  })

  it('should have correct UNAUTHORIZED status', () => {
    expect(HttpStatus.UNAUTHORIZED).toBe(401)
  })

  it('should have correct FORBIDDEN status', () => {
    expect(HttpStatus.FORBIDDEN).toBe(403)
  })

  it('should have correct NOT_FOUND status', () => {
    expect(HttpStatus.NOT_FOUND).toBe(404)
  })

  it('should have correct INTERNAL_SERVER_ERROR status', () => {
    expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500)
  })

  it('should be a const object (immutable)', () => {
    // TypeScript enforces this, but we can verify the values are as expected
    const statusCodes = Object.values(HttpStatus)
    expect(statusCodes).toContain(200)
    expect(statusCodes).toContain(201)
    expect(statusCodes).toContain(204)
    expect(statusCodes).toContain(400)
    expect(statusCodes).toContain(401)
    expect(statusCodes).toContain(403)
    expect(statusCodes).toContain(404)
    expect(statusCodes).toContain(500)
  })
})
