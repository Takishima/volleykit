import type { Locale } from "@/i18n";
import type { SbbLinkTarget } from "@/stores/settings";
import type { StationInfo } from "@/services/transport/types";

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
 * Uses the official SBB deep linking format:
 * https://www.sbb.ch/{lang}?stops=[{origin},{destination}]&date=YYYY-MM-DD&time=HH:MM
 *
 * @param params - The parameters for generating the URL
 * @param target - Whether to generate a website or app URL
 * @returns The timetable URL
 *
 * @example
 * ```ts
 * const url = generateSbbUrl({
 *   destination: "Basel",
 *   date: new Date("2024-12-28"),
 *   arrivalTime: new Date("2024-12-28T14:30:00"),
 *   language: "de",
 * }, "website");
 * ```
 */
export function generateSbbUrl(
  params: SbbUrlParams,
  target: SbbLinkTarget,
): string {
  // Target parameter kept for future use (e.g., if SBB provides app-specific deep links)
  void target;

  const { destination, date, arrivalTime, language = "de", originStation, destinationStation } = params;

  const formattedDate = formatDateSbb(date);
  const formattedTime = formatTime(arrivalTime);

  // Build the stops JSON array per SBB deep linking spec
  // First element is origin with station ID if available, empty otherwise
  // Second element is destination with Didok ID if available, or just label
  const originStop = originStation
    ? { value: originStation.id, type: "ID", label: originStation.name }
    : { value: "", type: "", label: "" };

  const destinationStop = destinationStation
    ? { value: destinationStation.id, type: "ID", label: destinationStation.name }
    : { value: "", type: "", label: destination };

  const stops = [
    originStop,
    destinationStop,
  ];

  // SBB expects full URL encoding for the stops JSON
  // Date, time, and moment values must be quoted: date="2024-12-28"
  const stopsJson = encodeURIComponent(JSON.stringify(stops));
  const quotedDate = `%22${formattedDate}%22`;
  const quotedTime = `%22${formattedTime}%22`;

  // moment=ARRIVAL indicates arrival time (default is DEPARTURE)
  return `https://www.sbb.ch/${language}?stops=${stopsJson}&date=${quotedDate}&time=${quotedTime}&moment=%22ARRIVAL%22`;
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
