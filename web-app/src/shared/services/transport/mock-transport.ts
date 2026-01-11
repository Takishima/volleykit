/**
 * Mock transport API for demo mode.
 * Provides realistic travel times based on straight-line distance.
 */

import {
  MINUTES_PER_HOUR,
  MS_PER_MINUTE,
  SHORT_DISTANCE_KM,
  MEDIUM_DISTANCE_KM,
  LONG_DISTANCE_KM,
} from '@/shared/utils/constants'
import { calculateDistanceKm } from '@/shared/utils/distance'

import type { Coordinates, TravelTimeResult, TravelTimeOptions, StationInfo } from './types'

/** Network delay for realistic demo behavior */
const MOCK_DELAY_MS = 100

/** Maximum number of transfers for very long distances */
const MAX_TRANSFERS = 3

// Coordinate hashing constants for mock station IDs
// Swiss Didok IDs are 7 digits starting with 85
const LAT_HASH_MULTIPLIER = 10000
const LON_HASH_MULTIPLIER = 1000
const ID_MODULO = 100000
const ID_PAD_LENGTH = 5

// Decimal places for coordinate display (0.1 degree precision)
const COORD_DISPLAY_PRECISION = 10

// Walking time estimation constants
const WALKING_TIME_BASE_MINUTES = 5
const WALKING_TIME_VARIATION = 6
const WALKING_COORD_MULTIPLIER_LAT = 100
const WALKING_COORD_MULTIPLIER_LON = 10

/**
 * Estimate travel time based on straight-line distance.
 * Uses a formula that approximates Swiss public transport:
 * - Base time: 15 minutes (getting to station, waiting)
 * - Travel time: ~40 km/h average speed for public transport
 * - Transfers: estimated based on distance
 *
 * @param distanceKm Straight-line distance in kilometers
 * @returns Estimated travel time in minutes
 */
function estimateTravelTimeFromDistance(distanceKm: number): number {
  const baseTimeMinutes = 15 // Getting to station, waiting
  const averageSpeedKmh = 40 // Average speed including stops
  const travelMinutes = (distanceKm / averageSpeedKmh) * MINUTES_PER_HOUR

  return Math.round(baseTimeMinutes + travelMinutes)
}

/**
 * Estimate number of transfers based on distance.
 *
 * @param distanceKm Straight-line distance in kilometers
 * @returns Estimated number of transfers
 */
function estimateTransfers(distanceKm: number): number {
  if (distanceKm < SHORT_DISTANCE_KM) return 0
  if (distanceKm < MEDIUM_DISTANCE_KM) return 1
  if (distanceKm < LONG_DISTANCE_KM) return 2
  return MAX_TRANSFERS
}

/**
 * Simulate network delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a mock Didok station ID from coordinates.
 * Uses a hash of the coordinates to create a realistic-looking ID.
 */
function generateMockStationId(coords: Coordinates): string {
  // Create a deterministic ID from coordinates (Swiss Didok IDs are 7 digits starting with 85)
  const latHash = Math.abs(Math.round(coords.latitude * LAT_HASH_MULTIPLIER))
  const lonHash = Math.abs(Math.round(coords.longitude * LON_HASH_MULTIPLIER))
  const combined = (latHash + lonHash) % ID_MODULO
  return `85${String(combined).padStart(ID_PAD_LENGTH, '0')}`
}

/**
 * Generate a mock station name from coordinates.
 * In demo mode, we just use a generic name.
 */
function generateMockStationName(coords: Coordinates): string {
  // Generate a simple name based on rounded coordinates
  const latDeg = Math.round(coords.latitude * COORD_DISPLAY_PRECISION) / COORD_DISPLAY_PRECISION
  const lonDeg = Math.round(coords.longitude * COORD_DISPLAY_PRECISION) / COORD_DISPLAY_PRECISION
  return `Station ${latDeg}N ${lonDeg}E`
}

/**
 * Calculate mock travel time between two coordinates.
 * Used in demo mode when the real OJP API is not available.
 *
 * @param from Origin coordinates (user's home location)
 * @param to Destination coordinates (sports hall)
 * @param options Optional configuration
 * @returns Mock travel time result
 */
export async function calculateMockTravelTime(
  from: Coordinates,
  to: Coordinates,
  options: TravelTimeOptions = {}
): Promise<TravelTimeResult> {
  // Simulate network delay
  await delay(MOCK_DELAY_MS)

  // Calculate distance and estimate travel time
  const distanceKm = calculateDistanceKm(from, to)
  const durationMinutes = estimateTravelTimeFromDistance(distanceKm)
  const transfers = estimateTransfers(distanceKm)

  // Calculate departure and arrival times
  const departureTime = options.departureTime ?? new Date()
  const arrivalTime = new Date(departureTime.getTime() + durationMinutes * MS_PER_MINUTE)

  // Generate mock origin and destination stations for SBB deep linking
  // Use provided labels if available, otherwise fall back to coordinate-based names
  const originStation: StationInfo = {
    id: generateMockStationId(from),
    name: options.originLabel ?? generateMockStationName(from),
  }

  const destinationStation: StationInfo = {
    id: generateMockStationId(to),
    name: options.destinationLabel ?? generateMockStationName(to),
  }

  // Mock walking time from last stop to destination (5-10 minutes typically)
  // Use a deterministic value based on coordinates for consistency
  const coordHash =
    Math.abs(
      Math.round(
        to.latitude * WALKING_COORD_MULTIPLIER_LAT + to.longitude * WALKING_COORD_MULTIPLIER_LON
      )
    ) % WALKING_TIME_VARIATION
  const finalWalkingMinutes = WALKING_TIME_BASE_MINUTES + coordHash

  return {
    durationMinutes,
    departureTime: departureTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    transfers,
    originStation,
    destinationStation,
    finalWalkingMinutes,
    tripData: undefined,
  }
}
