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

    // Create SDK instance
    const sdk = new SDK("VolleyKit", { url: OJP_API_ENDPOINT, authToken: apiKey }, "de");

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

    // Fetch trips
    const trips = await sdk.fetchTrips(tripRequest);

    // Check for results
    if (!trips || trips.length === 0) {
      throw new TransportApiError("No route found between locations", "NO_ROUTE");
    }

    // Select the best trip based on target arrival time or take earliest departure
    const trip = selectBestTrip(trips, options.targetArrivalTime);

    // Log trip for debugging station extraction
    console.log("[OJP] Selected trip toLocation:", JSON.stringify(trip.toLocation, null, 2));

    // Parse duration from ISO 8601 duration string (e.g., "PT1H30M")
    const durationMinutes = parseDurationToMinutes(trip.duration);

    // Extract destination station for SBB deep linking
    const destinationStation = extractDestinationStation(trip);
    console.log("[OJP] Extracted destination station:", destinationStation);

    return {
      durationMinutes,
      departureTime: trip.startTime,
      arrivalTime: trip.endTime,
      transfers: trip.transfers,
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
 * Location type from ojp-sdk-next for extracting station info.
 */
interface OjpLocation {
  stopPointRef?: string;
  locationName?: string;
  stopPlace?: {
    stopPlaceRef?: string;
    stopPlaceName?: string;
  };
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
  toLocation?: OjpLocation;
}

/**
 * Extract Didok station ID from OJP stopPointRef or stopPlaceRef.
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
 * Extract destination station info from an OJP trip.
 */
export function extractDestinationStation(trip: OjpTrip): StationInfo | undefined {
  const toLocation = trip.toLocation;
  if (!toLocation) return undefined;

  // Try stopPlaceRef first (more reliable for SBB linking)
  const stopPlaceId = extractDidokId(toLocation.stopPlace?.stopPlaceRef);
  if (stopPlaceId && toLocation.stopPlace?.stopPlaceName) {
    return {
      id: stopPlaceId,
      name: toLocation.stopPlace.stopPlaceName,
    };
  }

  // Fall back to stopPointRef
  const stopPointId = extractDidokId(toLocation.stopPointRef);
  if (stopPointId) {
    return {
      id: stopPointId,
      name: toLocation.locationName ?? toLocation.stopPlace?.stopPlaceName ?? "",
    };
  }

  return undefined;
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
