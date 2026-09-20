/**
 * E-bike + train trip adaptation.
 *
 * Adapts OJP public transport trips to the "e-bike + train" travel mode:
 * the rail portion of a trip is kept as-is, while access and egress legs
 * (walking, feeder buses/trams) are replaced by estimated cycling times
 * from home to the first rail station and from the last rail station to
 * the destination.
 *
 * Pure functions - no network or SDK dependencies.
 */

import { MINUTES_PER_HOUR, MS_PER_MINUTE } from '@/common/utils/constants'
import { calculateDistanceKm, ROAD_DISTANCE_MULTIPLIER } from '@/common/utils/distance'

import { extractStationFromStopPoint } from './ojp-trip-helpers'

import type { OjpLeg, OjpStopPoint, OjpTrip } from './ojp-trip-helpers'
import type { BikeLegs, Coordinates, StationInfo } from './types'

/**
 * Average speed pedelec (fast e-bike) speed including stops and traffic.
 * Legal top speed is 45 km/h; realistic urban/rural average is much lower.
 */
export const EBIKE_AVERAGE_SPEED_KMH = 25

/** OJP mode identifier for rail services */
const RAIL_PT_MODE = 'rail'

/**
 * An OJP trip adapted to the e-bike + train travel mode.
 */
export interface EbikeTrainAdaptation {
  /** Total travel duration including both cycling legs (minutes) */
  durationMinutes: number
  /** ISO 8601 departure time from home (train departure minus cycling time) */
  departureTime: string
  /** ISO 8601 arrival time at destination (train arrival plus cycling time) */
  arrivalTime: string
  /** Number of transfers within the rail portion */
  transfers: number
  /** Departure rail station */
  originStation?: StationInfo
  /** Arrival rail station */
  destinationStation?: StationInfo
  /** Estimated cycling legs */
  bikeLegs: BikeLegs
  /** The OJP trip the adaptation was derived from */
  sourceTrip: OjpTrip
}

/**
 * Estimate the cycling distance between two points in kilometres.
 * Uses straight-line distance with the empirically validated road multiplier.
 */
export function estimateBikeDistanceKm(from: Coordinates, to: Coordinates): number {
  return calculateDistanceKm(from, to) * ROAD_DISTANCE_MULTIPLIER
}

/**
 * Estimate cycling time in minutes for a given distance.
 */
export function estimateBikeMinutes(distanceKm: number): number {
  return Math.ceil((distanceKm / EBIKE_AVERAGE_SPEED_KMH) * MINUTES_PER_HOUR)
}

/**
 * Find the indices of all rail timed legs in a trip.
 */
function findRailLegIndices(legs: OjpLeg[]): number[] {
  const indices: number[] = []
  legs.forEach((leg, index) => {
    if (leg.timedLeg?.service?.mode?.ptMode === RAIL_PT_MODE) {
      indices.push(index)
    }
  })
  return indices
}

/**
 * Check whether every timed leg between the first and last rail leg is rail.
 * A trip with a bus/tram segment in the middle cannot be adapted, since a
 * bike travelling on the train cannot follow that segment.
 */
function isRailPortionContiguous(legs: OjpLeg[], firstRail: number, lastRail: number): boolean {
  for (let i = firstRail + 1; i < lastRail; i++) {
    const timedLeg = legs[i]?.timedLeg
    if (timedLeg && timedLeg.service?.mode?.ptMode !== RAIL_PT_MODE) {
      return false
    }
  }
  return true
}

/**
 * Count the timed legs between the first and last rail leg (inclusive).
 */
function countRailPortionTimedLegs(legs: OjpLeg[], firstRail: number, lastRail: number): number {
  let count = 0
  for (let i = firstRail; i <= lastRail; i++) {
    if (legs[i]?.timedLeg) {
      count++
    }
  }
  return count
}

/**
 * Coordinates of a leg's endpoint (continuous or transfer legs only).
 */
function getLegEndpointCoords(
  leg: OjpLeg | undefined,
  endpoint: 'legStart' | 'legEnd'
): Coordinates | undefined {
  const geoPosition = (leg?.continuousLeg ?? leg?.transferLeg)?.[endpoint]?.geoPosition
  if (!geoPosition) return undefined
  return { latitude: geoPosition.latitude, longitude: geoPosition.longitude }
}

/**
 * Get the effective time from a stop point's service time (estimated wins).
 */
function getServiceTime(time: { timetabledTime: string; estimatedTime?: string } | undefined) {
  return time?.estimatedTime ?? time?.timetabledTime
}

/**
 * Coordinates of the boarding station of the first rail leg.
 * Returns null when the trip starts directly at the station (no access leg),
 * undefined when the coordinates cannot be determined.
 */
function findBoardingCoords(legs: OjpLeg[], firstRail: number): Coordinates | null | undefined {
  if (firstRail === 0) return null
  return getLegEndpointCoords(legs[firstRail - 1], 'legEnd')
}

/**
 * Coordinates of the alighting station of the last rail leg.
 * Returns null when the trip ends directly at the station (no egress leg),
 * undefined when the coordinates cannot be determined.
 */
function findAlightingCoords(legs: OjpLeg[], lastRail: number): Coordinates | null | undefined {
  if (lastRail === legs.length - 1) return null
  return getLegEndpointCoords(legs[lastRail + 1], 'legStart')
}

/**
 * Compute a single cycling leg from the given coordinates.
 * `stationCoords === null` means origin/destination is already at the station.
 */
