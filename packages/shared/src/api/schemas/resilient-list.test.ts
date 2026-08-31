import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import {
  resilientListSchema,
  optionalResilientListSchema,
  getDroppedListItems,
} from './resilient-list'

const itemSchema = z.object({ id: z.string() }).passthrough()

describe('resilientListSchema', () => {
  it('parses an empty items array', () => {
    const result = resilientListSchema(itemSchema).safeParse({ items: [], totalItemsCount: 0 })

    expect(result.success).toBe(true)
    expect(result.success && result.data.items).toEqual([])
  })

  it('drops invalid items without failing the list, leaving totalItemsCount untouched', () => {
    const result = resilientListSchema(itemSchema).safeParse({
      items: [{ id: 'a' }, { id: 42 }, { id: 'b' }],
      totalItemsCount: 3,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items.map((i) => i.id)).toEqual(['a', 'b'])
      expect(result.data.totalItemsCount).toBe(3)
      expect(getDroppedListItems(result.data)).toHaveLength(1)
    }
  })

  it('rejects a response without an items key', () => {
    expect(resilientListSchema(itemSchema).safeParse({ totalItemsCount: 0 }).success).toBe(false)
  })
})

describe('optionalResilientListSchema', () => {
  it('parses a response without an items key to an empty list', () => {
    const result = optionalResilientListSchema(itemSchema).safeParse({ totalItemsCount: 0 })

    expect(result.success).toBe(true)
    expect(result.success && result.data.items).toEqual([])
  })

  it('behaves like the required variant when items are present', () => {
    const result = optionalResilientListSchema(itemSchema).safeParse({
      items: [{ id: 'a' }, { id: 42 }],
      totalItemsCount: 2,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items.map((i) => i.id)).toEqual(['a'])
      expect(result.data.totalItemsCount).toBe(2)
      expect(getDroppedListItems(result.data)).toHaveLength(1)
    }
  })
})
