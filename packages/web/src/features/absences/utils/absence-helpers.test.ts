import { describe, it, expect } from 'vitest'

import { groupAbsences, isAbsenceReadOnly, isSingleDayAbsence } from './absence-helpers'

import type { RefereeAbsence } from '@/api/client'

function createAbsence(overrides: Partial<RefereeAbsence> = {}): RefereeAbsence {
  return {
    __identity: '11111111-1111-4111-8111-111111111111',
    fromDate: '2027-02-27T05:00:00.000000+00:00',
    toDate: '2027-03-07T22:59:59.000000+00:00',
    detailedReason: 'Vacation',
    _permissions: {
      object: { delete: true, update: true, create: true },
    },
    ...overrides,
  }
}

describe('isAbsenceReadOnly', () => {
  it('returns false for an editable own absence', () => {
    expect(isAbsenceReadOnly(createAbsence())).toBe(false)
  })

  it('returns true for an association-imposed blocking (all permissions false)', () => {
    const absence = createAbsence({
      _permissions: { object: { delete: false, update: false, create: false } },
    })
    expect(isAbsenceReadOnly(absence)).toBe(true)
  })

  it('returns false when permissions are missing entirely', () => {
    const absence = createAbsence({ _permissions: undefined })
    expect(isAbsenceReadOnly(absence)).toBe(false)
  })

  it('returns false when only delete is allowed', () => {
    const absence = createAbsence({
      _permissions: { object: { delete: true, update: false, create: false } },
    })
    expect(isAbsenceReadOnly(absence)).toBe(false)
  })
})

describe('groupAbsences', () => {
  const now = new Date('2026-12-01T12:00:00.000Z')

  it('splits absences into upcoming and past by end date', () => {
    const past = createAbsence({
      __identity: '22222222-2222-4222-8222-222222222222',
      fromDate: '2026-11-07T05:00:00.000000+00:00',
      toDate: '2026-11-07T22:59:59.000000+00:00',
    })
    const upcoming = createAbsence({
      __identity: '33333333-3333-4333-8333-333333333333',
      fromDate: '2027-01-14T05:00:00.000000+00:00',
      toDate: '2027-01-17T22:59:59.000000+00:00',
    })

    const grouped = groupAbsences([upcoming, past], now)

    expect(grouped.upcoming).toEqual([upcoming])
    expect(grouped.past).toEqual([past])
  })

  it('keeps a currently running absence in upcoming', () => {
    const running = createAbsence({
      fromDate: '2026-11-29T05:00:00.000000+00:00',
      toDate: '2026-12-05T22:59:59.000000+00:00',
    })

    const grouped = groupAbsences([running], now)

    expect(grouped.upcoming).toEqual([running])
    expect(grouped.past).toEqual([])
  })

  it('sorts upcoming ascending and past descending by start date', () => {
    const farFuture = createAbsence({
      __identity: '44444444-4444-4444-8444-444444444444',
      fromDate: '2027-03-06T05:00:00.000000+00:00',
      toDate: '2027-03-06T22:59:00.000000+00:00',
    })
    const nearFuture = createAbsence({
      __identity: '55555555-5555-4555-8555-555555555555',
      fromDate: '2027-01-02T05:00:00.000000+00:00',
      toDate: '2027-01-02T22:59:59.000000+00:00',
    })
    const olderPast = createAbsence({
      __identity: '66666666-6666-4666-8666-666666666666',
      fromDate: '2026-09-19T04:00:00.000000+00:00',
      toDate: '2026-09-19T21:59:59.000000+00:00',
    })
    const newerPast = createAbsence({
      __identity: '77777777-7777-4777-8777-777777777777',
      fromDate: '2026-10-30T05:00:00.000000+00:00',
      toDate: '2026-10-30T22:59:59.000000+00:00',
    })

    const grouped = groupAbsences([farFuture, olderPast, nearFuture, newerPast], now)

    expect(grouped.upcoming.map((a) => a.__identity)).toEqual([
      nearFuture.__identity,
      farFuture.__identity,
    ])
    expect(grouped.past.map((a) => a.__identity)).toEqual([
      newerPast.__identity,
      olderPast.__identity,
    ])
  })

  it('compares mixed UTC offsets chronologically, not lexically', () => {
    // Synthetic payload: captured API responses all use +00:00, but the
    // Date-based comparison stays correct for any RFC3339 offset.
    // '2027-01-10T06:00:00+05:00' is 01:00Z — chronologically before
    // '2027-01-10T04:00:00.000000+00:00', though a string comparison would
    // order it after.
    const laterInstant = createAbsence({
      __identity: '88888888-8888-4888-8888-888888888888',
      fromDate: '2027-01-10T04:00:00.000000+00:00',
      toDate: '2027-01-10T21:59:59.000000+00:00',
    })
    const earlierInstant = createAbsence({
      __identity: '99999999-9999-4999-8999-999999999999',
      fromDate: '2027-01-10T06:00:00+05:00',
      toDate: '2027-01-10T23:59:59+05:00',
    })

    const grouped = groupAbsences([laterInstant, earlierInstant], now)

    expect(grouped.upcoming.map((a) => a.__identity)).toEqual([
      earlierInstant.__identity,
      laterInstant.__identity,
    ])
  })
})

describe('isSingleDayAbsence', () => {
  it('treats a full local day (05:00Z-22:59Z) as a single day', () => {
    expect(
      isSingleDayAbsence(
        new Date('2027-01-02T05:00:00.000000+00:00'),
        new Date('2027-01-02T22:59:59.000000+00:00')
      )
    ).toBe(true)
  })

  it('treats a multi-day span as not single-day', () => {
    expect(
      isSingleDayAbsence(
        new Date('2027-01-14T05:00:00.000000+00:00'),
        new Date('2027-01-17T22:59:59.000000+00:00')
      )
    ).toBe(false)
  })

  it('treats consecutive full days as not single-day', () => {
    expect(
      isSingleDayAbsence(
        new Date('2026-11-21T05:00:00.000000+00:00'),
        new Date('2026-11-22T22:59:59.000000+00:00')
      )
    ).toBe(false)
  })
})