function computeBikeLeg(
  endpointCoords: Coordinates,
  stationCoords: Coordinates | null
): { distanceKm: number; minutes: number } {
  if (stationCoords === null) {
    return { distanceKm: 0, minutes: 0 }
  }
  const distanceKm = estimateBikeDistanceKm(endpointCoords, stationCoords)
  return { distanceKm, minutes: estimateBikeMinutes(distanceKm) }
}

interface RailPortion {
  boardStopPoint: OjpStopPoint
  alightStopPoint: OjpStopPoint
  boardDeparture: string
  alightArrival: string
  transfers: number
  firstRail: number
  lastRail: number
}

/**
 * Extract the rail portion of a trip, or undefined when the trip has no
 * contiguous rail portion with usable departure/arrival times.
 */
function extractRailPortion(trip: OjpTrip): RailPortion | undefined {
  const legs = trip.leg
  const railIndices = findRailLegIndices(legs)
  if (railIndices.length === 0) return undefined

  const firstRail = railIndices[0]!
  const lastRail = railIndices[railIndices.length - 1]!
  if (!isRailPortionContiguous(legs, firstRail, lastRail)) return undefined

  const boardStopPoint = legs[firstRail]!.timedLeg!.legBoard
  const alightStopPoint = legs[lastRail]!.timedLeg!.legAlight
  const boardDeparture = getServiceTime(boardStopPoint.serviceDeparture)
  const alightArrival = getServiceTime(alightStopPoint.serviceArrival)
  if (!boardDeparture || !alightArrival) return undefined

  return {
    boardStopPoint,
    alightStopPoint,
    boardDeparture,
    alightArrival,
    transfers: countRailPortionTimedLegs(legs, firstRail, lastRail) - 1,
    firstRail,
    lastRail,
  }
}

/**
 * Adapt an OJP trip to the e-bike + train travel mode.
 *
 * Returns undefined when the trip cannot be adapted:
 * - no rail leg in the trip
 * - non-rail segment in the middle of the rail portion
 * - station coordinates missing from the trip data
 * - a cycling leg exceeds the configured maximum distance
 *
 * @param trip OJP trip from a regular public transport request
 * @param from Origin coordinates (home)
 * @param to Destination coordinates (sports hall)
 * @param maxBikeDistanceKm Maximum allowed cycling distance per leg
 */
export function adaptTripForEbikeTrain(
  trip: OjpTrip,
  from: Coordinates,
  to: Coordinates,
  maxBikeDistanceKm: number
): EbikeTrainAdaptation | undefined {
  const railPortion = extractRailPortion(trip)
  if (!railPortion) return undefined

  const boardingCoords = findBoardingCoords(trip.leg, railPortion.firstRail)
  const alightingCoords = findAlightingCoords(trip.leg, railPortion.lastRail)
  if (boardingCoords === undefined || alightingCoords === undefined) return undefined

  const bikeToStation = computeBikeLeg(from, boardingCoords)
  const bikeFromStation = computeBikeLeg(to, alightingCoords)
  if (
    bikeToStation.distanceKm > maxBikeDistanceKm ||
    bikeFromStation.distanceKm > maxBikeDistanceKm
  ) {
    return undefined
  }

  const departureMs =
    new Date(railPortion.boardDeparture).getTime() - bikeToStation.minutes * MS_PER_MINUTE
  const arrivalMs =
    new Date(railPortion.alightArrival).getTime() + bikeFromStation.minutes * MS_PER_MINUTE

  return {
    durationMinutes: Math.round((arrivalMs - departureMs) / MS_PER_MINUTE),
    departureTime: new Date(departureMs).toISOString(),
    arrivalTime: new Date(arrivalMs).toISOString(),
    transfers: railPortion.transfers,
    originStation: extractStationFromStopPoint(railPortion.boardStopPoint),
    destinationStation: extractStationFromStopPoint(railPortion.alightStopPoint),
    bikeLegs: {
      toStationMinutes: bikeToStation.minutes,
      toStationKm: bikeToStation.distanceKm,
      fromStationMinutes: bikeFromStation.minutes,
      fromStationKm: bikeFromStation.distanceKm,
    },
    sourceTrip: trip,
  }
}

/**
 * Select the best e-bike + train adaptation from a list of trips.
 *
 * Mirrors selectBestTrip semantics on the adapted times:
 * 1. Must arrive on time (before or at target arrival time)
 * 2. Prefer fewer transfers
 * 3. Prefer arrival closest to target time
 *
 * Returns undefined when no trip can be adapted (caller should fall back
 * to the regular public transport result).
 */
export function selectBestEbikeTrainTrip(
  trips: OjpTrip[],
  from: Coordinates,
  to: Coordinates,
  maxBikeDistanceKm: number,
  targetArrivalTime?: Date
): EbikeTrainAdaptation | undefined {
  const adaptations = trips
    .map((trip) => adaptTripForEbikeTrain(trip, from, to, maxBikeDistanceKm))
    .filter((adaptation): adaptation is EbikeTrainAdaptation => adaptation !== undefined)

  if (adaptations.length === 0) return undefined
  if (!targetArrivalTime) return adaptations[0]

  const targetTime = targetArrivalTime.getTime()
  const onTime = adaptations.filter(
    (adaptation) => new Date(adaptation.arrivalTime).getTime() <= targetTime
  )
  if (onTime.length === 0) return adaptations[0]

  return onTime.reduce((best, adaptation) => {
    if (adaptation.transfers < best.transfers) return adaptation
    if (adaptation.transfers > best.transfers) return best
    return new Date(adaptation.arrivalTime).getTime() > new Date(best.arrivalTime).getTime()
      ? adaptation
      : best
  })
}
