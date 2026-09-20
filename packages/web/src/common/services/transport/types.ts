/**
 * Travel time calculation types for public transport routing.
 * Uses the OJP 2.0 API via ojp-sdk-next.
 */

/**
 * Travel mode for route calculations.
 * - 'publicTransport': Door-to-door public transport (walking + all PT modes)
 * - 'ebikeTrain': E-bike to/from the train station, train in between.
 *   Access and egress legs (walking, feeder buses) are replaced by estimated
 *   cycling times; only the rail portion comes from the OJP API.
 */
export type TravelMode = 'publicTransport' | 'ebikeTrain'

/** Default travel mode */
export const DEFAULT_TRAVEL_MODE: TravelMode = 'publicTransport'

/** Default maximum cycling distance for the e-bike + train mode (km) */
export const DEFAULT_MAX_BIKE_DISTANCE_KM = 15

/** Minimum allowed maximum cycling distance (km) */
export const MIN_MAX_BIKE_DISTANCE_KM = 1

/** Maximum allowed maximum cycling distance (km) */
export const MAX_MAX_BIKE_DISTANCE_KM = 30

/**
 * Station information extracted from trip data.
 */
export interface StationInfo {
  /** Didok station ID (e.g., "8507000" for Bern) */
  id: string
  /** Station name */
  name: string
}

/**
 * Estimated cycling legs of an e-bike + train journey.
 */
export interface BikeLegs {
  /** Estimated cycling time from home to the departure station (minutes) */
  toStationMinutes: number
  /** Estimated cycling distance from home to the departure station (km) */
  toStationKm: number
  /** Estimated cycling time from the arrival station to the destination (minutes) */
  fromStationMinutes: number
  /** Estimated cycling distance from the arrival station to the destination (km) */
  fromStationKm: number
}

/**
 * Result of a travel time calculation.
 */
export interface TravelTimeResult {
  /** Total travel duration in minutes */
  durationMinutes: number
  /** ISO 8601 departure time */
  departureTime: string
  /** ISO 8601 arrival time (includes walking to final destination) */
  arrivalTime: string
  /** Number of transfers required */
  transfers: number
  /** Origin station info for SBB deep linking */
  originStation?: StationInfo
  /** Destination station info for SBB deep linking */
  destinationStation?: StationInfo
  /** Walking time from last public transport stop to destination (minutes) */
  finalWalkingMinutes?: number
  /** Raw trip data for future itinerary display */
  tripData?: unknown
  /** Travel mode the result was calculated with */
  travelMode?: TravelMode
  /** Estimated cycling legs (only set for 'ebikeTrain' results) */
  bikeLegs?: BikeLegs
}

/**
 * Options for travel time calculation.
 */
export interface TravelTimeOptions {
  /** Desired departure time (defaults to now) */
  departureTime?: Date
  /** Target arrival time - selects connection arriving closest to this time without being late */
  targetArrivalTime?: Date
  /** Include raw trip data in result (for future itinerary display) */
  includeTrips?: boolean
  /** Origin location label (for mock transport station names) */
  originLabel?: string
  /** Destination location label (for mock transport station names) */
  destinationLabel?: string
  /** Travel mode for the calculation (defaults to 'publicTransport') */
  travelMode?: TravelMode
  /** Maximum cycling distance for 'ebikeTrain' mode; longer routes fall back to public transport */
  maxBikeDistanceKm?: number
}

/**
 * Coordinates for location-based routing.
 */
export interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Error thrown when transport API requests fail.
 */
export class TransportApiError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'TransportApiError'
    this.code = code
  }
}
