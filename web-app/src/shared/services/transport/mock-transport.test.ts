import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { calculateMockTravelTime } from './mock-transport'
import type { Coordinates, TravelTimeOptions } from './types'

describe('mock-transport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('calculateMockTravelTime', () => {
    // Zurich coordinates (central point for Swiss tests)
    const zurich: Coordinates = { latitude: 47.3769, longitude: 8.5417 }
    // Bern coordinates (~100km from Zurich)
    const bern: Coordinates = { latitude: 46.9481, longitude: 7.4474 }
    // Basel coordinates (~90km from Zurich)
    const basel: Coordinates = { latitude: 47.5596, longitude: 7.5886 }
    // Geneva coordinates (~280km from Zurich)
    const geneva: Coordinates = { latitude: 46.2044, longitude: 6.1432 }
    // Nearby location (~5km from Zurich center)
    const zurichOerlikon: Coordinates = { latitude: 47.4111, longitude: 8.5441 }

    it('returns a travel time result with all required fields', async () => {
      const promise = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      expect(result).toHaveProperty('durationMinutes')
      expect(result).toHaveProperty('departureTime')
      expect(result).toHaveProperty('arrivalTime')
      expect(result).toHaveProperty('transfers')
      expect(result).toHaveProperty('originStation')
      expect(result).toHaveProperty('destinationStation')
      expect(result).toHaveProperty('finalWalkingMinutes')

      expect(typeof result.durationMinutes).toBe('number')
      expect(typeof result.transfers).toBe('number')
      expect(typeof result.finalWalkingMinutes).toBe('number')
    })

    it('calculates reasonable travel time for short distance', async () => {
      // ~4km between Zurich center and Oerlikon
      const promise = calculateMockTravelTime(zurich, zurichOerlikon)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      // Short distances should have base time (~15 min) plus minimal travel time
      expect(result.durationMinutes).toBeGreaterThanOrEqual(15)
      expect(result.durationMinutes).toBeLessThan(30)
      expect(result.transfers).toBe(0)
    })

    it('calculates reasonable travel time for medium distance', async () => {
      // ~90km between Zurich and Basel
      const promise = calculateMockTravelTime(zurich, basel)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      // Medium distances should have longer travel time
      expect(result.durationMinutes).toBeGreaterThan(30)
      expect(result.durationMinutes).toBeLessThan(180)
      // 90km > 60km threshold (LONG_DISTANCE_KM), so MAX_TRANSFERS (3)
      expect(result.transfers).toBe(3)
    })

    it('calculates reasonable travel time for long distance', async () => {
      // ~280km between Zurich and Geneva
      const promise = calculateMockTravelTime(zurich, geneva)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      // Long distances should have significant travel time
      expect(result.durationMinutes).toBeGreaterThan(60)
      // Very long distance should have max transfers (3)
      expect(result.transfers).toBe(3)
    })

    it('estimates 0 transfers for very short distances (<10km)', async () => {
      const promise = calculateMockTravelTime(zurich, zurichOerlikon)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      expect(result.transfers).toBe(0)
    })

    it('estimates 1 transfer for short-medium distances (10-30km)', async () => {
      // ~25km from Zurich
      const winterthur: Coordinates = { latitude: 47.5001, longitude: 8.7242 }
      const promise = calculateMockTravelTime(zurich, winterthur)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      expect(result.transfers).toBe(1)
    })

    it('estimates 2 transfers for medium-long distances (30-60km)', async () => {
      // ~40km from Zurich
      const lucerne: Coordinates = { latitude: 47.0502, longitude: 8.3093 }
      const promise = calculateMockTravelTime(zurich, lucerne)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      expect(result.transfers).toBe(2)
    })

    it('uses provided departure time', async () => {
      const departureTime = new Date('2025-03-15T10:00:00Z')
      const options: TravelTimeOptions = { departureTime }

      const promise = calculateMockTravelTime(zurich, bern, options)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      expect(result.departureTime).toBe('2025-03-15T10:00:00.000Z')
      // Arrival should be after departure
      const arrival = new Date(result.arrivalTime)
      expect(arrival.getTime()).toBeGreaterThan(departureTime.getTime())
    })

    it('uses current time when departure time not provided', async () => {
      const baseTime = new Date('2025-06-01T14:30:00Z')
      vi.setSystemTime(baseTime)

      const promise = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      // The departure time is captured before the delay, so it should be at or very close to base time
      // Allow for small timing differences (within 200ms of the base time)
      const departureDate = new Date(result.departureTime)
      const diffMs = Math.abs(departureDate.getTime() - baseTime.getTime())
      expect(diffMs).toBeLessThanOrEqual(200)
    })

    it('arrival time is after departure by duration minutes', async () => {
      const departureTime = new Date('2025-03-15T10:00:00Z')
      const options: TravelTimeOptions = { departureTime }

      const promise = calculateMockTravelTime(zurich, bern, options)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      const departure = new Date(result.departureTime)
      const arrival = new Date(result.arrivalTime)
      const diffMinutes = (arrival.getTime() - departure.getTime()) / (1000 * 60)

      expect(diffMinutes).toBe(result.durationMinutes)
    })

    it('generates valid mock station IDs (Swiss Didok format)', async () => {
      const promise = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      // Swiss Didok IDs start with 85 and are 7 digits
      expect(result.originStation.id).toMatch(/^85\d{5}$/)
      expect(result.destinationStation.id).toMatch(/^85\d{5}$/)
    })

    it('generates deterministic station IDs from coordinates', async () => {
      const promise1 = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result1 = await promise1

      const promise2 = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result2 = await promise2

      expect(result1.originStation.id).toBe(result2.originStation.id)
      expect(result1.destinationStation.id).toBe(result2.destinationStation.id)
    })

    it('uses provided origin label for station name', async () => {
      const options: TravelTimeOptions = {
        originLabel: 'Zurich HB',
      }

      const promise = calculateMockTravelTime(zurich, bern, options)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      expect(result.originStation.name).toBe('Zurich HB')
    })

    it('uses provided destination label for station name', async () => {
      const options: TravelTimeOptions = {
        destinationLabel: 'Bern Bahnhof',
      }

      const promise = calculateMockTravelTime(zurich, bern, options)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      expect(result.destinationStation.name).toBe('Bern Bahnhof')
    })

    it('generates coordinate-based station names when labels not provided', async () => {
      const promise = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      // Should contain "Station" and coordinate-like values (e.g. "Station 47.4N 8.5E")
      expect(result.originStation.name).toContain('Station')
      expect(result.originStation.name).toContain('N ')
      expect(result.originStation.name).toContain('E')
      expect(result.destinationStation.name).toContain('Station')
      expect(result.destinationStation.name).toContain('N ')
      expect(result.destinationStation.name).toContain('E')
    })

    it('calculates final walking time within expected range', async () => {
      const promise = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      // Walking time should be 5-10 minutes (base 5 + up to 5 variation)
      expect(result.finalWalkingMinutes).toBeGreaterThanOrEqual(5)
      expect(result.finalWalkingMinutes).toBeLessThanOrEqual(10)
    })

    it('calculates deterministic walking time for same destination', async () => {
      const promise1 = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result1 = await promise1

      const promise2 = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result2 = await promise2

      expect(result1.finalWalkingMinutes).toBe(result2.finalWalkingMinutes)
    })

    it('returns undefined tripData (mock has no real trip data)', async () => {
      const promise = calculateMockTravelTime(zurich, bern)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      expect(result.tripData).toBeUndefined()
    })

    it('handles same origin and destination coordinates', async () => {
      const promise = calculateMockTravelTime(zurich, zurich)
      await vi.advanceTimersByTimeAsync(150)
      const result = await promise

      // Same location should have minimal travel time (just base time)
      expect(result.durationMinutes).toBe(15)
      expect(result.transfers).toBe(0)
    })

    it('simulates network delay before returning', async () => {
      const promise = calculateMockTravelTime(zurich, bern)

      // Should not resolve immediately
      let resolved = false
      promise.then(() => {
        resolved = true
      })

      // Not resolved yet
      expect(resolved).toBe(false)

      // Advance past the mock delay (100ms)
      await vi.advanceTimersByTimeAsync(150)
      await promise

      // Now should be resolved
      expect(resolved).toBe(true)
    })
  })
})
