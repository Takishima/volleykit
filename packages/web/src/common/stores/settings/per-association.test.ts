import { describe, it, expect } from 'vitest'

import {
  resolveDistanceFilter,
  resolveMaxTravelTimeMinutes,
  resolveTransportEnabled,
} from './per-association'
import { DEFAULT_MODE_SETTINGS } from './types'

const GLOBAL_DISTANCE = { enabled: true, maxDistanceKm: 50 }
const SV_DISTANCE = { enabled: true, maxDistanceKm: 20 }

describe('resolveDistanceFilter', () => {
  it('returns the association override when one exists', () => {
    expect(resolveDistanceFilter(GLOBAL_DISTANCE, { SV: SV_DISTANCE }, 'SV')).toBe(SV_DISTANCE)
  })

  it('falls back to the global filter for other associations', () => {
    expect(resolveDistanceFilter(GLOBAL_DISTANCE, { SV: SV_DISTANCE }, 'SVRZ')).toBe(
      GLOBAL_DISTANCE
    )
  })

  it('falls back to the global filter without an association or map', () => {
    expect(resolveDistanceFilter(GLOBAL_DISTANCE, { SV: SV_DISTANCE }, undefined)).toBe(
      GLOBAL_DISTANCE
    )
    expect(resolveDistanceFilter(GLOBAL_DISTANCE, undefined, 'SV')).toBe(GLOBAL_DISTANCE)
  })
})

describe('resolveMaxTravelTimeMinutes', () => {
  const filter = {
    ...DEFAULT_MODE_SETTINGS.travelTimeFilter,
    maxTravelTimeMinutes: 120,
    maxTravelTimeByAssociation: { SV: 45 },
  }

  it('returns the association override when one exists', () => {
    expect(resolveMaxTravelTimeMinutes(filter, 'SV')).toBe(45)
  })

  it('falls back to the global value otherwise', () => {
    expect(resolveMaxTravelTimeMinutes(filter, 'SVRZ')).toBe(120)
    expect(resolveMaxTravelTimeMinutes(filter, undefined)).toBe(120)
  })
})

describe('resolveTransportEnabled', () => {
  it('prefers the association override, including an explicit false', () => {
    expect(resolveTransportEnabled(true, { SV: false }, 'SV')).toBe(false)
    expect(resolveTransportEnabled(false, { SV: true }, 'SV')).toBe(true)
  })

  it('falls back to the global value otherwise', () => {
    expect(resolveTransportEnabled(true, { SV: false }, 'SVRZ')).toBe(true)
    expect(resolveTransportEnabled(false, undefined, 'SV')).toBe(false)
  })
})
