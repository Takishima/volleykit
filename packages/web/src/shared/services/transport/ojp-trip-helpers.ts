/**
 * OJP Trip Extraction & Selection Helpers
 *
 * Pure functions for extracting station info, selecting optimal trips,
 * and parsing durations from OJP SDK trip results. No network or SDK dependencies.
 */

import { MINUTES_PER_HOUR, SECONDS_PER_MINUTE } from '@/shared/utils/constants'

import type { StationInfo } from './types'

// =============================================================================
// OJP SDK Types (local subset to avoid coupling to SDK internals)
// =============================================================================

/**
 * Stop point info from a timed leg's legBoard or legAlight.
 */
interface OjpStopPoint {
  stopPointRef: string
  stopPointName: {
    text: string
  }
  nameSuffix?: {
    text: string
  }
}

/**
 * Timed leg from OJP SDK representing a public transport segment.
 */
interface OjpTimedLeg {
  legBoard: OjpStopPoint
  legAlight: OjpStopPoint
}

/**
 * Continuous leg from OJP SDK representing walking/cycling segments.
 */
interface OjpContinuousLeg {
  /** ISO 8601 duration string (e.g., "PT5M" for 5 minutes walking) */
  duration: string
}

/**
 * Leg structure from OJP SDK. A trip consists of multiple legs.
 */
interface OjpLeg {
  timedLeg?: OjpTimedLeg
  continuousLeg?: OjpContinuousLeg
}

/**
 * Subset of trip properties from ojp-sdk-next used for connection selection.
 */
export interface OjpTrip {
  duration: string
  startTime: string
  endTime: string
  transfers: number
  leg: OjpLeg[]
}

// =============================================================================
// Station ID Extraction
// =============================================================================

/**
 * Extract Didok station ID from OJP stopPointRef.
 * Format: "ch:1:sloid:8507000" -> "8507000"
 */
function extractDidokId(ref: string | undefined): string | undefined {
  if (!ref) return undefined

  const sloidMatch = ref.match(/sloid:(\d+)/)
  if (sloidMatch) {
    return sloidMatch[1]
  }

  if (/^\d+$/.test(ref)) {
    return ref
  }

  return undefined
}

// =============================================================================
// Station Name Cleaning
// =============================================================================

/**
 * Regex patterns for OJP accessibility keywords that should be filtered from station names.
 */
const OJP_ACCESSIBILITY_PATTERNS = [
  /\bPLATFORM_[A-Z_]+\b/g,
  /\b[A-Z_]*WHEELCHAIR[A-Z_]*\b/g,
  /\bALTERNATIVE_TRANSPORT\b/g,
  /\bSHUTTLE_BUS\b/g,
  /\bRAIL_REPLACEMENT\b/g,
]

/**
 * Check if a string is entirely an OJP accessibility keyword.
 */
function isAccessibilityKeyword(text: string): boolean {
  return OJP_ACCESSIBILITY_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0
    const match = text.match(pattern)
    return match !== null && match[0] === text
  })
}

/**
 * Clean a station name suffix by removing OJP accessibility keywords.
 */
