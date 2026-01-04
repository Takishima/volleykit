/**
 * Configuration for sports halls where NLA/NLB games can be played with only 1 ball.
 * Based on official SwissVolley document "Hallenliste NLB: Spiel mit 1 Ball" (2025/26 season).
 *
 * Source PDFs stored in public/documents/:
 * - single-ball-halls-de.pdf (German)
 * - single-ball-halls-fr.pdf (French)
 */

export interface SingleBallHall {
  /** City name (primary match field) */
  city: string;
  /** Keywords to match in hall name (secondary verification) */
  hallKeywords: string[];
  /**
   * If true, single-ball rule only applies when exceptionally only one sub-hall is available.
   * Otherwise, play with 3 balls (with ball kids).
   */
  conditional: boolean;
}

/**
 * List of sports halls where NLB games can be played with only 1 ball.
 * No ball kids required in these halls.
 */
export const SINGLE_BALL_HALLS: SingleBallHall[] = [
  { city: "Däniken", hallKeywords: ["Erlimatt"], conditional: true },
  { city: "Guntershausen", hallKeywords: ["Turnhalle"], conditional: false },
  { city: "Laufen", hallKeywords: ["Gymnasium"], conditional: true },
  { city: "Liesberg", hallKeywords: ["Seemättli", "MZH"], conditional: false },
  { city: "Luzern", hallKeywords: ["Bahnhofhalle"], conditional: true },
  { city: "Olten", hallKeywords: ["Giroud", "Olma"], conditional: true },
  { city: "Ruswil", hallKeywords: ["Dorfhalle"], conditional: false },
  { city: "Thônex", hallKeywords: ["Sous-Moulin"], conditional: true },
];

/** Leagues where single-ball hall rules apply */
export const SINGLE_BALL_LEAGUES = ["NLA", "NLB"] as const;

/** PDF document paths by language */
export const SINGLE_BALL_PDF_PATHS = {
  de: "/documents/single-ball-halls-de.pdf",
  en: "/documents/single-ball-halls-de.pdf", // English uses German version
  fr: "/documents/single-ball-halls-fr.pdf",
  it: "/documents/single-ball-halls-de.pdf", // Italian uses German version
} as const;
