import { describe, it, expect, beforeEach } from 'vitest'

import { parseSearchInput } from '@/features/validation/hooks/useScorerSearch'
import { useDemoStore } from '@/shared/stores/demo'

import { mockApi } from './mock-api'

describe('mockApi.searchPersons', () => {
  beforeEach(() => {
    // Initialize demo data before each test
    useDemoStore.getState().initializeDemoData()
  })

  describe('single-term search (lastName only)', () => {
    it('matches firstName when searching with single term', async () => {
      // "Hans" is a firstName in demo data
      const result = await mockApi.searchPersons({ lastName: 'Hans' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((s) => s.firstName === 'Hans')).toBe(true)
    })

    it('matches lastName when searching with single term', async () => {
      // "Müller" is a lastName in demo data
      const result = await mockApi.searchPersons({ lastName: 'Müller' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((s) => s.lastName === 'Müller')).toBe(true)
    })

    it('matches partial firstName with single term', async () => {
      const result = await mockApi.searchPersons({ lastName: 'Han' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((s) => s.firstName === 'Hans')).toBe(true)
    })

    it('matches partial lastName with single term', async () => {
      const result = await mockApi.searchPersons({ lastName: 'Müll' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((s) => s.lastName === 'Müller')).toBe(true)
    })
  })

  describe('two-term search (firstName and lastName)', () => {
    it('matches both firstName and lastName fields', async () => {
      const result = await mockApi.searchPersons({
        firstName: 'Hans',
        lastName: 'Müller',
      })
      const items = result.items!

      expect(items.length).toBe(1)
      expect(items[0]?.firstName).toBe('Hans')
      expect(items[0]?.lastName).toBe('Müller')
    })

    it('matches when names are provided in reversed order (lastName first)', async () => {
      // User types "Müller Hans" → parseSearchInput gives firstName=Müller, lastName=Hans
      // The mock API should still find Hans Müller
      const result = await mockApi.searchPersons({
        firstName: 'Müller',
        lastName: 'Hans',
      })
      const items = result.items!

      expect(items.length).toBe(1)
      expect(items[0]?.firstName).toBe('Hans')
      expect(items[0]?.lastName).toBe('Müller')
    })

    it('returns empty when firstName matches but lastName does not', async () => {
      const result = await mockApi.searchPersons({
        firstName: 'Hans',
        lastName: 'Schmidt',
      })
      const items = result.items!

      expect(items.length).toBe(0)
    })

    it('returns empty when lastName matches but firstName does not', async () => {
      const result = await mockApi.searchPersons({
        firstName: 'Peter',
        lastName: 'Müller',
      })
      const items = result.items!

      expect(items.length).toBe(0)
    })
  })

  describe('accent-insensitive search', () => {
    it("matches 'muller' to 'Müller' (ü -> u)", async () => {
      const result = await mockApi.searchPersons({ lastName: 'muller' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((s) => s.lastName === 'Müller')).toBe(true)
    })

    it("matches 'Muller' to 'Müller' (case-insensitive)", async () => {
      const result = await mockApi.searchPersons({ lastName: 'Muller' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((s) => s.lastName === 'Müller')).toBe(true)
    })

    it('matches accented search term to accented data', async () => {
      const result = await mockApi.searchPersons({ lastName: 'Müller' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((s) => s.lastName === 'Müller')).toBe(true)
    })

    it('matches firstName with accent-insensitive search', async () => {
      // Single term search for firstName
      const result = await mockApi.searchPersons({ lastName: 'hans' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      expect(items.some((s) => s.firstName === 'Hans')).toBe(true)
    })
  })

  describe('year of birth filter', () => {
    it('filters by year of birth', async () => {
      const result = await mockApi.searchPersons({ yearOfBirth: '1985' })
      const items = result.items!

      expect(items.length).toBeGreaterThan(0)
      items.forEach((scorer) => {
        const year = new Date(scorer.birthday!).getFullYear()
        expect(year).toBe(1985)
      })
    })

    it('combines lastName and yearOfBirth filters', async () => {
      const result = await mockApi.searchPersons({
        lastName: 'Müller',
        yearOfBirth: '1985',
      })
      const items = result.items!

      expect(items).toHaveLength(1)
      const scorer = items[0]!
      expect(scorer.lastName).toBe('Müller')
      expect(scorer.birthday).toBeDefined()
      expect(new Date(scorer.birthday!).getFullYear()).toBe(1985)
    })
  })

  describe('empty and non-matching searches', () => {
    it('returns empty array for non-existent name', async () => {
      const result = await mockApi.searchPersons({ lastName: 'XYZ123' })
      const items = result.items!

      expect(items).toHaveLength(0)
      expect(result.totalItemsCount).toBe(0)
    })

    it('returns all scorers when no filters provided', async () => {
      const result = await mockApi.searchPersons({})
      const items = result.items!

      // Should return all demo scorers (10 in the demo data)
      expect(items.length).toBe(10)
      expect(result.totalItemsCount).toBe(10)
    })
  })

  describe('pagination', () => {
    it('respects limit option', async () => {
      const result = await mockApi.searchPersons({}, { limit: 3 })
      const items = result.items!

      expect(items.length).toBe(3)
      expect(result.totalItemsCount).toBe(10)
    })

    it('respects offset option', async () => {
      const allResults = await mockApi.searchPersons({})
      const offsetResults = await mockApi.searchPersons({}, { offset: 5 })
      const allItems = allResults.items!
      const offsetItems = offsetResults.items!

      expect(offsetItems.length).toBe(5)
      expect(offsetItems[0]).toEqual(allItems[5])
    })

    it('combines offset and limit', async () => {
      const result = await mockApi.searchPersons({}, { offset: 2, limit: 3 })
      const items = result.items!

      expect(items.length).toBe(3)
      expect(result.totalItemsCount).toBe(10)
    })
  })
})

/**
 * Integration tests that simulate the full flow from user input to search results.
 * These tests verify that:
 * 1. parseSearchInput correctly parses user input
 * 2. mockApi.searchPersons handles the parsed filters correctly
 * 3. The end-to-end flow works as users would experience in the validation panel
 */
describe('scorer search integration - user flow simulation', () => {
  beforeEach(() => {
    useDemoStore.getState().initializeDemoData()
  })

  describe('simulates typing in the search input', () => {
    it('finds scorers when user types a single last name', async () => {
      // User types "Müller" in the search input
      const userInput = 'Müller'
      const filters = parseSearchInput(userInput)

      // This is how the hook calls the API
      const result = await mockApi.searchPersons(filters)

      expect(result.items).toBeDefined()
      expect(result.items!.length).toBeGreaterThan(0)
      expect(result.items!.some((s) => s.lastName === 'Müller')).toBe(true)
    })

    it('finds scorers when user types a single first name', async () => {
      // User types "Hans" in the search input
      const userInput = 'Hans'
      const filters = parseSearchInput(userInput)

      // parseSearchInput treats single word as lastName
      expect(filters).toEqual({ lastName: 'Hans' })

      // mockApi should search both firstName and lastName for single term
      const result = await mockApi.searchPersons(filters)

      expect(result.items).toBeDefined()
      expect(result.items!.length).toBeGreaterThan(0)
      expect(result.items!.some((s) => s.firstName === 'Hans')).toBe(true)
    })

    it('finds scorers when user types first and last name', async () => {
      // User types "Hans Müller" in the search input
      const userInput = 'Hans Müller'
      const filters = parseSearchInput(userInput)

      expect(filters).toEqual({ firstName: 'Hans', lastName: 'Müller' })

      const result = await mockApi.searchPersons(filters)

      expect(result.items).toBeDefined()
      expect(result.items!.length).toBe(1)
      expect(result.items![0]!.displayName).toBe('Hans Müller')
    })

    it('finds scorers when user types last name first (e.g., "Müller Hans")', async () => {
      // User types "Müller Hans" (last name first, common in Swiss German)
      const userInput = 'Müller Hans'
      const filters = parseSearchInput(userInput)

      // parseSearchInput treats first word as firstName, second as lastName
      expect(filters).toEqual({ firstName: 'Müller', lastName: 'Hans' })

      // But the mock API should still find Hans Müller via swapped name matching
      const result = await mockApi.searchPersons(filters)

      expect(result.items).toBeDefined()
      expect(result.items!.length).toBe(1)
      expect(result.items![0]!.displayName).toBe('Hans Müller')
    })

    it('finds scorers when user types name with birth year', async () => {
      // User types "Müller 1985" in the search input
      const userInput = 'Müller 1985'
      const filters = parseSearchInput(userInput)

      expect(filters).toEqual({ lastName: 'Müller', yearOfBirth: '1985' })

      const result = await mockApi.searchPersons(filters)

      expect(result.items).toBeDefined()
      expect(result.items!.length).toBe(1)
      expect(result.items![0]!.displayName).toBe('Hans Müller')
    })

    it('finds scorers when user types partial name', async () => {
      // User types partial name "Mül" in the search input
      const userInput = 'Mül'
      const filters = parseSearchInput(userInput)

      const result = await mockApi.searchPersons(filters)

      expect(result.items).toBeDefined()
      expect(result.items!.length).toBeGreaterThan(0)
      expect(result.items!.some((s) => s.lastName === 'Müller')).toBe(true)
    })

    it('returns empty results for non-matching search', async () => {
      // User types something that doesn't exist
      const userInput = 'XYZNonexistent'
      const filters = parseSearchInput(userInput)

      const result = await mockApi.searchPersons(filters)

      expect(result.items).toBeDefined()
      expect(result.items!.length).toBe(0)
    })

    it('handles accent-insensitive search (user types without umlaut)', async () => {
      // User types "muller" without umlaut
      const userInput = 'muller'
      const filters = parseSearchInput(userInput)

      const result = await mockApi.searchPersons(filters)

      expect(result.items).toBeDefined()
      expect(result.items!.length).toBeGreaterThan(0)
      expect(result.items!.some((s) => s.lastName === 'Müller')).toBe(true)
    })
  })

  describe('verifies demo data is properly structured', () => {
    it('demo scorers have all required fields', () => {
      const store = useDemoStore.getState()

      expect(store.scorers.length).toBe(10)

      store.scorers.forEach((scorer) => {
        expect(scorer.__identity).toBeDefined()
        expect(scorer.firstName).toBeDefined()
        expect(scorer.lastName).toBeDefined()
        expect(scorer.displayName).toBeDefined()
        expect(scorer.associationId).toBeDefined()
        expect(scorer.birthday).toBeDefined()
        expect(scorer.gender).toBeDefined()
      })
    })

    it('demo scorers have valid UUID format for Zod validation', () => {
      const store = useDemoStore.getState()
      // UUID v4 regex pattern that matches Zod's uuid() validator
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      store.scorers.forEach((scorer) => {
        expect(scorer.__identity).toMatch(uuidRegex)
      })
    })
  })
})
