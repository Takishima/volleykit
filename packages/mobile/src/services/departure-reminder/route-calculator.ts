/**
 * Route calculator for departure reminders.
 *
 * Wraps the OJP SDK for Swiss public transport routing with caching.
 */

import type { Coordinates, RouteResult, TripLeg } from '../../types/departureReminder';

/** OJP 2.0 API endpoint */
const OJP_API_ENDPOINT = 'https://api.opentransportdata.swiss/ojp20';

/** Minimum delay between API requests (50 req/min = 1.2s to be safe) */
const RATE_LIMIT_DELAY_MS = 1200;

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Timestamp of the last API request */
let lastRequestTime = 0;

/** Lazily loaded OJP SDK module */
let ojpSdk: typeof import('ojp-sdk-next') | null = null;

/**
 * Route cache entry.
 */
interface CacheEntry {
  result: RouteResult;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Route cache keyed by origin+destination+time.
 */
const routeCache = new Map<string, CacheEntry>();

/**
 * Generate cache key from route parameters.
 */
function getCacheKey(
  from: Coordinates,
  to: Coordinates,
  targetArrivalTime: Date
): string {
  // Round time to 5-minute intervals for better cache hits
  const roundedTime = new Date(targetArrivalTime);
  roundedTime.setMinutes(Math.floor(roundedTime.getMinutes() / 5) * 5);
  roundedTime.setSeconds(0);
  roundedTime.setMilliseconds(0);

  // Round coordinates to ~100m precision
  const fromLat = from.latitude.toFixed(3);
  const fromLon = from.longitude.toFixed(3);
  const toLat = to.latitude.toFixed(3);
  const toLon = to.longitude.toFixed(3);

  return `${fromLat},${fromLon}|${toLat},${toLon}|${roundedTime.getTime()}`;
}

/**
 * Get route from cache if valid.
 */
function getFromCache(key: string): RouteResult | null {
  const entry = routeCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    routeCache.delete(key);
    return null;
  }

  return {
    ...entry.result,
    isCached: true,
    cachedAt: new Date(entry.cachedAt).toISOString(),
  };
}

/**
 * Save route to cache.
 */
function saveToCache(key: string, result: RouteResult): void {
  const now = Date.now();
  routeCache.set(key, {
    result: { ...result, isCached: false },
    cachedAt: now,
    expiresAt: now + CACHE_TTL_MS,
  });

  // Clean expired entries
  for (const [k, entry] of routeCache) {
    if (Date.now() > entry.expiresAt) {
      routeCache.delete(k);
    }
  }
}

/**
 * Load the OJP SDK on demand.
 */
async function loadOjpSdk(): Promise<typeof import('ojp-sdk-next')> {
  if (!ojpSdk) {
    ojpSdk = await import('ojp-sdk-next');
  }
  return ojpSdk;
}

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
 * Get API key from environment.
 */
function getApiKey(): string | undefined {
  // React Native uses process.env.EXPO_PUBLIC_* for env variables
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (process.env as any).EXPO_PUBLIC_OJP_API_KEY as string | undefined;
}

/**
 * Check if the OJP API is configured.
 */
export function isOjpConfigured(): boolean {
  const apiKey = getApiKey();
  return Boolean(apiKey && apiKey !== 'your_api_key_here');
}

/**
 * Route calculation error.
 */
export class RouteCalculationError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'RouteCalculationError';
    this.code = code;
  }
}

/**
 * OJP stop point structure.
 */
interface OjpStopPoint {
  stopPointRef: string;
  stopPointName: { text: string };
}

/**
 * OJP timed leg structure.
 */
interface OjpTimedLeg {
  legBoard: OjpStopPoint;
  legAlight: OjpStopPoint;
  service?: {
    publishedServiceName?: { text: string };
    destinationText?: { text: string };
    serviceSection?: {
      publishedServiceName?: { text: string };
      mode?: { ptMode?: string };
    };
  };
  legTrack?: {
    trackSection?: {
      departure?: { timetabledTime?: string };
      arrival?: { timetabledTime?: string };
    };
  };
  boardingTime?: string;
  alightingTime?: string;
}

/**
 * OJP continuous leg structure.
 */
interface OjpContinuousLeg {
  duration: string;
}

/**
 * OJP leg structure.
 */
interface OjpLeg {
  timedLeg?: OjpTimedLeg;
  continuousLeg?: OjpContinuousLeg;
}

/**
 * OJP trip structure.
 */
interface OjpTrip {
  duration: string;
  startTime: string;
  endTime: string;
  transfers: number;
  leg: OjpLeg[];
}

/**
 * Convert OJP leg to our TripLeg type.
 */
function convertToTripLeg(leg: OjpLeg): TripLeg | null {
  if (leg.continuousLeg) {
    // Walking leg
    const durationMinutes = parseDurationToMinutes(leg.continuousLeg.duration);
    const now = new Date();
    const later = new Date(now.getTime() + durationMinutes * 60 * 1000);

    return {
      mode: 'walk',
      line: null,
      direction: null,
      departureTime: now.toISOString(),
      arrivalTime: later.toISOString(),
      fromStop: 'Current location',
      toStop: 'Transit stop',
    };
  }

  if (leg.timedLeg) {
    const timedLeg = leg.timedLeg;
    const mode = detectTransportMode(timedLeg);
    const line = timedLeg.service?.publishedServiceName?.text ?? null;
    const direction = timedLeg.service?.destinationText?.text ?? null;

    return {
      mode,
      line,
      direction,
      departureTime: timedLeg.boardingTime ?? '',
      arrivalTime: timedLeg.alightingTime ?? '',
      fromStop: timedLeg.legBoard.stopPointName.text,
      toStop: timedLeg.legAlight.stopPointName.text,
    };
  }

  return null;
}

