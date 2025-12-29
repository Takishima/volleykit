/**
 * OJP 2.0 client for Swiss public transport routing.
 * Wraps the ojp-sdk-next package with rate limiting.
 *
 * The SDK is loaded lazily to reduce initial bundle size.
 */

import type { Coordinates, TravelTimeResult, TravelTimeOptions, StationInfo } from "./types";
import { TransportApiError } from "./types";

/** Lazily loaded OJP SDK module */
let ojpSdk: typeof import("ojp-sdk-next") | null = null;

/**
 * Load the OJP SDK on demand.
 */
async function loadOjpSdk(): Promise<typeof import("ojp-sdk-next")> {
  if (!ojpSdk) {
    ojpSdk = await import("ojp-sdk-next");
  }
  return ojpSdk;
}

/** OJP 2.0 API endpoint */
const OJP_API_ENDPOINT = "https://api.opentransportdata.swiss/ojp20";

/** Minimum delay between API requests (50 req/min = 1.2s to be safe) */
const RATE_LIMIT_DELAY_MS = 1200;

/** Timestamp of the last API request */
let lastRequestTime = 0;

/**
 * Wait if necessary to respect rate limits.
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    const waitTime = RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

/**
 * Check if the OJP API is configured.
 */
export function isOjpConfigured(): boolean {
  const apiKey = import.meta.env.VITE_OJP_API_KEY;
  return Boolean(apiKey && apiKey !== "your_api_key_here");
}

/**
 * Calculate travel time between two coordinates using Swiss public transport.
 *
 * @param from Origin coordinates (user's home location)
 * @param to Destination coordinates (sports hall)
 * @param options Optional configuration
 * @returns Travel time result with duration, times, and transfers
 * @throws TransportApiError if the API call fails or no route is found
 */
export async function calculateTravelTime(
  from: Coordinates,
  to: Coordinates,
  options: TravelTimeOptions = {},
): Promise<TravelTimeResult> {
  const apiKey = import.meta.env.VITE_OJP_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here") {
    throw new TransportApiError("OJP API key not configured", "API_NOT_CONFIGURED");
  }

  // Wait for rate limit before making request
  await waitForRateLimit();

  try {
    // Load SDK lazily
    const { SDK, TripRequest, Place } = await loadOjpSdk();

    // Create SDK instance using static factory method
    const sdk = SDK.create("VolleyKit", { url: OJP_API_ENDPOINT, authToken: apiKey }, "de");

    // Create places from coordinates
    const fromPlace = Place.initWithCoords(from.longitude, from.latitude);
    const toPlace = Place.initWithCoords(to.longitude, to.latitude);

    // Create trip request
    const tripRequest = TripRequest.initWithPlaces(fromPlace, toPlace);

    // Set departure time if provided
    const departureTime = options.departureTime ?? new Date();
    tripRequest.setDepartureDatetime(departureTime);

    // Configure for public transport
    tripRequest.setPublicTransportRequest();

    // Fetch trips using the new SDK API pattern
    const response = await tripRequest.fetchResponse(sdk);

    // Check for errors
    if (!response.ok) {
      throw new TransportApiError(response.error.message, "API_ERROR");
    }

    // Extract trips from response
    const tripResults = response.value.tripResult ?? [];
    if (tripResults.length === 0) {
      throw new TransportApiError("No route found between locations", "NO_ROUTE");
    }

    // Map trip results to our OjpTrip interface (each tripResult has a trip property)
    const trips = tripResults.map((tr) => tr.trip as OjpTrip);

    // Select the best trip based on target arrival time or take earliest departure
    const trip = selectBestTrip(trips, options.targetArrivalTime);

    // Parse duration from ISO 8601 duration string (e.g., "PT1H30M")
    const durationMinutes = parseDurationToMinutes(trip.duration);

    // Extract origin and destination stations for SBB deep linking
    const originStation = extractOriginStation(trip);
    const destinationStation = extractDestinationStation(trip);

    return {
      durationMinutes,
      departureTime: trip.startTime,
      arrivalTime: trip.endTime,
      transfers: trip.transfers,
      originStation,
      destinationStation,
      tripData: options.includeTrips ? trip : undefined,
    };
  } catch (error) {
    if (error instanceof TransportApiError) {
      throw error;
    }

    // Wrap unknown errors
    const message = error instanceof Error ? error.message : "Unknown transport API error";
    throw new TransportApiError(message, "API_ERROR");
  }
}

