import { describe, it, expect } from 'vitest'

import {
  resolveMaxDistanceKm,
  resolveMaxTravelTimeMinutes,
  resolveTransportEnabled,
} from './per-association'
import { DEFAULT_MODE_SETTINGS } from './types'

const GLOBAL_DISTANCE = { enabled: true, maxDistanceKm: 50 }
const SV_DISTANCE = { enabled: true, maxDistanceKm: 20 }

describe('resolveMaxDistanceKm', () => {
  it('returns the association override when one exists', () => {
    expect(resolveMaxDistanceKm(GLOBAL_DISTANCE, { SV: SV_DISTANCE }, 'SV')).toBe(20)
  })

  it('falls back to the global limit for other associations', () => {
    expect(resolveMaxDistanceKm(GLOBAL_DISTANCE, { SV: SV_DISTANCE }, 'SVRZ')).toBe(50)
  })

  it('falls back to the global limit without an association or map', () => {
    expect(resolveMaxDistanceKm(GLOBAL_DISTANCE, { SV: SV_DISTANCE }, undefined)).toBe(50)
    expect(resolveMaxDistanceKm(GLOBAL_DISTANCE, undefined, 'SV')).toBe(50)
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
