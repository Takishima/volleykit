import type { Locale } from "@/i18n";
import type { StationInfo } from "@/shared/services/transport/types";

/**
 * Parameters for generating a public transport timetable URL.
 */
export interface SbbUrlParams {
  /** Destination location (city, station, or address) */
  destination: string;
  /** Date of travel (used to format the date parameter) */
  date: Date;
  /** Target arrival time at destination */
  arrivalTime: Date;
  /** Language code for the URL */
  language?: Locale;
  /** Origin station info with Didok ID for precise routing */
  originStation?: StationInfo;
  /** Destination station info with Didok ID for precise routing */
  destinationStation?: StationInfo;
  /** Fallback origin address when station lookup fails (e.g., "Zürich, Bahnhofstrasse 1") */
  originAddress?: string;
}

/**
 * Normalize a Swiss station ID to the full UIC format.
 * SBB requires the "85" country prefix for Swiss stations.
 * Swiss UIC codes are 7 digits in format 85XXXXX.
 *
 * @param id - Station ID that may or may not have the "85" prefix
 * @returns The normalized 7-digit ID with "85" prefix
 *
 * @example
 * normalizeSwissStationId("4000") // "8504000"
 * normalizeSwissStationId("8504000") // "8504000"
 * normalizeSwissStationId("73232") // "8573232"
 */
function normalizeSwissStationId(id: string): string {
  // If the ID already starts with "85" and is 7 digits, it's already normalized
  if (id.startsWith("85") && id.length === 7) {
    return id;
  }

  // If it's a shorter numeric ID without "85" prefix, pad to 5 digits and add prefix
  if (/^\d+$/.test(id) && !id.startsWith("85")) {
    return `85${id.padStart(5, "0")}`;
  }

  // Return as-is if it doesn't match expected patterns
  return id;
}

/**
 * Format a date as YYYY-MM-DD for SBB URL parameters.
 */
function formatDateSbb(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Format a time as HH:MM for timetable URL parameters.
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Generate a public transport timetable URL for a given destination and arrival time.
 *
 * Uses two SBB deep linking formats:
 * 1. When station IDs are available: https://www.sbb.ch/{lang}?stops=[{origin},{destination}]&date=...
 * 2. For addresses without IDs: https://www.sbb.ch/{lang}?von=address&nach=address&date=...
 *
 * @param params - The parameters for generating the URL
 * @returns The timetable URL
 *
 * @example
 * ```ts
 * const url = generateSbbUrl({
 *   destination: "Basel",
 *   date: new Date("2024-12-28"),
 *   arrivalTime: new Date("2024-12-28T14:30:00"),
 *   language: "de",
 * });
 * ```
 */
export function generateSbbUrl(params: SbbUrlParams): string {
  const { destination, date, arrivalTime, language = "de", originStation, destinationStation, originAddress } = params;

  const formattedDate = formatDateSbb(date);
  const formattedTime = formatTime(arrivalTime);

  // Determine origin and destination names
  const origin = originStation?.name ?? originAddress;
  const dest = destinationStation?.name ?? destination;

  // Generate SBB website URL
  // Common time/date parameters (quoted per SBB spec)
  const quotedDate = `%22${formattedDate}%22`;
  const quotedTime = `%22${formattedTime}%22`;
  const baseParams = `date=${quotedDate}&time=${quotedTime}&moment=%22ARRIVAL%22`;

  // When both stations have IDs, use the stops JSON format for precise routing
  if (originStation && destinationStation) {
    const stops = [
      { value: normalizeSwissStationId(originStation.id), type: "ID", label: originStation.name },
      { value: normalizeSwissStationId(destinationStation.id), type: "ID", label: destinationStation.name },
    ];
    const stopsJson = encodeURIComponent(JSON.stringify(stops));
    return `https://www.sbb.ch/${language}?stops=${stopsJson}&${baseParams}`;
  }

  // For addresses without station IDs, use the simpler von/nach format
  // SBB will geocode these addresses automatically
  const urlParams = new URLSearchParams();
  if (origin) {
    urlParams.set("von", origin);
  }
  urlParams.set("nach", dest);

  return `https://www.sbb.ch/${language}?${urlParams.toString()}&${baseParams}`;
}

/**
 * Calculate the target arrival time for a game, accounting for the arrival buffer.
 *
 * @param gameStartTime - The game start time as an ISO string or Date
 * @param arrivalBufferMinutes - Minutes before game start to arrive
 * @returns The target arrival time
 */
export function calculateArrivalTime(
  gameStartTime: string | Date,
  arrivalBufferMinutes: number,
): Date {
  const startTime =
    typeof gameStartTime === "string"
      ? new Date(gameStartTime)
      : gameStartTime;
  return new Date(startTime.getTime() - arrivalBufferMinutes * 60 * 1000);
}

/**
 * Open an SBB URL in a new tab.
 *
 * @param url - The SBB URL to open
 */
export function openSbbUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
