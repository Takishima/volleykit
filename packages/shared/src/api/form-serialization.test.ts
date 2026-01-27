/**
 * Tests for form data serialization utilities
 */

import { describe, it, expect } from 'vitest'
import { buildFormData, type BuildFormDataOptions } from './form-serialization'

describe('buildFormData', () => {
  describe('basic serialization', () => {
    it('should serialize flat object to form params', () => {
      const data = { name: 'John', age: 30 }
      const params = buildFormData(data)

      expect(params.get('name')).toBe('John')
      expect(params.get('age')).toBe('30')
    })

    it('should handle empty object', () => {
      const params = buildFormData({})

      expect([...params.entries()]).toHaveLength(0)
    })

    it('should convert numbers to strings', () => {
      const data = { count: 42, price: 19.99 }
      const params = buildFormData(data)

      expect(params.get('count')).toBe('42')
      expect(params.get('price')).toBe('19.99')
    })

    it('should convert booleans to strings', () => {
      const data = { active: true, disabled: false }
      const params = buildFormData(data)

      expect(params.get('active')).toBe('true')
      expect(params.get('disabled')).toBe('false')
    })
  })

  describe('nested object serialization', () => {
    it('should serialize nested object with bracket notation', () => {
      const data = {
        searchConfiguration: {
          offset: 0,
          limit: 10,
        },
      }
      const params = buildFormData(data)

      expect(params.get('searchConfiguration[offset]')).toBe('0')
      expect(params.get('searchConfiguration[limit]')).toBe('10')
    })

    it('should handle deeply nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }
      const params = buildFormData(data)

      expect(params.get('level1[level2][level3][value]')).toBe('deep')
    })

    it('should handle multiple nested objects at same level', () => {
      const data = {
        user: { name: 'John' },
        settings: { theme: 'dark' },
      }
      const params = buildFormData(data)

      expect(params.get('user[name]')).toBe('John')
      expect(params.get('settings[theme]')).toBe('dark')
    })
  })

  describe('array serialization', () => {
    it('should serialize arrays with index bracket notation', () => {
      const data = { items: ['apple', 'banana', 'cherry'] }
      const params = buildFormData(data)

      expect(params.get('items[0]')).toBe('apple')
      expect(params.get('items[1]')).toBe('banana')
      expect(params.get('items[2]')).toBe('cherry')
    })

    it('should handle array of numbers', () => {
      const data = { ids: [1, 2, 3] }
      const params = buildFormData(data)

      expect(params.get('ids[0]')).toBe('1')
      expect(params.get('ids[1]')).toBe('2')
      expect(params.get('ids[2]')).toBe('3')
    })

    it('should handle empty array', () => {
      const data = { items: [] }
      const params = buildFormData(data)

      // Empty array produces no params
      expect([...params.entries()]).toHaveLength(0)
    })

    it('should handle array of objects', () => {
      const data = {
        users: [
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 30 },
        ],
      }
      const params = buildFormData(data)

      expect(params.get('users[0][name]')).toBe('Alice')
      expect(params.get('users[0][age]')).toBe('25')
      expect(params.get('users[1][name]')).toBe('Bob')
      expect(params.get('users[1][age]')).toBe('30')
    })
  })

  describe('mixed nested structures', () => {
    it('should handle objects containing arrays', () => {
      const data = {
        config: {
          tags: ['a', 'b'],
          count: 2,
        },
      }
      const params = buildFormData(data)

      expect(params.get('config[tags][0]')).toBe('a')
      expect(params.get('config[tags][1]')).toBe('b')
      expect(params.get('config[count]')).toBe('2')
    })

    it('should handle typical API search configuration', () => {
      const data = {
        searchConfiguration: {
          fromDate: '2024-01-01',
          toDate: '2024-12-31',
          sortField: 'date',
          sortDirection: 'asc',
          limit: 50,
          offset: 0,
        },
        propertyRenderConfiguration: ['field1', 'field2'],
      }
      const params = buildFormData(data)

      expect(params.get('searchConfiguration[fromDate]')).toBe('2024-01-01')
      expect(params.get('searchConfiguration[toDate]')).toBe('2024-12-31')
      expect(params.get('searchConfiguration[sortField]')).toBe('date')
      expect(params.get('searchConfiguration[sortDirection]')).toBe('asc')
      expect(params.get('searchConfiguration[limit]')).toBe('50')
      expect(params.get('searchConfiguration[offset]')).toBe('0')
      expect(params.get('propertyRenderConfiguration[0]')).toBe('field1')
      expect(params.get('propertyRenderConfiguration[1]')).toBe('field2')
    })
  })

  describe('null and undefined handling', () => {
    it('should skip null values', () => {
      const data = { name: 'John', age: null }
      const params = buildFormData(data)

      expect(params.get('name')).toBe('John')
      expect(params.has('age')).toBe(false)
    })

    it('should skip undefined values', () => {
      const data = { name: 'John', age: undefined }
      const params = buildFormData(data)

      expect(params.get('name')).toBe('John')
      expect(params.has('age')).toBe(false)
    })

    it('should skip nested null objects', () => {
      const data = { user: null, settings: { theme: 'dark' } }
      const params = buildFormData(data)

      expect(params.has('user')).toBe(false)
      expect(params.get('settings[theme]')).toBe('dark')
    })
  })

  describe('CSRF token handling', () => {
    it('should include CSRF token when provided', () => {
      const data = { action: 'submit' }
      const options: BuildFormDataOptions = { csrfToken: 'abc123token' }
      const params = buildFormData(data, options)

      expect(params.get('action')).toBe('submit')
      expect(params.get('__csrfToken')).toBe('abc123token')
    })

    it('should not include CSRF token when null', () => {
      const data = { action: 'submit' }
      const options: BuildFormDataOptions = { csrfToken: null }
      const params = buildFormData(data, options)

      expect(params.get('action')).toBe('submit')
      expect(params.has('__csrfToken')).toBe(false)
    })

    it('should not include CSRF token when undefined', () => {
      const data = { action: 'submit' }
      const options: BuildFormDataOptions = { csrfToken: undefined }
      const params = buildFormData(data, options)

      expect(params.has('__csrfToken')).toBe(false)
    })

    it('should not include CSRF token when options not provided', () => {
      const data = { action: 'submit' }
      const params = buildFormData(data)

      expect(params.has('__csrfToken')).toBe(false)
    })

    it('should handle empty string CSRF token', () => {
      const data = { action: 'submit' }
      const options: BuildFormDataOptions = { csrfToken: '' }
      const params = buildFormData(data, options)

      // Empty string is falsy, so should not be included
      expect(params.has('__csrfToken')).toBe(false)
    })
  })

  describe('maximum depth protection', () => {
    it('should throw error when nesting exceeds maximum depth', () => {
      // Create a structure deeper than MAX_DEPTH (10)
      const createDeepObject = (depth: number): Record<string, unknown> => {
        if (depth === 0) return { value: 'bottom' }
        return { nested: createDeepObject(depth - 1) }
      }

      const data = createDeepObject(15) // 15 levels deep

      expect(() => buildFormData(data)).toThrow('exceeds maximum nesting depth')
    })

    it('should handle exactly MAX_DEPTH levels', () => {
      // Create exactly 10 levels deep (should work)
      const createDeepObject = (depth: number): Record<string, unknown> => {
        if (depth === 0) return { value: 'bottom' }
        return { nested: createDeepObject(depth - 1) }
      }

      const data = createDeepObject(9) // 9 nested + 1 top level = 10 levels

      // Should not throw
      expect(() => buildFormData(data)).not.toThrow()
    })
  })

  describe('circular reference detection', () => {
    it('should throw error for direct circular reference', () => {
      const data: Record<string, unknown> = { name: 'test' }
      data.self = data // Direct circular reference

      expect(() => buildFormData(data)).toThrow('Circular reference detected')
    })

    it('should throw error for indirect circular reference', () => {
      const a: Record<string, unknown> = { name: 'a' }
      const b: Record<string, unknown> = { name: 'b' }
      a.ref = b
      b.ref = a // Circular: a -> b -> a

      expect(() => buildFormData({ root: a })).toThrow('Circular reference detected')
    })

    it('should allow shared references (non-circular)', () => {
      const shared = { id: 123, name: 'Shared' }
      const data = {
        first: shared,
        second: shared, // Same object referenced twice (not circular)
      }

      // Should not throw - shared references are allowed
      const params = buildFormData(data)

      expect(params.get('first[id]')).toBe('123')
      expect(params.get('first[name]')).toBe('Shared')
      expect(params.get('second[id]')).toBe('123')
      expect(params.get('second[name]')).toBe('Shared')
    })
  })

  describe('edge cases', () => {
    it('should handle string with special characters', () => {
      const data = { query: 'hello world & special=chars' }
      const params = buildFormData(data)

      expect(params.get('query')).toBe('hello world & special=chars')
    })

    it('should handle unicode characters', () => {
      const data = { name: 'Müller', city: 'Zürich' }
      const params = buildFormData(data)

      expect(params.get('name')).toBe('Müller')
      expect(params.get('city')).toBe('Zürich')
    })

    it('should handle keys with special characters', () => {
      const data = { 'field-name': 'value', field_name: 'value2' }
      const params = buildFormData(data)

      expect(params.get('field-name')).toBe('value')
      expect(params.get('field_name')).toBe('value2')
    })

    it('should convert zero to string', () => {
      const data = { count: 0 }
      const params = buildFormData(data)

      expect(params.get('count')).toBe('0')
    })

    it('should convert negative numbers to strings', () => {
      const data = { offset: -10 }
      const params = buildFormData(data)

      expect(params.get('offset')).toBe('-10')
    })
  })
})
