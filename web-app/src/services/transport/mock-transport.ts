/**
 * Mock transport API for demo mode.
 * Provides realistic travel times based on straight-line distance.
 */

import type { Coordinates, TravelTimeResult, TravelTimeOptions, StationInfo } from "./types";

/** Network delay for realistic demo behavior */
const MOCK_DELAY_MS = 100;

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
  const baseTimeMinutes = 15; // Getting to station, waiting
  const averageSpeedKmh = 40; // Average speed including stops
  const travelMinutes = (distanceKm / averageSpeedKmh) * 60;

  return Math.round(baseTimeMinutes + travelMinutes);
}

/**
 * Estimate number of transfers based on distance.
 *
 * @param distanceKm Straight-line distance in kilometers
 * @returns Estimated number of transfers
 */
function estimateTransfers(distanceKm: number): number {
  if (distanceKm < 10) return 0;
  if (distanceKm < 30) return 1;
  if (distanceKm < 60) return 2;
  return 3;
}

/**
 * Calculate straight-line distance between two coordinates using Haversine formula.
 *
 * @param from Origin coordinates
 * @param to Destination coordinates
 * @returns Distance in kilometers
 */
function calculateDistanceKm(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers

  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Simulate network delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a mock Didok station ID from coordinates.
 * Uses a hash of the coordinates to create a realistic-looking ID.
 */
function generateMockStationId(coords: Coordinates): string {
  // Create a deterministic ID from coordinates (Swiss Didok IDs are 7 digits starting with 85)
  const latHash = Math.abs(Math.round(coords.latitude * 10000));
  const lonHash = Math.abs(Math.round(coords.longitude * 1000));
  const combined = (latHash + lonHash) % 100000;
  return `85${String(combined).padStart(5, "0")}`;
}

/**
 * Generate a mock station name from coordinates.
 * In demo mode, we just use a generic name.
 */
function generateMockStationName(coords: Coordinates): string {
  // Generate a simple name based on rounded coordinates
  const latDeg = Math.round(coords.latitude * 10) / 10;
  const lonDeg = Math.round(coords.longitude * 10) / 10;
  return `Station ${latDeg}N ${lonDeg}E`;
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
  options: TravelTimeOptions = {},
): Promise<TravelTimeResult> {
  // Simulate network delay
  await delay(MOCK_DELAY_MS);

  // Calculate distance and estimate travel time
  const distanceKm = calculateDistanceKm(from, to);
  const durationMinutes = estimateTravelTimeFromDistance(distanceKm);
  const transfers = estimateTransfers(distanceKm);

  // Calculate departure and arrival times
  const departureTime = options.departureTime ?? new Date();
  const arrivalTime = new Date(departureTime.getTime() + durationMinutes * 60 * 1000);

  // Generate mock origin and destination stations for SBB deep linking
  // Use provided labels if available, otherwise fall back to coordinate-based names
  const originStation: StationInfo = {
    id: generateMockStationId(from),
    name: options.originLabel ?? generateMockStationName(from),
  };

  const destinationStation: StationInfo = {
    id: generateMockStationId(to),
    name: options.destinationLabel ?? generateMockStationName(to),
  };

  return {
    durationMinutes,
    departureTime: departureTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    transfers,
    originStation,
    destinationStation,
    tripData: undefined,
  };
}

/**
 * Mock transport API object matching the real API interface.
 */
export const mockTransportApi = {
  calculateTravelTime: calculateMockTravelTime,
  isConfigured: (): boolean => true, // Always "configured" in demo mode
};
