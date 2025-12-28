/**
 * Travel time calculation types for public transport routing.
 * Uses the OJP 2.0 API via ojp-sdk-next.
 */

/**
 * Station information extracted from trip data.
 */
export interface StationInfo {
  /** Didok station ID (e.g., "8507000" for Bern) */
  id: string;
  /** Station name */
  name: string;
}

/**
 * Result of a travel time calculation.
 */
export interface TravelTimeResult {
  /** Total travel duration in minutes */
  durationMinutes: number;
  /** ISO 8601 departure time */
  departureTime: string;
  /** ISO 8601 arrival time */
  arrivalTime: string;
  /** Number of transfers required */
  transfers: number;
  /** Origin station info for SBB deep linking */
  originStation?: StationInfo;
  /** Destination station info for SBB deep linking */
  destinationStation?: StationInfo;
  /** Raw trip data for future itinerary display */
  tripData?: unknown;
}

/**
 * Options for travel time calculation.
 */
export interface TravelTimeOptions {
  /** Desired departure time (defaults to now) */
  departureTime?: Date;
  /** Target arrival time - selects connection arriving closest to this time without being late */
  targetArrivalTime?: Date;
  /** Include raw trip data in result (for future itinerary display) */
  includeTrips?: boolean;
  /** Origin location label (for mock transport station names) */
  originLabel?: string;
  /** Destination location label (for mock transport station names) */
  destinationLabel?: string;
}

/**
 * Coordinates for location-based routing.
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Configuration for the transport service.
 */
export interface TransportConfig {
  /** OJP API endpoint URL */
  apiEndpoint: string;
  /** API key for authentication */
  apiKey: string;
  /** Minimum delay between requests in milliseconds */
  rateLimitDelayMs: number;
}

/**
 * Error thrown when transport API requests fail.
 */
export class TransportApiError extends Error {
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "TransportApiError";
    this.code = code;
  }
}