function cleanNameSuffix(suffix: string | undefined): string | undefined {
  if (!suffix) return undefined

  if (isAccessibilityKeyword(suffix)) {
    return undefined
  }

  let cleaned = suffix
  for (const pattern of OJP_ACCESSIBILITY_PATTERNS) {
    pattern.lastIndex = 0
    cleaned = cleaned.replace(pattern, '')
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  return cleaned || undefined
}

/**
 * Build full station name by combining stopPointName and optional nameSuffix.
 * Example: "Schönenwerd" + "SO, Bahnhof" -> "Schönenwerd SO, Bahnhof"
 */
function buildStationName(stopPoint: OjpStopPoint): string {
  const baseName = stopPoint.stopPointName.text
  const suffix = cleanNameSuffix(stopPoint.nameSuffix?.text)

  if (suffix) {
    return `${baseName} ${suffix}`
  }
  return baseName
}

/**
 * Extract station info from a stop point.
 */
function extractStationFromStopPoint(stopPoint: OjpStopPoint | undefined): StationInfo | undefined {
  if (!stopPoint) return undefined

  const id = extractDidokId(stopPoint.stopPointRef)
  if (!id) return undefined

  return {
    id,
    name: buildStationName(stopPoint),
  }
}

// =============================================================================
// Leg Extraction
// =============================================================================

/**
 * Find the first timed leg in a trip (first public transport segment).
 */
function findFirstTimedLeg(trip: OjpTrip): OjpTimedLeg | undefined {
  for (const leg of trip.leg) {
    if (leg.timedLeg) {
      return leg.timedLeg
    }
  }
  return undefined
}

/**
 * Find the last timed leg in a trip (last public transport segment).
 */
function findLastTimedLeg(trip: OjpTrip): OjpTimedLeg | undefined {
  for (let i = trip.leg.length - 1; i >= 0; i--) {
    const leg = trip.leg[i]
    if (leg?.timedLeg) {
      return leg.timedLeg
    }
  }
  return undefined
}

// =============================================================================
// Duration Parsing
// =============================================================================

/**
 * Extract numeric value before a unit character from ISO 8601 duration.
 */
function extractDurationComponent(duration: string, unit: string): number {
  const unitIndex = duration.indexOf(unit)
  if (unitIndex === -1) return 0

  let startIndex = unitIndex - 1
  while (startIndex >= 0 && duration[startIndex]! >= '0' && duration[startIndex]! <= '9') {
    startIndex--
  }
  startIndex++

  if (startIndex >= unitIndex) return 0

  return parseInt(duration.substring(startIndex, unitIndex), 10) || 0
}

/**
 * Parse ISO 8601 duration string to minutes.
 *
 * @param duration ISO 8601 duration string (e.g., "PT1H30M")
 * @returns Duration in minutes
 */
export function parseDurationToMinutes(duration: string): number {
  if (!duration.startsWith('PT')) {
    return 0
  }

  const hours = extractDurationComponent(duration, 'H')
  const minutes = extractDurationComponent(duration, 'M')
  const seconds = extractDurationComponent(duration, 'S')

  return hours * MINUTES_PER_HOUR + minutes + Math.ceil(seconds / SECONDS_PER_MINUTE)
}

// =============================================================================
// Trip Analysis Functions
// =============================================================================

/**
 * Extract the total walking duration after the last public transport segment.
 */
export function extractFinalWalkingMinutes(trip: OjpTrip): number {
  let lastTimedLegIndex = -1
  for (let i = trip.leg.length - 1; i >= 0; i--) {
    if (trip.leg[i]?.timedLeg) {
      lastTimedLegIndex = i
      break
    }
  }

  if (lastTimedLegIndex === -1) {
    return 0
  }

  let totalWalkingMinutes = 0
  for (let i = lastTimedLegIndex + 1; i < trip.leg.length; i++) {
    const leg = trip.leg[i]
    if (leg?.continuousLeg?.duration) {
      totalWalkingMinutes += parseDurationToMinutes(leg.continuousLeg.duration)
    }
  }

  return totalWalkingMinutes
}

/**
 * Calculate the actual arrival time at the destination, including final walking.
 */
export function calculateActualArrivalTime(trip: OjpTrip): string {
  const finalWalkingMinutes = extractFinalWalkingMinutes(trip)

  if (finalWalkingMinutes === 0) {
    return trip.endTime
  }

  const endTime = new Date(trip.endTime)
  endTime.setMinutes(endTime.getMinutes() + finalWalkingMinutes)

  return endTime.toISOString()
}

/**
 * Extract origin station info from an OJP trip.
 */
export function extractOriginStation(trip: OjpTrip): StationInfo | undefined {
  const firstTimedLeg = findFirstTimedLeg(trip)
  return extractStationFromStopPoint(firstTimedLeg?.legBoard)
}

/**
 * Extract destination station info from an OJP trip.
 */
export function extractDestinationStation(trip: OjpTrip): StationInfo | undefined {
  const lastTimedLeg = findLastTimedLeg(trip)
  return extractStationFromStopPoint(lastTimedLeg?.legAlight)
}

/**
 * Select the best trip based on target arrival time.
 *
 * Selection criteria (in priority order):
 * 1. Must arrive on time (before or at target arrival time)
 * 2. Prefer fewer transfers
 * 3. Prefer arrival closest to target time
 */
export function selectBestTrip(trips: OjpTrip[], targetArrivalTime?: Date): OjpTrip {
  if (!targetArrivalTime) {
    return trips[0]!
  }

  const targetTime = targetArrivalTime.getTime()

  const onTimeTrips = trips.filter((trip) => {
    const actualArrivalTime = new Date(calculateActualArrivalTime(trip)).getTime()
    return actualArrivalTime <= targetTime
  })

  if (onTimeTrips.length === 0) {
    return trips[0]!
  }

  return onTimeTrips.reduce((best, trip) => {
    if (trip.transfers < best.transfers) {
      return trip
    }
    if (trip.transfers > best.transfers) {
      return best
    }
    const bestArrival = new Date(calculateActualArrivalTime(best)).getTime()
    const tripArrival = new Date(calculateActualArrivalTime(trip)).getTime()
    return tripArrival > bestArrival ? trip : best
  })
}
