import { describe, it, expect, beforeEach } from 'vitest'

import { useDemoStore } from './demo'

describe('useDemoStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDemoStore.setState({
      assignments: [],
      compensations: [],
      exchanges: [],
    })
  })

  describe('initial state', () => {
    it('starts with empty data arrays', () => {
      const state = useDemoStore.getState()
      expect(state.assignments).toHaveLength(0)
      expect(state.compensations).toHaveLength(0)
      expect(state.exchanges).toHaveLength(0)
    })
  })

  describe('initializeDemoData', () => {
    it('populates demo data arrays', () => {
      // Before initializing, data should be empty
      expect(useDemoStore.getState().assignments).toHaveLength(0)

      // Initialize demo data
      useDemoStore.getState().initializeDemoData()

      // After initializing, data should be populated
      const state = useDemoStore.getState()
      expect(state.assignments.length).toBeGreaterThan(0)
      expect(state.compensations.length).toBeGreaterThan(0)
      expect(state.exchanges.length).toBeGreaterThan(0)
    })

    it('generates valid assignment data', () => {
      useDemoStore.getState().initializeDemoData()

      const { assignments } = useDemoStore.getState()
      expect(assignments.length).toBeGreaterThan(0)

      const firstAssignment = assignments[0]
      expect(firstAssignment).toHaveProperty('__identity')
      expect(firstAssignment).toHaveProperty('refereeConvocationStatus')
      expect(firstAssignment).toHaveProperty('refereePosition')
      expect(firstAssignment).toHaveProperty('refereeGame')
    })

    it('generates valid compensation data', () => {
      useDemoStore.getState().initializeDemoData()

      const { compensations } = useDemoStore.getState()
      expect(compensations.length).toBeGreaterThan(0)

      const firstCompensation = compensations[0]!
      expect(firstCompensation).toHaveProperty('__identity')
      expect(firstCompensation).toHaveProperty('convocationCompensation')
      expect(firstCompensation.convocationCompensation).toHaveProperty('gameCompensation')
    })

    it('generates valid exchange data', () => {
      useDemoStore.getState().initializeDemoData()

      const { exchanges } = useDemoStore.getState()
      expect(exchanges.length).toBeGreaterThan(0)

      const firstExchange = exchanges[0]
      expect(firstExchange).toHaveProperty('__identity')
      expect(firstExchange).toHaveProperty('status')
      expect(firstExchange).toHaveProperty('refereeGame')
    })
  })

  describe('clearDemoData', () => {
    it('clears all demo data', () => {
      // Initialize and verify data exists
      useDemoStore.getState().initializeDemoData()
      expect(useDemoStore.getState().assignments.length).toBeGreaterThan(0)

      // Clear and verify data is empty
      useDemoStore.getState().clearDemoData()
      const state = useDemoStore.getState()
      expect(state.assignments).toHaveLength(0)
      expect(state.compensations).toHaveLength(0)
      expect(state.exchanges).toHaveLength(0)
    })
  })

  describe('refreshData', () => {
    it('regenerates demo data with fresh dates', () => {
      useDemoStore.getState().initializeDemoData()
      const initialAssignments = useDemoStore.getState().assignments

      // Refresh data
      useDemoStore.getState().refreshData()
      const refreshedAssignments = useDemoStore.getState().assignments

      // Data should be regenerated (same length, but new instances)
      expect(refreshedAssignments.length).toBe(initialAssignments.length)
      // New instances should have new date values
      expect(refreshedAssignments).not.toBe(initialAssignments)
    })
  })

  describe('updateCompensation', () => {
    const TRAVEL_EXPENSE_RATE_PER_KM = 0.7

    // Helper to get convocationCompensation.__identity from store by index (0-based)
    // Note: updateCompensation uses convocationCompensation.__identity, not CompensationRecord.__identity
    const getConvocationCompensationId = (index: number) => {
      const compensations = useDemoStore.getState().compensations
      return compensations[index]?.convocationCompensation?.__identity
    }

    // Helper to find compensation by convocationCompensation.__identity
    const findCompensationById = (convocationCompId: string) => {
      return useDemoStore
        .getState()
        .compensations.find((c) => c.convocationCompensation?.__identity === convocationCompId)
    }

    it('updates distance and recalculates travel expenses', () => {
      useDemoStore.getState().initializeDemoData()
      const compensationId = getConvocationCompensationId(0)
      expect(compensationId).toBeDefined()

      const newDistanceInMetres = 50000
      const expectedTravelExpenses = (newDistanceInMetres / 1000) * TRAVEL_EXPENSE_RATE_PER_KM

      useDemoStore.getState().updateCompensation(compensationId!, {
        distanceInMetres: newDistanceInMetres,
      })

      const updatedComp = findCompensationById(compensationId!)

      expect(updatedComp?.convocationCompensation?.distanceInMetres).toBe(newDistanceInMetres)
      expect(updatedComp?.convocationCompensation?.travelExpenses).toBe(expectedTravelExpenses)
    })

    it('calculates travel expenses at 0.7 CHF per kilometer', () => {
      useDemoStore.getState().initializeDemoData()
      const compensationId = getConvocationCompensationId(1)
      expect(compensationId).toBeDefined()

      const testCases = [
        { distance: 10000, expected: 7.0 },
        { distance: 25000, expected: 17.5 },
        { distance: 100000, expected: 70.0 },
        { distance: 15500, expected: 10.85 },
      ]

      for (const { distance, expected } of testCases) {
        useDemoStore.getState().updateCompensation(compensationId!, {
          distanceInMetres: distance,
        })

        const updatedComp = findCompensationById(compensationId!)

        expect(updatedComp?.convocationCompensation?.travelExpenses).toBe(expected)
      }
    })

    it('does not modify other compensations', () => {
      useDemoStore.getState().initializeDemoData()
      const targetId = getConvocationCompensationId(0)
      const otherId = getConvocationCompensationId(1)
      expect(targetId).toBeDefined()
      expect(otherId).toBeDefined()

      const originalOther = findCompensationById(otherId!)
      const originalDistance = originalOther?.convocationCompensation?.distanceInMetres
      const originalExpenses = originalOther?.convocationCompensation?.travelExpenses

      useDemoStore.getState().updateCompensation(targetId!, {
        distanceInMetres: 99999,
      })

      const unchangedOther = findCompensationById(otherId!)

      expect(unchangedOther?.convocationCompensation?.distanceInMetres).toBe(originalDistance)
      expect(unchangedOther?.convocationCompensation?.travelExpenses).toBe(originalExpenses)
    })

    it('handles non-existent compensation ID gracefully', () => {
      useDemoStore.getState().initializeDemoData()
      const originalCompensations = useDemoStore.getState().compensations

      useDemoStore.getState().updateCompensation('non-existent-id', {
        distanceInMetres: 50000,
      })

      const updatedCompensations = useDemoStore.getState().compensations
      expect(updatedCompensations).toEqual(originalCompensations)
    })

    it('preserves other compensation fields when updating distance', () => {
      useDemoStore.getState().initializeDemoData()
      const compensationId = getConvocationCompensationId(0)
      expect(compensationId).toBeDefined()

      const originalComp = findCompensationById(compensationId!)
      const originalGameCompensation = originalComp?.convocationCompensation?.gameCompensation
      const originalPaymentDone = originalComp?.convocationCompensation?.paymentDone
      const originalTransportationMode = originalComp?.convocationCompensation?.transportationMode

      useDemoStore.getState().updateCompensation(compensationId!, {
        distanceInMetres: 75000,
      })

      const updatedComp = findCompensationById(compensationId!)

      expect(updatedComp?.convocationCompensation?.gameCompensation).toBe(originalGameCompensation)
      expect(updatedComp?.convocationCompensation?.paymentDone).toBe(originalPaymentDone)
      expect(updatedComp?.convocationCompensation?.transportationMode).toBe(
        originalTransportationMode
      )
    })

    it('updates correctionReason and persists it', () => {
      useDemoStore.getState().initializeDemoData()
      const compensationId = getConvocationCompensationId(0)
      expect(compensationId).toBeDefined()

      const testReason = 'Detour due to road construction'

      useDemoStore.getState().updateCompensation(compensationId!, {
        correctionReason: testReason,
      })

      const updatedComp = findCompensationById(compensationId!)
      // Cast to access correctionReason which is in ConvocationCompensationDetailed, not ConvocationCompensation
      const compensation = updatedComp?.convocationCompensation as
        | { correctionReason?: string | null }
        | undefined

      expect(compensation?.correctionReason).toBe(testReason)
    })

    it('updates both distance and correctionReason together', () => {
      useDemoStore.getState().initializeDemoData()
      const compensationId = getConvocationCompensationId(0)
      expect(compensationId).toBeDefined()

      const newDistanceInMetres = 42000
      const testReason = 'Alternative route taken'
      const expectedTravelExpenses = (newDistanceInMetres / 1000) * TRAVEL_EXPENSE_RATE_PER_KM

      useDemoStore.getState().updateCompensation(compensationId!, {
        distanceInMetres: newDistanceInMetres,
        correctionReason: testReason,
      })

      const updatedComp = findCompensationById(compensationId!)
      // Cast to access correctionReason which is in ConvocationCompensationDetailed, not ConvocationCompensation
      const compensation = updatedComp?.convocationCompensation as
        | { correctionReason?: string | null; distanceInMetres?: number; travelExpenses?: number }
        | undefined

      expect(compensation?.distanceInMetres).toBe(newDistanceInMetres)
      expect(compensation?.travelExpenses).toBe(expectedTravelExpenses)
      expect(compensation?.correctionReason).toBe(testReason)
    })
  })
})
