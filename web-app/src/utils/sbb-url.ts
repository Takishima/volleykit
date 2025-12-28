import type { SbbLinkTarget } from "@/stores/settings";

/**
 * Parameters for generating an SBB timetable URL.
 */
export interface SbbUrlParams {
  /** Destination location (city, station, or address) */
  destination: string;
  /** Date of travel (used to format the date parameter) */
  date: Date;
  /** Target arrival time at destination */
  arrivalTime: Date;
  /** Language code for the URL (de, en, fr, it) */
  language?: "de" | "en" | "fr" | "it";
}

/**
 * Format a date as DD.MM.YYYY for SBB URL parameters.
 */
function formatSbbDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Format a time as HH:MM for SBB URL parameters.
 */
function formatSbbTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Get the SBB website path segment for a given language.
 */
function getSbbLanguagePath(language: string): string {
  switch (language) {
    case "de":
      return "de/kaufen";
    case "fr":
      return "fr/acheter";
    case "it":
      return "it/acquistare";
    case "en":
    default:
      return "en/buying";
  }
}

/**
 * Generate an SBB timetable URL for a given destination and arrival time.
 *
 * @param params - The parameters for generating the URL
 * @param target - Whether to generate a website or app URL
 * @returns The SBB timetable URL
 *
 * @example
 * ```ts
 * const url = generateSbbUrl({
 *   destination: "Bern",
 *   date: new Date("2024-12-28"),
 *   arrivalTime: new Date("2024-12-28T14:30:00"),
 *   language: "de",
 * }, "website");
 * // Returns: https://www.sbb.ch/de/kaufen/pages/fahrplan/fahrplan.xhtml?nach=Bern&datum=28.12.2024&zeit=14:30&an=true&suche=true
 * ```
 */
export function generateSbbUrl(
  params: SbbUrlParams,
  target: SbbLinkTarget,
): string {
  const { destination, date, arrivalTime, language = "en" } = params;

  const formattedDate = formatSbbDate(date);
  const formattedTime = formatSbbTime(arrivalTime);

  if (target === "app") {
    // Use the SBB mobile app universal link
    // This will open the app if installed, or fall back to the app store
    const appParams = new URLSearchParams({
      nach: destination,
      datum: formattedDate,
      zeit: formattedTime,
      an: "true",
    });
    return `https://app.sbbmobile.ch/timetable?${appParams.toString()}`;
  }

  // Website URL
  const langPath = getSbbLanguagePath(language);
  const websiteParams = new URLSearchParams({
    nach: destination,
    datum: formattedDate,
    zeit: formattedTime,
    an: "true",
    suche: "true",
  });

  return `https://www.sbb.ch/${langPath}/pages/fahrplan/fahrplan.xhtml?${websiteParams.toString()}`;
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
