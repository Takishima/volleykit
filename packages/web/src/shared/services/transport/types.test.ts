import { describe, it, expect } from 'vitest'

import { TransportApiError } from './types'

describe('TransportApiError', () => {
  it('creates error with message only', () => {
    const error = new TransportApiError('Network timeout')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(TransportApiError)
    expect(error.message).toBe('Network timeout')
    expect(error.name).toBe('TransportApiError')
    expect(error.code).toBeUndefined()
  })

  it('creates error with message and code', () => {
    const error = new TransportApiError('Rate limit exceeded', 'RATE_LIMITED')

    expect(error.message).toBe('Rate limit exceeded')
    expect(error.name).toBe('TransportApiError')
    expect(error.code).toBe('RATE_LIMITED')
  })

  it('preserves stack trace', () => {
    const error = new TransportApiError('Test error')

    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('TransportApiError')
  })

  it('can be caught as Error', () => {
    let caught: Error | undefined

    try {
      throw new TransportApiError('API unavailable', 'SERVICE_DOWN')
    } catch (e) {
      caught = e as Error
    }

    expect(caught).toBeDefined()
    expect(caught?.message).toBe('API unavailable')
    expect((caught as TransportApiError).code).toBe('SERVICE_DOWN')
  })

  it('works with instanceof checks', () => {
    const error = new TransportApiError('Connection failed')
    const regularError = new Error('Regular error')

    expect(error instanceof TransportApiError).toBe(true)
    expect(error instanceof Error).toBe(true)
    expect(regularError instanceof TransportApiError).toBe(false)
  })
})
