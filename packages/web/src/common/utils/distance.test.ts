import { describe, it, expect } from 'vitest'

import {
  METRES_PER_KILOMETRE,
  DISTANCE_DISPLAY_PRECISION,
  DECIMAL_INPUT_PATTERN,
  ROAD_DISTANCE_MULTIPLIER,
  metresToKilometres,
  kilometresToMetres,
  formatDistanceKm,
  parseLocalizedNumber,
  calculateHaversineDistance,
  calculateDistanceKm,
  calculateCarDistanceKm,
  type Coordinates,
} from './distance'

describe('distance utilities', () => {
  describe('constants', () => {
    it('METRES_PER_KILOMETRE is 1000', () => {
      expect(METRES_PER_KILOMETRE).toBe(1000)
    })

    it('DISTANCE_DISPLAY_PRECISION is 1', () => {
      expect(DISTANCE_DISPLAY_PRECISION).toBe(1)
    })

    it('DECIMAL_INPUT_PATTERN accepts period or comma as decimal separator', () => {
      expect(DECIMAL_INPUT_PATTERN).toBe('[0-9]*[.,]?[0-9]*')
    })

    it('ROAD_DISTANCE_MULTIPLIER is 1.33', () => {
      expect(ROAD_DISTANCE_MULTIPLIER).toBe(1.33)
    })
  })

  describe('metresToKilometres', () => {
    it('converts metres to kilometres', () => {
      expect(metresToKilometres(1000)).toBe(1)
      expect(metresToKilometres(48000)).toBe(48)
      expect(metresToKilometres(500)).toBe(0.5)
    })

    it('handles zero', () => {
      expect(metresToKilometres(0)).toBe(0)
    })

    it('handles decimal values', () => {
      expect(metresToKilometres(1500)).toBe(1.5)
      expect(metresToKilometres(48317)).toBe(48.317)
    })
  })

  describe('kilometresToMetres', () => {
    it('converts kilometres to metres', () => {
      expect(kilometresToMetres(1)).toBe(1000)
      expect(kilometresToMetres(48)).toBe(48000)
      expect(kilometresToMetres(0.5)).toBe(500)
    })

    it('handles zero', () => {
      expect(kilometresToMetres(0)).toBe(0)
    })

    it('handles decimal values', () => {
      expect(kilometresToMetres(1.5)).toBe(1500)
      expect(kilometresToMetres(48.3)).toBe(48300)
    })
  })

  describe('formatDistanceKm', () => {
    it('formats distance with one decimal place', () => {
      expect(formatDistanceKm(48000)).toBe('48.0')
      expect(formatDistanceKm(48500)).toBe('48.5')
      expect(formatDistanceKm(48317)).toBe('48.3')
    })

    it('rounds to one decimal place', () => {
      expect(formatDistanceKm(48350)).toBe('48.4') // rounds up
      expect(formatDistanceKm(48340)).toBe('48.3') // rounds down
    })

    it('handles zero', () => {
      expect(formatDistanceKm(0)).toBe('0.0')
    })

    it('handles small distances', () => {
      expect(formatDistanceKm(100)).toBe('0.1')
      expect(formatDistanceKm(50)).toBe('0.1') // rounds up
    })
  })

  describe('parseLocalizedNumber', () => {
    it('parses numbers with period as decimal separator', () => {
      expect(parseLocalizedNumber('48.5')).toBe(48.5)
      expect(parseLocalizedNumber('1.0')).toBe(1)
      expect(parseLocalizedNumber('123.456')).toBe(123.456)
    })

    it('parses numbers with comma as decimal separator', () => {
      expect(parseLocalizedNumber('48,5')).toBe(48.5)
      expect(parseLocalizedNumber('1,0')).toBe(1)
      expect(parseLocalizedNumber('123,456')).toBe(123.456)
    })

    it('parses integers without decimal separator', () => {
      expect(parseLocalizedNumber('48')).toBe(48)
      expect(parseLocalizedNumber('0')).toBe(0)
      expect(parseLocalizedNumber('123')).toBe(123)
    })

    it('returns NaN for invalid input', () => {
      expect(parseLocalizedNumber('')).toBeNaN()
      expect(parseLocalizedNumber('abc')).toBeNaN()
    })

    it('parseFloat stops at invalid characters', () => {
      // parseFloat stops at the second period, returning 12.34
      expect(parseLocalizedNumber('12.34.56')).toBe(12.34)
    })
  })

  describe('calculateHaversineDistance', () => {
    // Known Swiss cities for testing
    const zurich: Coordinates = { latitude: 47.3769, longitude: 8.5417 }
    const bern: Coordinates = { latitude: 46.948, longitude: 7.4474 }
    const basel: Coordinates = { latitude: 47.5596, longitude: 7.5886 }
    const geneva: Coordinates = { latitude: 46.2044, longitude: 6.1432 }

    it('calculates distance between Zurich and Bern (~95km)', () => {
      const distance = calculateHaversineDistance(zurich, bern)
      // Actual distance is approximately 95.4 km
      expect(distance).toBeGreaterThan(94000)
      expect(distance).toBeLessThan(97000)
    })

    it('calculates distance between Zurich and Basel (~75km)', () => {
      const distance = calculateHaversineDistance(zurich, basel)
      // Actual distance is approximately 75 km
      expect(distance).toBeGreaterThan(73000)
      expect(distance).toBeLessThan(77000)
    })

    it('calculates distance between Zurich and Geneva (~224km)', () => {
      const distance = calculateHaversineDistance(zurich, geneva)
      // Actual distance is approximately 224 km
      expect(distance).toBeGreaterThan(220000)
      expect(distance).toBeLessThan(228000)
    })

    it('returns 0 for same location', () => {
      const distance = calculateHaversineDistance(zurich, zurich)
      expect(distance).toBe(0)
    })

    it('returns same distance regardless of direction', () => {
      const distanceAB = calculateHaversineDistance(zurich, bern)
      const distanceBA = calculateHaversineDistance(bern, zurich)
      expect(distanceAB).toBeCloseTo(distanceBA, 10)
    })

    it('handles very short distances', () => {
      const pointA: Coordinates = { latitude: 47.3769, longitude: 8.5417 }
      const pointB: Coordinates = { latitude: 47.377, longitude: 8.5418 }
      const distance = calculateHaversineDistance(pointA, pointB)
      // Should be approximately 12-15 metres
      expect(distance).toBeGreaterThan(10)
      expect(distance).toBeLessThan(20)
    })
  })

  describe('calculateDistanceKm', () => {
    const zurich: Coordinates = { latitude: 47.3769, longitude: 8.5417 }
    const bern: Coordinates = { latitude: 46.948, longitude: 7.4474 }

    it('returns distance in kilometres', () => {
      const distanceKm = calculateDistanceKm(zurich, bern)
      // Approximately 95.4 km
      expect(distanceKm).toBeGreaterThan(94)
      expect(distanceKm).toBeLessThan(97)
    })

    it('is consistent with calculateHaversineDistance', () => {
      const distanceMetres = calculateHaversineDistance(zurich, bern)
      const distanceKm = calculateDistanceKm(zurich, bern)
      expect(distanceKm).toBeCloseTo(distanceMetres / 1000, 10)
    })
  })

  describe('calculateCarDistanceKm', () => {
    const zurich: Coordinates = { latitude: 47.3769, longitude: 8.5417 }
    const bern: Coordinates = { latitude: 46.948, longitude: 7.4474 }
    const geneva: Coordinates = { latitude: 46.2044, longitude: 6.1432 }

    it('returns estimated driving distance in kilometres', () => {
      const carDistanceKm = calculateCarDistanceKm(zurich, bern)
      // Straight-line is ~95.4 km, car distance should be ~126.9 km (95.4 * 1.33)
      expect(carDistanceKm).toBeGreaterThan(125)
      expect(carDistanceKm).toBeLessThan(130)
    })

    it('applies the ROAD_DISTANCE_MULTIPLIER to straight-line distance', () => {
      const straightLineKm = calculateDistanceKm(zurich, bern)
      const carDistanceKm = calculateCarDistanceKm(zurich, bern)
      expect(carDistanceKm).toBeCloseTo(straightLineKm * ROAD_DISTANCE_MULTIPLIER, 10)
    })

    it('returns 0 for same location', () => {
      const carDistance = calculateCarDistanceKm(zurich, zurich)
      expect(carDistance).toBe(0)
    })

    it('returns same distance regardless of direction', () => {
      const distanceAB = calculateCarDistanceKm(zurich, bern)
      const distanceBA = calculateCarDistanceKm(bern, zurich)
      expect(distanceAB).toBeCloseTo(distanceBA, 10)
    })

    it('scales appropriately for longer distances', () => {
      const carDistanceKm = calculateCarDistanceKm(zurich, geneva)
      // Straight-line is ~224 km, car distance should be ~298 km (224 * 1.33)
      expect(carDistanceKm).toBeGreaterThan(292)
      expect(carDistanceKm).toBeLessThan(305)
    })
  })
})
