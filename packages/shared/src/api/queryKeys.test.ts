/**
 * Tests for query key factory
 */

import { describe, it, expect } from 'vitest'
import { queryKeys, type SearchConfiguration, type PersonSearchFilter } from './queryKeys'

describe('queryKeys', () => {
  describe('assignments', () => {
    it('should have correct base key', () => {
      expect(queryKeys.assignments.all).toEqual(['assignments'])
    })

    it('should create lists key', () => {
      expect(queryKeys.assignments.lists()).toEqual(['assignments', 'list'])
    })

    it('should create list key with config', () => {
      const config: SearchConfiguration = {
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
        sortField: 'date',
        sortDirection: 'asc',
        limit: 50,
        offset: 0,
      }

      const key = queryKeys.assignments.list(config, 'RVNO')

      expect(key).toEqual(['assignments', 'list', config, 'RVNO'])
    })

    it('should create list key without association key', () => {
      const config: SearchConfiguration = { limit: 10 }
      const key = queryKeys.assignments.list(config)

      expect(key).toEqual(['assignments', 'list', config, undefined])
    })

    it('should create details parent key', () => {
      expect(queryKeys.assignments.details()).toEqual(['assignments', 'detail'])
    })

    it('should create detail key with id', () => {
      expect(queryKeys.assignments.detail('assign-123')).toEqual([
        'assignments',
        'detail',
        'assign-123',
      ])
    })

    it('should create validationClosed key', () => {
      const key = queryKeys.assignments.validationClosed('2024-01-01', '2024-12-31', 48, 'RVSZ')

      expect(key).toEqual([
        'assignments',
        'validationClosed',
        '2024-01-01',
        '2024-12-31',
        48,
        'RVSZ',
      ])
    })
  })

  describe('compensations', () => {
    it('should have correct base key', () => {
      expect(queryKeys.compensations.all).toEqual(['compensations'])
    })

    it('should create lists key', () => {
      expect(queryKeys.compensations.lists()).toEqual(['compensations', 'list'])
    })

    it('should create list key with config and association', () => {
      const config: SearchConfiguration = { status: 'pending' }
      const key = queryKeys.compensations.list(config, 'SV')

      expect(key).toEqual(['compensations', 'list', config, 'SV'])
    })
  })

  describe('exchanges', () => {
    it('should have correct base key', () => {
      expect(queryKeys.exchanges.all).toEqual(['exchanges'])
    })

    it('should create lists key', () => {
      expect(queryKeys.exchanges.lists()).toEqual(['exchanges', 'list'])
    })

    it('should create list key with config', () => {
      const config: SearchConfiguration = { status: 'open' }
      const key = queryKeys.exchanges.list(config, null)

      expect(key).toEqual(['exchanges', 'list', config, null])
    })
  })

  describe('seasons', () => {
    it('should have correct base key', () => {
      expect(queryKeys.seasons.all).toEqual(['seasons'])
    })

    it('should create active season key', () => {
      expect(queryKeys.seasons.active('RVNO')).toEqual(['seasons', 'active', 'RVNO'])
    })

    it('should handle null association key', () => {
      expect(queryKeys.seasons.active(null)).toEqual(['seasons', 'active', null])
    })
  })

  describe('settings', () => {
    it('should have correct base key', () => {
      expect(queryKeys.settings.all).toEqual(['settings'])
    })

    it('should create association settings key', () => {
      expect(queryKeys.settings.association('SV')).toEqual(['settings', 'association', 'SV'])
    })
  })

  describe('nominations', () => {
    it('should have correct base key', () => {
      expect(queryKeys.nominations.all).toEqual(['nominations'])
    })

    it('should create possibles parent key', () => {
      expect(queryKeys.nominations.possibles()).toEqual(['nominations', 'possible'])
    })

    it('should create possible nominations key', () => {
      expect(queryKeys.nominations.possible('nom-list-123')).toEqual([
        'nominations',
        'possible',
        'nom-list-123',
      ])
    })
  })

  describe('validation', () => {
    it('should have correct base key', () => {
      expect(queryKeys.validation.all).toEqual(['validation'])
    })

    it('should create gameDetails parent key', () => {
      expect(queryKeys.validation.gameDetails()).toEqual(['validation', 'gameDetails'])
    })

    it('should create gameDetail key', () => {
      expect(queryKeys.validation.gameDetail('game-456')).toEqual([
        'validation',
        'gameDetails',
        'game-456',
      ])
    })
  })

  describe('scorerSearch', () => {
    it('should have correct base key', () => {
      expect(queryKeys.scorerSearch.all).toEqual(['scorerSearch'])
    })

    it('should create search key with filters', () => {
      const filters: PersonSearchFilter = {
        searchTerm: 'John',
        firstName: 'John',
        lastName: 'Doe',
        associationId: 123,
      }

      expect(queryKeys.scorerSearch.search(filters)).toEqual(['scorerSearch', filters])
    })

    it('should handle partial filters', () => {
      const filters: PersonSearchFilter = { searchTerm: 'Smith' }
      expect(queryKeys.scorerSearch.search(filters)).toEqual(['scorerSearch', filters])
    })
  })

  describe('travelTime', () => {
    it('should have correct base key', () => {
      expect(queryKeys.travelTime.all).toEqual(['travelTime'])
    })

    it('should create halls parent key', () => {
      expect(queryKeys.travelTime.halls()).toEqual(['travelTime', 'hall'])
    })

    it('should create hall key with day type', () => {
      expect(queryKeys.travelTime.hall('hall-123', 'loc-hash', 'weekday')).toEqual([
        'travelTime',
        'hall',
        'hall-123',
        'loc-hash',
        'weekday',
      ])

      expect(queryKeys.travelTime.hall('hall-456', 'loc-hash', 'saturday')).toEqual([
        'travelTime',
        'hall',
        'hall-456',
        'loc-hash',
        'saturday',
      ])

      expect(queryKeys.travelTime.hall('hall-789', 'loc-hash', 'sunday')).toEqual([
        'travelTime',
        'hall',
        'hall-789',
        'loc-hash',
        'sunday',
      ])
    })
  })

  describe('calendar', () => {
    it('should have correct base key', () => {
      expect(queryKeys.calendar.all).toEqual(['calendar'])
    })

    it('should create assignments parent key', () => {
      expect(queryKeys.calendar.assignments()).toEqual(['calendar', 'assignments'])
    })

    it('should create assignmentsByCode key', () => {
      expect(queryKeys.calendar.assignmentsByCode('ABC123')).toEqual([
        'calendar',
        'assignments',
        'ABC123',
      ])
    })
  })

  describe('refereeBackup', () => {
    it('should have correct base key', () => {
      expect(queryKeys.refereeBackup.all).toEqual(['refereeBackup'])
    })

    it('should create lists key', () => {
      expect(queryKeys.refereeBackup.lists()).toEqual(['refereeBackup', 'list'])
    })

    it('should create list key with config', () => {
      const config: SearchConfiguration = {
        fromDate: '2024-06-01',
        toDate: '2024-06-30',
      }

      expect(queryKeys.refereeBackup.list(config, 'SV')).toEqual([
        'refereeBackup',
        'list',
        config,
        'SV',
      ])
    })
  })

  describe('user', () => {
    it('should create profile key', () => {
      expect(queryKeys.user.profile()).toEqual(['user', 'profile'])
    })
  })

  describe('hierarchical invalidation', () => {
    it('should support invalidating all assignments', () => {
      // All these keys should be invalidated by queryKeys.assignments.all
      const listKey = queryKeys.assignments.list({}, 'RVNO')
      const detailKey = queryKeys.assignments.detail('123')

      expect(listKey[0]).toBe(queryKeys.assignments.all[0])
      expect(detailKey[0]).toBe(queryKeys.assignments.all[0])
    })

    it('should support invalidating only assignment lists', () => {
      // List key should start with lists() prefix
      const listsPrefix = queryKeys.assignments.lists()
      const listKey = queryKeys.assignments.list({}, null)

      expect(listKey.slice(0, 2)).toEqual(listsPrefix)
    })

    it('should not invalidate details when invalidating lists', () => {
      const listsPrefix = queryKeys.assignments.lists()
      const detailKey = queryKeys.assignments.detail('123')

      // Detail key should NOT start with lists prefix
      expect(detailKey.slice(0, 2)).not.toEqual(listsPrefix)
    })
  })
})

describe('SearchConfiguration', () => {
  it('should accept all optional fields', () => {
    const config: SearchConfiguration = {
      fromDate: '2024-01-01',
      toDate: '2024-12-31',
      status: 'pending',
      sortField: 'date',
      sortDirection: 'desc',
      limit: 100,
      offset: 50,
    }

    // Should compile without errors
    expect(config).toBeDefined()
  })

  it('should accept empty config', () => {
    const config: SearchConfiguration = {}
    expect(config).toEqual({})
  })
})

describe('PersonSearchFilter', () => {
  it('should accept all optional fields', () => {
    const filter: PersonSearchFilter = {
      searchTerm: 'test',
      firstName: 'John',
      lastName: 'Doe',
      associationId: 1,
    }

    expect(filter).toBeDefined()
  })

  it('should accept empty filter', () => {
    const filter: PersonSearchFilter = {}
    expect(filter).toEqual({})
  })
})