/**
 * Detect transport mode from timed leg.
 */
function detectTransportMode(
  leg: OjpTimedLeg
): 'bus' | 'train' | 'tram' | 'walk' | 'metro' | 'ferry' {
  const ptMode = leg.service?.serviceSection?.mode?.ptMode?.toLowerCase() ?? '';

  if (ptMode.includes('rail') || ptMode.includes('train')) return 'train';
  if (ptMode.includes('bus')) return 'bus';
  if (ptMode.includes('tram')) return 'tram';
  if (ptMode.includes('metro') || ptMode.includes('underground')) return 'metro';
  if (ptMode.includes('ferry') || ptMode.includes('water')) return 'ferry';

  return 'bus'; // Default to bus for unknown modes
}

/**
 * Parse ISO 8601 duration string to minutes.
 */
function parseDurationToMinutes(duration: string): number {
  if (!duration.startsWith('PT')) return 0;

  let totalMinutes = 0;

  // Extract hours
  const hoursMatch = duration.match(/(\d+)H/);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1]!, 10) * 60;
  }

  // Extract minutes
  const minutesMatch = duration.match(/(\d+)M/);
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]!, 10);
  }

  // Extract seconds (round up to minutes)
  const secondsMatch = duration.match(/(\d+)S/);
  if (secondsMatch) {
    totalMinutes += Math.ceil(parseInt(secondsMatch[1]!, 10) / 60);
  }

  return totalMinutes;
}

/**
 * Find the first timed leg for the nearest stop info.
 */
function findFirstTimedLeg(trip: OjpTrip): OjpTimedLeg | null {
  for (const leg of trip.leg) {
    if (leg.timedLeg) return leg.timedLeg;
  }
  return null;
}

/**
 * Calculate the walking time to first transit stop.
 */
function calculateWalkTimeMinutes(trip: OjpTrip): number {
  if (trip.leg[0]?.continuousLeg) {
    return parseDurationToMinutes(trip.leg[0].continuousLeg.duration);
  }
  return 0;
}

/**
 * Calculate route between two locations.
 *
 * @param from Origin coordinates
 * @param to Destination coordinates
 * @param targetArrivalTime When user needs to arrive
 * @returns Route calculation result
 */
export async function calculateRoute(
  from: Coordinates,
  to: Coordinates,
  targetArrivalTime: Date
): Promise<RouteResult> {
  // Check cache first
  const cacheKey = getCacheKey(from, to, targetArrivalTime);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new RouteCalculationError('OJP API key not configured', 'API_NOT_CONFIGURED');
  }

  // Respect rate limits
  await waitForRateLimit();

  try {
    const { SDK, TripRequest, Place } = await loadOjpSdk();

    // Create SDK instance
    const sdk = SDK.create('VolleyKit', { url: OJP_API_ENDPOINT, authToken: apiKey }, 'de');

    // Create places from coordinates
    const fromPlace = Place.initWithCoords(from.longitude, from.latitude);
    const toPlace = Place.initWithCoords(to.longitude, to.latitude);

    // Create trip request with arrival time
    const tripRequest = TripRequest.initWithPlaces(fromPlace, toPlace);
    tripRequest.setArrivalDatetime(targetArrivalTime);
    tripRequest.setPublicTransportRequest();

    // Fetch trips
    const response = await tripRequest.fetchResponse(sdk);

    if (!response.ok) {
      throw new RouteCalculationError(response.error.message, 'API_ERROR');
    }

    const tripResults = response.value.tripResult ?? [];
    if (tripResults.length === 0) {
      throw new RouteCalculationError('No route found between locations', 'NO_ROUTE');
    }

    // Get the first/best trip
    const trip = tripResults[0]!.trip as OjpTrip;

    // Extract route information
    const durationMinutes = parseDurationToMinutes(trip.duration);
    const walkTimeMinutes = calculateWalkTimeMinutes(trip);
    const firstTimedLeg = findFirstTimedLeg(trip);

    // Convert legs
    const legs: TripLeg[] = [];
    for (const leg of trip.leg) {
      const converted = convertToTripLeg(leg);
      if (converted) legs.push(converted);
    }

    // Build result
    const result: RouteResult = {
      durationMinutes,
      departureTime: trip.startTime,
      arrivalTime: trip.endTime,
      walkTimeMinutes,
      nearestStop: {
        name: firstTimedLeg?.legBoard.stopPointName.text ?? 'Unknown',
        distanceMeters: walkTimeMinutes * 80, // Estimate ~80m per minute walking
        walkTimeMinutes,
      },
      legs,
      isCached: false,
    };

    // Save to cache
    saveToCache(cacheKey, result);

    return result;
  } catch (error) {
    if (error instanceof RouteCalculationError) throw error;

    const message = error instanceof Error ? error.message : 'Route calculation failed';
    throw new RouteCalculationError(message, 'API_ERROR');
  }
}

/**
 * Clear the route cache.
 */
export function clearRouteCache(): void {
  routeCache.clear();
}

/**
 * Get cache stats for debugging.
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: routeCache.size,
    keys: Array.from(routeCache.keys()),
  };
}
