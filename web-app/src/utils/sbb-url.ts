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
 * Format a date as DD.MM.YYYY for timetable URL parameters.
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
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
 * Uses search.ch for website (reliable Swiss public transport timetable)
 * and SBB mobile app universal link for app target.
 *
 * @param params - The parameters for generating the URL
 * @param target - Whether to generate a website or app URL
 * @returns The timetable URL
 *
 * @example
 * ```ts
 * const url = generateSbbUrl({
 *   destination: "Bern",
 *   date: new Date("2024-12-28"),
 *   arrivalTime: new Date("2024-12-28T14:30:00"),
 * }, "website");
 * // Returns: https://search.ch/fahrplan/?to=Bern&date=28.12.2024&time=14:30&time_type=arrival
 * ```
 */
export function generateSbbUrl(
  params: SbbUrlParams,
  target: SbbLinkTarget,
): string {
  const { destination, date, arrivalTime } = params;

  const formattedDate = formatDate(date);
  const formattedTime = formatTime(arrivalTime);

  if (target === "app") {
    // Use the SBB mobile app universal link
    // Format: sbbmobile://timetable?to=...&date=...&time=...&timeType=arrival
    // Falls back to app store if app not installed
    const appParams = new URLSearchParams({
      to: destination,
      date: formattedDate,
      time: formattedTime,
      timeType: "arrival",
    });
    return `https://app.sbbmobile.ch/timetable?${appParams.toString()}`;
  }

  // Website URL - use search.ch which reliably supports deeplinks
  // search.ch shows all Swiss public transport including SBB
  const websiteParams = new URLSearchParams({
    to: destination,
    date: formattedDate,
    time: formattedTime,
    time_type: "arrival",
  });

  return `https://search.ch/fahrplan/?${websiteParams.toString()}`;
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
