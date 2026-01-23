/**
 * Tests for geographic utility functions
 */

import { describe, it, expect } from 'vitest'
import { haversineDistance, isWithinDistance, VENUE_PROXIMITY_THRESHOLD_METERS } from './geo'

describe('haversineDistance', () => {
  it('should return 0 for identical points', () => {
    const point = { lat: 47.3769, lng: 8.5417 } // Zurich
    expect(haversineDistance(point, point)).toBe(0)
  })

  it('should calculate distance between Zurich and Bern correctly', () => {
    const zurich = { lat: 47.3769, lng: 8.5417 }
    const bern = { lat: 46.9481, lng: 7.4474 }

    const distance = haversineDistance(zurich, bern)

    // Distance is approximately 95 km (95000 meters)
    expect(distance).toBeGreaterThan(90000)
    expect(distance).toBeLessThan(100000)
  })

  it('should calculate short distances accurately', () => {
    // Two points approximately 100 meters apart in Zurich
    const point1 = { lat: 47.3769, lng: 8.5417 }
    const point2 = { lat: 47.3778, lng: 8.5417 } // ~100m north

    const distance = haversineDistance(point1, point2)

    expect(distance).toBeGreaterThan(90)
    expect(distance).toBeLessThan(110)
  })

  it('should handle points at different longitudes', () => {
    // Two points at same latitude, different longitude
    const point1 = { lat: 47.3769, lng: 8.5417 }
    const point2 = { lat: 47.3769, lng: 8.5517 } // ~0.01 deg east

    const distance = haversineDistance(point1, point2)

    // At this latitude, 0.01 degrees longitude ≈ 700-750 meters
    expect(distance).toBeGreaterThan(700)
    expect(distance).toBeLessThan(800)
  })

  it('should handle negative coordinates', () => {
    // Sydney, Australia (negative lat)
    const sydney = { lat: -33.8688, lng: 151.2093 }
    // Auckland, New Zealand
    const auckland = { lat: -36.8509, lng: 174.7645 }

    const distance = haversineDistance(sydney, auckland)

    // Distance is approximately 2150 km
    expect(distance).toBeGreaterThan(2100000)
    expect(distance).toBeLessThan(2200000)
  })

  it('should handle crossing the prime meridian', () => {
    // London (west of prime meridian)
    const london = { lat: 51.5074, lng: -0.1278 }
    // Paris
    const paris = { lat: 48.8566, lng: 2.3522 }

    const distance = haversineDistance(london, paris)

    // Distance is approximately 340 km
    expect(distance).toBeGreaterThan(330000)
    expect(distance).toBeLessThan(350000)
  })

  it('should be symmetric (a to b equals b to a)', () => {
    const zurich = { lat: 47.3769, lng: 8.5417 }
    const geneva = { lat: 46.2044, lng: 6.1432 }

    const distanceAB = haversineDistance(zurich, geneva)
    const distanceBA = haversineDistance(geneva, zurich)

    expect(distanceAB).toBeCloseTo(distanceBA, 10)
  })
})

describe('isWithinDistance', () => {
  it('should return true for points within threshold', () => {
    // Two points ~100m apart
    const point1 = { lat: 47.3769, lng: 8.5417 }
    const point2 = { lat: 47.3778, lng: 8.5417 }

    expect(isWithinDistance(point1, point2, 200)).toBe(true)
  })

  it('should return false for points outside threshold', () => {
    // Zurich and Bern are ~95km apart
    const zurich = { lat: 47.3769, lng: 8.5417 }
    const bern = { lat: 46.9481, lng: 7.4474 }

    expect(isWithinDistance(zurich, bern, 1000)).toBe(false)
  })

  it('should return true for identical points', () => {
    const point = { lat: 47.3769, lng: 8.5417 }
    expect(isWithinDistance(point, point, 0)).toBe(true)
  })

  it('should use default threshold of 500m', () => {
    // Points ~400m apart (within default threshold)
    const point1 = { lat: 47.3769, lng: 8.5417 }
    const point2 = { lat: 47.3805, lng: 8.5417 } // ~400m north

    expect(isWithinDistance(point1, point2)).toBe(true)

    // Points ~600m apart (outside default threshold)
    const point3 = { lat: 47.3823, lng: 8.5417 } // ~600m north

    expect(isWithinDistance(point1, point3)).toBe(false)
  })

  it('should handle edge case at exact threshold', () => {
    // Create points exactly at threshold
    const point1 = { lat: 47.0, lng: 8.0 }
    const distance = haversineDistance(point1, { lat: 47.0045, lng: 8.0 }) // ~500m

    // Should include points at exactly the threshold
    expect(isWithinDistance(point1, { lat: 47.0045, lng: 8.0 }, Math.ceil(distance))).toBe(true)
  })
})

describe('VENUE_PROXIMITY_THRESHOLD_METERS', () => {
  it('should be 500 meters per spec FR-024', () => {
    expect(VENUE_PROXIMITY_THRESHOLD_METERS).toBe(500)
  })
})
