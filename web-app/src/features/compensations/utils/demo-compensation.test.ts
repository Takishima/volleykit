import { describe, it, expect } from 'vitest'

import {
  COMPENSATION_RATES,
  TRAVEL_EXPENSE_RATE_PER_KM,
  SAMPLE_DISTANCES,
  calculateTravelExpenses,
  formatCurrency,
  calculateTotalCost,
  getCompensationForPosition,
  createCompensationData,
  type RefereePosition,
} from './demo-compensation'

describe('demo-compensation utilities', () => {
  describe('constants', () => {
    it('TRAVEL_EXPENSE_RATE_PER_KM is 0.7 CHF', () => {
      expect(TRAVEL_EXPENSE_RATE_PER_KM).toBe(0.7)
    })

    it('COMPENSATION_RATES has SV and REGIONAL tiers', () => {
      expect(COMPENSATION_RATES).toHaveProperty('SV')
      expect(COMPENSATION_RATES).toHaveProperty('REGIONAL')
    })

    it('SV rates are higher than REGIONAL rates', () => {
      expect(COMPENSATION_RATES.SV.HEAD_REFEREE).toBeGreaterThan(
        COMPENSATION_RATES.REGIONAL.HEAD_REFEREE
      )
      expect(COMPENSATION_RATES.SV.SECOND_HEAD_REFEREE).toBeGreaterThan(
        COMPENSATION_RATES.REGIONAL.SECOND_HEAD_REFEREE
      )
      expect(COMPENSATION_RATES.SV.LINESMAN).toBeGreaterThan(COMPENSATION_RATES.REGIONAL.LINESMAN)
      expect(COMPENSATION_RATES.SV.SECOND_LINESMAN).toBeGreaterThan(
        COMPENSATION_RATES.REGIONAL.SECOND_LINESMAN
      )
    })

    it('SAMPLE_DISTANCES has expected distance categories', () => {
      expect(SAMPLE_DISTANCES.SHORT).toBe(24000)
      expect(SAMPLE_DISTANCES.MEDIUM).toBe(35000)
      expect(SAMPLE_DISTANCES.MEDIUM_LONG).toBe(48000)
      expect(SAMPLE_DISTANCES.LONG).toBe(62000)
      expect(SAMPLE_DISTANCES.VERY_LONG).toBe(89000)
    })
  })

  describe('calculateTravelExpenses', () => {
    it('calculates travel expenses based on distance', () => {
      // 48km * 0.7 CHF/km = 33.6 CHF
      expect(calculateTravelExpenses(48000)).toBe(33.6)
    })

    it('handles zero distance', () => {
      expect(calculateTravelExpenses(0)).toBe(0)
    })

    it('rounds to two decimal places', () => {
      // 24km * 0.7 = 16.8
      expect(calculateTravelExpenses(24000)).toBe(16.8)
      // 35km * 0.7 = 24.5
      expect(calculateTravelExpenses(35000)).toBe(24.5)
    })

    it('handles sample distances correctly', () => {
      // SHORT: 24km * 0.7 = 16.8
      expect(calculateTravelExpenses(SAMPLE_DISTANCES.SHORT)).toBe(16.8)
      // MEDIUM: 35km * 0.7 = 24.5
      expect(calculateTravelExpenses(SAMPLE_DISTANCES.MEDIUM)).toBe(24.5)
      // MEDIUM_LONG: 48km * 0.7 = 33.6
      expect(calculateTravelExpenses(SAMPLE_DISTANCES.MEDIUM_LONG)).toBe(33.6)
      // LONG: 62km * 0.7 = 43.4
      expect(calculateTravelExpenses(SAMPLE_DISTANCES.LONG)).toBe(43.4)
      // VERY_LONG: 89km * 0.7 = 62.3
      expect(calculateTravelExpenses(SAMPLE_DISTANCES.VERY_LONG)).toBe(62.3)
    })
  })

  describe('formatCurrency', () => {
    it('formats integers with two decimal places', () => {
      expect(formatCurrency(100)).toBe('100.00')
      expect(formatCurrency(60)).toBe('60.00')
    })

    it('formats decimal values with two decimal places', () => {
      expect(formatCurrency(33.6)).toBe('33.60')
      expect(formatCurrency(16.8)).toBe('16.80')
    })

    it('rounds values to two decimal places', () => {
      // Note: toFixed uses banker's rounding (round half to even)
      expect(formatCurrency(33.606)).toBe('33.61') // rounds up
      expect(formatCurrency(33.604)).toBe('33.60') // rounds down
    })

    it('handles zero', () => {
      expect(formatCurrency(0)).toBe('0.00')
    })
  })

  describe('calculateTotalCost', () => {
    it('returns formatted sum of game compensation and travel expenses', () => {
      expect(calculateTotalCost(100, 33.6)).toBe('133.60')
      expect(calculateTotalCost(60, 16.8)).toBe('76.80')
    })

    it('handles zero travel expenses', () => {
      expect(calculateTotalCost(100, 0)).toBe('100.00')
    })

    it('handles zero game compensation', () => {
      expect(calculateTotalCost(0, 33.6)).toBe('33.60')
    })

    it('handles both zero', () => {
      expect(calculateTotalCost(0, 0)).toBe('0.00')
    })
  })

  describe('getCompensationForPosition', () => {
    describe('SV (national) rates', () => {
      it('returns HEAD_REFEREE rate for head-one', () => {
        expect(getCompensationForPosition('head-one', true)).toBe(
          COMPENSATION_RATES.SV.HEAD_REFEREE
        )
      })

      it('returns SECOND_HEAD_REFEREE rate for head-two', () => {
        expect(getCompensationForPosition('head-two', true)).toBe(
          COMPENSATION_RATES.SV.SECOND_HEAD_REFEREE
        )
      })

      it('returns LINESMAN rate for linesman-one', () => {
        expect(getCompensationForPosition('linesman-one', true)).toBe(
          COMPENSATION_RATES.SV.LINESMAN
        )
      })

      it('returns SECOND_LINESMAN rate for linesman-two', () => {
        expect(getCompensationForPosition('linesman-two', true)).toBe(
          COMPENSATION_RATES.SV.SECOND_LINESMAN
        )
      })
    })

    describe('REGIONAL rates', () => {
      it('returns HEAD_REFEREE rate for head-one', () => {
        expect(getCompensationForPosition('head-one', false)).toBe(
          COMPENSATION_RATES.REGIONAL.HEAD_REFEREE
        )
      })

      it('returns SECOND_HEAD_REFEREE rate for head-two', () => {
        expect(getCompensationForPosition('head-two', false)).toBe(
          COMPENSATION_RATES.REGIONAL.SECOND_HEAD_REFEREE
        )
      })

      it('returns LINESMAN rate for linesman-one', () => {
        expect(getCompensationForPosition('linesman-one', false)).toBe(
          COMPENSATION_RATES.REGIONAL.LINESMAN
        )
      })

      it('returns SECOND_LINESMAN rate for linesman-two', () => {
        expect(getCompensationForPosition('linesman-two', false)).toBe(
          COMPENSATION_RATES.REGIONAL.SECOND_LINESMAN
        )
      })
    })
  })

  describe('createCompensationData', () => {
    const baseParams = {
      position: 'head-one' as RefereePosition,
      distanceInMetres: 48000,
      isSV: true,
      paymentDone: false,
    }

    it('calculates game compensation based on position and tier', () => {
      const result = createCompensationData(baseParams)
      expect(result.gameCompensation).toBe(COMPENSATION_RATES.SV.HEAD_REFEREE)
      expect(result.gameCompensationFormatted).toBe('100.00')
    })

    it('calculates travel expenses based on distance', () => {
      const result = createCompensationData(baseParams)
      expect(result.travelExpenses).toBe(33.6) // 48km * 0.7
      expect(result.travelExpensesFormatted).toBe('33.60')
    })

    it('calculates total cost correctly', () => {
      const result = createCompensationData(baseParams)
      // 100 + 33.6 = 133.6
      expect(result.costFormatted).toBe('133.60')
    })

    it('formats distance in kilometres', () => {
      const result = createCompensationData(baseParams)
      expect(result.distanceFormatted).toBe('48.0')
    })

    it('includes distance in metres', () => {
      const result = createCompensationData(baseParams)
      expect(result.distanceInMetres).toBe(48000)
    })

    it('defaults to car transportation mode', () => {
      const result = createCompensationData(baseParams)
      expect(result.transportationMode).toBe('car')
    })

    it('allows train transportation mode', () => {
      const result = createCompensationData({
        ...baseParams,
        transportationMode: 'train',
      })
      expect(result.transportationMode).toBe('train')
    })

    it('tracks payment status', () => {
      const unpaid = createCompensationData({ ...baseParams, paymentDone: false })
      expect(unpaid.paymentDone).toBe(false)

      const paid = createCompensationData({
        ...baseParams,
        paymentDone: true,
        paymentValueDate: '2024-01-15',
      })
      expect(paid.paymentDone).toBe(true)
    })

    it('includes payment value date when payment is done', () => {
      const result = createCompensationData({
        ...baseParams,
        paymentDone: true,
        paymentValueDate: '2024-01-15',
      })
      expect(result.paymentValueDate).toBe('2024-01-15')
    })

    it('omits payment value date when payment is not done', () => {
      const result = createCompensationData({
        ...baseParams,
        paymentDone: false,
        paymentValueDate: '2024-01-15',
      })
      expect(result).not.toHaveProperty('paymentValueDate')
    })

    it('includes correction reason when provided', () => {
      const result = createCompensationData({
        ...baseParams,
        correctionReason: 'Distance correction',
      })
      expect(result.correctionReason).toBe('Distance correction')
    })

    it('defaults correction reason to null', () => {
      const result = createCompensationData(baseParams)
      expect(result.correctionReason).toBeNull()
    })

    it('sets flexible expenses flags correctly for SV', () => {
      const result = createCompensationData({ ...baseParams, isSV: true })
      expect(result.hasFlexibleGameCompensations).toBe(false)
      expect(result.hasFlexibleTravelExpenses).toBe(true)
      expect(result.hasFlexibleOvernightStayExpenses).toBe(false)
      expect(result.hasFlexibleCateringExpenses).toBe(false)
    })

    it('sets flexible expenses flags correctly for regional', () => {
      const result = createCompensationData({ ...baseParams, isSV: false })
      expect(result.hasFlexibleTravelExpenses).toBe(false)
    })

    it('includes zero overnight and catering expenses', () => {
      const result = createCompensationData(baseParams)
      expect(result.overnightStayExpensesFormatted).toBe('0.00')
      expect(result.cateringExpensesFormatted).toBe('0.00')
    })

    describe('lock flags', () => {
      it('sets lockPayoutOnSiteCompensation based on parameter', () => {
        const unlocked = createCompensationData({
          ...baseParams,
          lockPayoutOnSiteCompensation: false,
        })
        expect(unlocked.lockPayoutOnSiteCompensation).toBe(false)

        const locked = createCompensationData({
          ...baseParams,
          lockPayoutOnSiteCompensation: true,
        })
        expect(locked.lockPayoutOnSiteCompensation).toBe(true)
      })

      it('locks central payout when payment is done', () => {
        const unpaid = createCompensationData({ ...baseParams, paymentDone: false })
        expect(unpaid.lockPayoutCentralPayoutCompensation).toBe(false)

        const paid = createCompensationData({
          ...baseParams,
          paymentDone: true,
          paymentValueDate: '2024-01-15',
        })
        expect(paid.lockPayoutCentralPayoutCompensation).toBe(true)
      })
    })

    describe('disbursement methods', () => {
      it('defaults to central_payout', () => {
        const result = createCompensationData(baseParams)
        expect(result.methodOfDisbursementArbitration).toBe('central_payout')
        expect(result.methodOfDisbursementTravelCompensation).toBe('central_payout')
      })

      it('allows payout_on_site', () => {
        const result = createCompensationData({
          ...baseParams,
          methodOfDisbursement: 'payout_on_site',
        })
        expect(result.methodOfDisbursementArbitration).toBe('payout_on_site')
        expect(result.methodOfDisbursementTravelCompensation).toBe('payout_on_site')
      })
    })

    describe('different positions', () => {
      it('calculates correctly for head-two (SV)', () => {
        const result = createCompensationData({
          ...baseParams,
          position: 'head-two',
        })
        expect(result.gameCompensation).toBe(80)
        expect(result.costFormatted).toBe('113.60') // 80 + 33.6
      })

      it('calculates correctly for linesman-one (regional)', () => {
        const result = createCompensationData({
          ...baseParams,
          position: 'linesman-one',
          isSV: false,
        })
        expect(result.gameCompensation).toBe(40)
        expect(result.costFormatted).toBe('73.60') // 40 + 33.6
      })

      it('calculates correctly for linesman-two (regional)', () => {
        const result = createCompensationData({
          ...baseParams,
          position: 'linesman-two',
          isSV: false,
        })
        expect(result.gameCompensation).toBe(30)
        expect(result.costFormatted).toBe('63.60') // 30 + 33.6
      })
    })
  })
})
