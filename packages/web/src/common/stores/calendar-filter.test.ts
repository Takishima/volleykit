import { describe, it, expect, beforeEach } from 'vitest'

import { useCalendarFilterStore, ALL_ASSOCIATIONS } from './calendar-filter'

describe('useCalendarFilterStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCalendarFilterStore.setState({
      selectedAssociation: ALL_ASSOCIATIONS,
      associations: [],
    })
  })

  describe('initial state', () => {
    it('starts with ALL_ASSOCIATIONS as selected', () => {
      const { selectedAssociation } = useCalendarFilterStore.getState()
      expect(selectedAssociation).toBe(ALL_ASSOCIATIONS)
    })

    it('starts with empty associations array', () => {
      const { associations } = useCalendarFilterStore.getState()
      expect(associations).toEqual([])
    })
  })

  describe('setSelectedAssociation', () => {
    it('updates the selected association', () => {
      const { setSelectedAssociation } = useCalendarFilterStore.getState()

      setSelectedAssociation('SV')

      const { selectedAssociation } = useCalendarFilterStore.getState()
      expect(selectedAssociation).toBe('SV')
    })

    it('can set to ALL_ASSOCIATIONS constant', () => {
      const { setSelectedAssociation } = useCalendarFilterStore.getState()

      // First set to a specific association
      setSelectedAssociation('SVRZ')
      expect(useCalendarFilterStore.getState().selectedAssociation).toBe('SVRZ')

      // Then set back to ALL
      setSelectedAssociation(ALL_ASSOCIATIONS)
      expect(useCalendarFilterStore.getState().selectedAssociation).toBe(ALL_ASSOCIATIONS)
    })

    it('accepts any string value', () => {
      const { setSelectedAssociation } = useCalendarFilterStore.getState()

      setSelectedAssociation('SVRBA')

      const { selectedAssociation } = useCalendarFilterStore.getState()
      expect(selectedAssociation).toBe('SVRBA')
    })
  })

  describe('setAssociations', () => {
    it('sets the list of available associations', () => {
      const { setAssociations } = useCalendarFilterStore.getState()

      setAssociations(['SV', 'SVRZ', 'SVRBA'])

      const { associations } = useCalendarFilterStore.getState()
      expect(associations).toEqual(['SV', 'SVRZ', 'SVRBA'])
    })

    it('can be set to empty array', () => {
      const { setAssociations } = useCalendarFilterStore.getState()

      // First set some associations
      setAssociations(['SV', 'SVRZ'])
      expect(useCalendarFilterStore.getState().associations).toHaveLength(2)

      // Then clear them
      setAssociations([])
      expect(useCalendarFilterStore.getState().associations).toEqual([])
    })

    it('replaces existing associations', () => {
      const { setAssociations } = useCalendarFilterStore.getState()

      setAssociations(['SV', 'SVRZ'])
      setAssociations(['SVRBA'])

      const { associations } = useCalendarFilterStore.getState()
      expect(associations).toEqual(['SVRBA'])
    })
  })

  describe('resetFilter', () => {
    it('resets selected association to ALL_ASSOCIATIONS', () => {
      const { setSelectedAssociation, resetFilter } = useCalendarFilterStore.getState()

      // Set a specific association
      setSelectedAssociation('SV')
      expect(useCalendarFilterStore.getState().selectedAssociation).toBe('SV')

      // Reset the filter
      resetFilter()

      const { selectedAssociation } = useCalendarFilterStore.getState()
      expect(selectedAssociation).toBe(ALL_ASSOCIATIONS)
    })

    it('preserves the associations list', () => {
      const { setSelectedAssociation, setAssociations, resetFilter } =
        useCalendarFilterStore.getState()

      // Set up initial state
      setAssociations(['SV', 'SVRZ', 'SVRBA'])
      setSelectedAssociation('SVRZ')

      // Reset the filter
      resetFilter()

      // Associations should be preserved
      const { associations } = useCalendarFilterStore.getState()
      expect(associations).toEqual(['SV', 'SVRZ', 'SVRBA'])
    })

    it('works when already at ALL_ASSOCIATIONS', () => {
      const { resetFilter } = useCalendarFilterStore.getState()

      // Should not throw when already at default
      resetFilter()

      const { selectedAssociation } = useCalendarFilterStore.getState()
      expect(selectedAssociation).toBe(ALL_ASSOCIATIONS)
    })
  })

  describe('ALL_ASSOCIATIONS constant', () => {
    it('is exported as __all__', () => {
      expect(ALL_ASSOCIATIONS).toBe('__all__')
    })
  })
})
