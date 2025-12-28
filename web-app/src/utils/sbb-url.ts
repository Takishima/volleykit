import type { Locale } from "@/i18n";
import type { SbbLinkTarget } from "@/stores/settings";

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

  const { destination, date, arrivalTime, language = "de" } = params;

  const formattedDate = formatDateSbb(date);
  const formattedTime = formatTime(arrivalTime);

  // Build the stops JSON array per SBB deep linking spec
  // First element is origin (empty = user sets their starting point)
  // Second element is destination with label
  const stops = [
    { value: "", type: "", label: "" },
    { value: "", type: "", label: destination },
  ];

  // SBB expects: only quotes encoded (%22), brackets/colons literal
  // Date and time values must be quoted: date="2024-12-28"
  const stopsJson = JSON.stringify(stops).replace(/"/g, "%22");
  const quotedDate = `%22${formattedDate}%22`;
  const quotedTime = `%22${formattedTime}%22`;

  return `https://www.sbb.ch/${language}?stops=${stopsJson}&date=${quotedDate}&time=${quotedTime}`;
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