/**
 * Stop point info from a timed leg's legBoard or legAlight.
 */
interface OjpStopPoint {
  stopPointRef: string;
  stopPointName: {
    text: string;
  };
  nameSuffix?: {
    text: string;
  };
}

/**
 * Timed leg from OJP SDK representing a public transport segment.
 */
interface OjpTimedLeg {
  legBoard: OjpStopPoint;
  legAlight: OjpStopPoint;
}

/**
 * Leg structure from OJP SDK. A trip consists of multiple legs.
 * Each leg can be a timedLeg (public transport), transferLeg (walking between stations),
 * or continuousLeg (walking to/from stations).
 */
interface OjpLeg {
  timedLeg?: OjpTimedLeg;
}

/**
 * Subset of trip properties from ojp-sdk-next used for connection selection.
 * Defined locally to avoid coupling to SDK internals and to type only what we need.
 * If the SDK's Trip type changes, this interface should be updated accordingly.
 */
export interface OjpTrip {
  duration: string;
  startTime: string;
  endTime: string;
  transfers: number;
  leg: OjpLeg[];
}

/**
 * Extract Didok station ID from OJP stopPointRef.
 * Format: "ch:1:sloid:8507000" -> "8507000"
 */
function extractDidokId(ref: string | undefined): string | undefined {
  if (!ref) return undefined;

  // Handle sloid format: "ch:1:sloid:8507000" or "ch:1:sloid:8507000:1"
  const sloidMatch = ref.match(/sloid:(\d+)/);
  if (sloidMatch) {
    return sloidMatch[1];
  }

  // Handle direct numeric ID
  if (/^\d+$/.test(ref)) {
    return ref;
  }

  return undefined;
}

/**
 * Regex patterns for OJP accessibility keywords that should be filtered from station names.
 * These are transport mode or accessibility attributes, not location suffixes.
 *
 * Patterns:
 * - PLATFORM_* keywords (e.g., PLATFORM_ACCESS_WITH_ASSISTANCE, PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE)
 * - *WHEELCHAIR* keywords (e.g., WHEELCHAIR_ACCESS, NO_WHEELCHAIR_ACCESS)
 * - Explicit keywords: ALTERNATIVE_TRANSPORT, SHUTTLE_BUS, RAIL_REPLACEMENT
 */
const OJP_ACCESSIBILITY_PATTERNS = [
  /\bPLATFORM_[A-Z_]+\b/g, // Matches PLATFORM_ACCESS_*, PLATFORM_NOT_*, etc.
  /\b[A-Z_]*WHEELCHAIR[A-Z_]*\b/g, // Matches *WHEELCHAIR* keywords
  /\bALTERNATIVE_TRANSPORT\b/g,
  /\bSHUTTLE_BUS\b/g,
  /\bRAIL_REPLACEMENT\b/g,
];

/**
 * Check if a string is entirely an OJP accessibility keyword.
 */
function isAccessibilityKeyword(text: string): boolean {
  return OJP_ACCESSIBILITY_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0; // Reset regex state
    const match = text.match(pattern);
    return match !== null && match[0] === text;
  });
}

/**
 * Clean a station name suffix by removing OJP accessibility keywords.
 * Returns undefined if the suffix is entirely an accessibility keyword.
 */
function cleanNameSuffix(suffix: string | undefined): string | undefined {
  if (!suffix) return undefined;

  // Check if the entire suffix is an accessibility keyword
  if (isAccessibilityKeyword(suffix)) {
    return undefined;
  }

  // Remove accessibility keywords from the suffix
  let cleaned = suffix;
  for (const pattern of OJP_ACCESSIBILITY_PATTERNS) {
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, "");
  }

  // Clean up multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned || undefined;
}

/**
 * Build full station name by combining stopPointName and optional nameSuffix.
 * Filters out OJP accessibility keywords from the suffix.
 * Example: "Schönenwerd" + "SO, Bahnhof" -> "Schönenwerd SO, Bahnhof"
 * Example: "Paradies" + "ALTERNATIVE_TRANSPORT" -> "Paradies" (keyword filtered)
 */
