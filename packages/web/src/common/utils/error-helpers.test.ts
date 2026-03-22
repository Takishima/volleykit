import { describe, it, expect } from 'vitest'

import { classifyError } from './error-helpers'

describe('classifyError', () => {
  describe('network errors', () => {
    it('classifies TypeError with fetch as network error', () => {
      const error = new TypeError('Failed to fetch')
      expect(classifyError(error)).toBe('network')
    })

    it('classifies NetworkError as network error', () => {
      const error = new Error('Network error')
      error.name = 'NetworkError'
      expect(classifyError(error)).toBe('network')
    })

    it("classifies errors containing 'network' as network error", () => {
      const error = new Error('A network issue occurred')
      expect(classifyError(error)).toBe('network')
    })

    it("classifies errors containing 'failed to fetch' as network error", () => {
      const error = new Error('Request failed to fetch')
      expect(classifyError(error)).toBe('network')
    })

    it("classifies errors containing 'connection' as network error", () => {
      const error = new Error('Connection refused')
      expect(classifyError(error)).toBe('network')
    })

    it("classifies errors containing 'timeout' as network error", () => {
      const error = new Error('Request timeout')
      expect(classifyError(error)).toBe('network')
    })

    it("classifies errors containing 'cors' as network error", () => {
      const error = new Error('CORS policy blocked the request')
      expect(classifyError(error)).toBe('network')
    })

    it("classifies errors containing 'offline' as network error", () => {
      const error = new Error('Device is offline')
      expect(classifyError(error)).toBe('network')
    })
  })

  describe('application errors', () => {
    it('classifies generic errors as application error', () => {
      const error = new Error('Something went wrong')
      expect(classifyError(error)).toBe('application')
    })

    it('classifies TypeError without fetch as application error', () => {
      const error = new TypeError('Cannot read property of undefined')
      expect(classifyError(error)).toBe('application')
    })

    it('classifies ReferenceError as application error', () => {
      const error = new ReferenceError('variable is not defined')
      expect(classifyError(error)).toBe('application')
    })

    it('classifies SyntaxError as application error', () => {
      const error = new SyntaxError('Unexpected token')
      expect(classifyError(error)).toBe('application')
    })
  })

  describe('case insensitivity', () => {
    it('handles uppercase error messages', () => {
      const error = new Error('NETWORK ERROR OCCURRED')
      expect(classifyError(error)).toBe('network')
    })

    it('handles mixed case error names', () => {
      const error = new Error('Failed')
      error.name = 'NetworkError'
      expect(classifyError(error)).toBe('network')
    })
  })
})
