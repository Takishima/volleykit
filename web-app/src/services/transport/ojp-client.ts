/**
 * OJP 2.0 client for Swiss public transport routing.
 * Wraps the ojp-sdk-next package with rate limiting.
 *
 * The SDK is loaded lazily to reduce initial bundle size.
 */

import type { Coordinates, TravelTimeResult, TravelTimeOptions } from "./types";
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

    // Get the first (fastest) trip - safe access after length check
    const trip = trips[0]!;

    // Parse duration from ISO 8601 duration string (e.g., "PT1H30M")
    const durationMinutes = parseDurationToMinutes(trip.duration);

    return {
      durationMinutes,
      departureTime: trip.startTime,
      arrivalTime: trip.endTime,
      transfers: trip.transfers,
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
