/**
 * OJP 2.0 client for Swiss public transport routing.
 * Wraps the ojp-sdk-next package with rate limiting.
 *
 * The SDK is loaded lazily to reduce initial bundle size.
 *
 * Trip extraction and selection helpers are in ./ojp-trip-helpers.ts
 */

import { getApiBaseUrl } from '@/api/constants'

import {
  selectBestTrip,
  extractOriginStation,
  extractDestinationStation,
  calculateActualArrivalTime,
  extractFinalWalkingMinutes,
  parseDurationToMinutes,
} from './ojp-trip-helpers'
import { TransportApiError } from './types'

import type { OjpTrip } from './ojp-trip-helpers'
import type { Coordinates, TravelTimeResult, TravelTimeOptions } from './types'

// Re-export trip helpers and types for consumers
export {
  selectBestTrip,
  extractOriginStation,
  extractDestinationStation,
  extractFinalWalkingMinutes,
  calculateActualArrivalTime,
} from './ojp-trip-helpers'
export type { OjpTrip } from './ojp-trip-helpers'

// =============================================================================
// SDK Lazy Loading & Rate Limiting
// =============================================================================

/** Lazily loaded OJP SDK module */
let ojpSdk: typeof import('ojp-sdk-next') | null = null

/**
 * Load the OJP SDK on demand.
 */
async function loadOjpSdk(): Promise<typeof import('ojp-sdk-next')> {
  if (!ojpSdk) {
    ojpSdk = await import('ojp-sdk-next')
  }
  return ojpSdk
}

/**
 * OJP 2.0 API endpoint.
 * Routes through the Cloudflare Worker proxy to keep the API key server-side.
 * Falls back to the direct endpoint if VITE_OJP_API_KEY is set (legacy/dev).
 */
function getOjpEndpoint(): string {
  if (getApiBaseUrl()) {
    return `${getApiBaseUrl()}/ojp`
  }
  return 'https://api.opentransportdata.swiss/ojp20'
}

/** Minimum delay between API requests (50 req/min = 1.2s to be safe) */
const RATE_LIMIT_DELAY_MS = 1200

/** Timestamp of the last API request */
let lastRequestTime = 0

/**
 * Wait if necessary to respect rate limits.
 */
async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    const waitTime = RATE_LIMIT_DELAY_MS - timeSinceLastRequest
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }
  lastRequestTime = Date.now()
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if the OJP API is configured.
 * In production, the API key is server-side (worker proxy) so we only need the proxy URL.
 * In development, VITE_OJP_API_KEY can be used for direct access.
 */
export function isOjpConfigured(): boolean {
  // Production: proxy URL is configured, key lives server-side
  if (getApiBaseUrl()) {
    return true
  }
  // Development fallback: direct API key
  const apiKey = import.meta.env.VITE_OJP_API_KEY
  return Boolean(apiKey && apiKey !== 'your_api_key_here')
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
  options: TravelTimeOptions = {}
): Promise<TravelTimeResult> {
  if (!isOjpConfigured()) {
    throw new TransportApiError('OJP API key not configured', 'API_NOT_CONFIGURED')
  }

  // Wait for rate limit before making request
  await waitForRateLimit()

  try {
    // Load SDK lazily
    const { SDK, TripRequest, Place } = await loadOjpSdk()

    // When using the worker proxy, the API key is added server-side.
    // Pass a placeholder token — the proxy ignores it and uses its own.
    const ojpEndpoint = getOjpEndpoint()
    const authToken = import.meta.env.VITE_OJP_API_KEY || 'proxy'
    const sdk = SDK.create('VolleyKit', { url: ojpEndpoint, authToken }, 'de')

    // Create places from coordinates
    const fromPlace = Place.initWithCoords(from.longitude, from.latitude)
    const toPlace = Place.initWithCoords(to.longitude, to.latitude)

    // Create trip request
    const tripRequest = TripRequest.initWithPlaces(fromPlace, toPlace)

    // Set departure time if provided
    const departureTime = options.departureTime ?? new Date()
    tripRequest.setDepartureDatetime(departureTime)

    // Configure for public transport
    tripRequest.setPublicTransportRequest()

    // Fetch trips using the new SDK API pattern
    const response = await tripRequest.fetchResponse(sdk)

    // Check for errors
    if (!response.ok) {
      throw new TransportApiError(response.error.message, 'API_ERROR')
    }

    // Extract trips from response
    const tripResults = response.value.tripResult ?? []
    if (tripResults.length === 0) {
      throw new TransportApiError('No route found between locations', 'NO_ROUTE')
    }

    // Map trip results to our OjpTrip interface (each tripResult has a trip property)
    const trips = tripResults.map((tr) => tr.trip as OjpTrip)

    // Select the best trip based on target arrival time or take earliest departure
    const trip = selectBestTrip(trips, options.targetArrivalTime)

    // Parse duration from ISO 8601 duration string (e.g., "PT1H30M")
    const durationMinutes = parseDurationToMinutes(trip.duration)

    // Extract origin and destination stations for SBB deep linking
    const originStation = extractOriginStation(trip)
    const destinationStation = extractDestinationStation(trip)

    // Calculate actual arrival time including walking from final stop to destination
    const arrivalTime = calculateActualArrivalTime(trip)
    const finalWalkingMinutes = extractFinalWalkingMinutes(trip)

    return {
      durationMinutes,
      departureTime: trip.startTime,
      arrivalTime,
      transfers: trip.transfers,
      originStation,
      destinationStation,
      finalWalkingMinutes,
      tripData: options.includeTrips ? trip : undefined,
    }
  } catch (error) {
    if (error instanceof TransportApiError) {
      throw error
    }

    // Wrap unknown errors
    const message = error instanceof Error ? error.message : 'Unknown transport API error'
    throw new TransportApiError(message, 'API_ERROR')
  }
}