function buildStationName(stopPoint: OjpStopPoint): string {
  const baseName = stopPoint.stopPointName.text;
  const suffix = cleanNameSuffix(stopPoint.nameSuffix?.text);

  if (suffix) {
    return `${baseName} ${suffix}`;
  }
  return baseName;
}

/**
 * Extract station info from a stop point.
 */
function extractStationFromStopPoint(stopPoint: OjpStopPoint | undefined): StationInfo | undefined {
  if (!stopPoint) return undefined;

  const id = extractDidokId(stopPoint.stopPointRef);
  if (!id) return undefined;

  return {
    id,
    name: buildStationName(stopPoint),
  };
}

/**
 * Find the first timed leg in a trip (first public transport segment).
 */
function findFirstTimedLeg(trip: OjpTrip): OjpTimedLeg | undefined {
  for (const leg of trip.leg) {
    if (leg.timedLeg) {
      return leg.timedLeg;
    }
  }
  return undefined;
}

/**
 * Find the last timed leg in a trip (last public transport segment).
 */
function findLastTimedLeg(trip: OjpTrip): OjpTimedLeg | undefined {
  for (let i = trip.leg.length - 1; i >= 0; i--) {
    const leg = trip.leg[i];
    if (leg?.timedLeg) {
      return leg.timedLeg;
    }
  }
  return undefined;
}

/**
 * Extract origin station info from an OJP trip.
 * Gets the boarding station from the first timed leg.
 */
export function extractOriginStation(trip: OjpTrip): StationInfo | undefined {
  const firstTimedLeg = findFirstTimedLeg(trip);
  return extractStationFromStopPoint(firstTimedLeg?.legBoard);
}

/**
 * Extract destination station info from an OJP trip.
 * Gets the alighting station from the last timed leg.
 */
export function extractDestinationStation(trip: OjpTrip): StationInfo | undefined {
  const lastTimedLeg = findLastTimedLeg(trip);
  return extractStationFromStopPoint(lastTimedLeg?.legAlight);
}

/**
 * Select the best trip based on target arrival time.
 *
 * Selection criteria (in priority order):
 * 1. Must arrive on time (before or at target arrival time)
 * 2. Prefer fewer transfers (less stressful journey)
 * 3. Prefer arrival closest to target time (minimize waiting)
 *
 * If no targetArrivalTime is provided, returns the first trip (earliest departure).
 *
 * @param trips Array of trips from OJP API
 * @param targetArrivalTime Optional target arrival time
 * @returns The best trip for the given criteria
 */
export function selectBestTrip(trips: OjpTrip[], targetArrivalTime?: Date): OjpTrip {
  // If no target time, return first trip (earliest departure)
  if (!targetArrivalTime) {
    return trips[0]!;
  }

  const targetTime = targetArrivalTime.getTime();

  // Find trips that arrive on time (before or at target)
  const onTimeTrips = trips.filter((trip) => {
    const arrivalTime = new Date(trip.endTime).getTime();
    return arrivalTime <= targetTime;
  });

  // If no trips arrive on time, return the first trip (earliest arrival)
  if (onTimeTrips.length === 0) {
    return trips[0]!;
  }

  // Select best trip: fewer transfers first, then closest arrival to target
  return onTimeTrips.reduce((best, trip) => {
    // Prefer fewer transfers
    if (trip.transfers < best.transfers) {
      return trip;
    }
    if (trip.transfers > best.transfers) {
      return best;
    }
    // Same transfers: prefer later arrival (closer to target time)
    const bestArrival = new Date(best.endTime).getTime();
    const tripArrival = new Date(trip.endTime).getTime();
    return tripArrival > bestArrival ? trip : best;
  });
}

/**
 * Parse ISO 8601 duration string to minutes.
 *
 * @param duration ISO 8601 duration string (e.g., "PT1H30M")
 * @returns Duration in minutes
 */
function parseDurationToMinutes(duration: string): number {
  if (!duration.startsWith("PT")) {
    return 0;
  }

  // Extract hours, minutes, seconds with simple patterns
  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);
  const secondsMatch = duration.match(/(\d+)S/);

  const hours = hoursMatch ? parseInt(hoursMatch[1]!, 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]!, 10) : 0;
  const seconds = secondsMatch ? parseInt(secondsMatch[1]!, 10) : 0;

  return hours * 60 + minutes + Math.ceil(seconds / 60);
}
