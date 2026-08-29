/**
 * Configuration for sports halls where NLA/NLB games can be played with only 1 ball.
 * Based on official SwissVolley document "Hallenliste NLB: Spiel mit 1 Ball" (2026/27 season,
 * published 29.06.2026).
 *
 * Source PDFs stored in public/documents/:
 * - single-ball-halls-de.pdf (German)
 * - single-ball-halls-fr.pdf (French)
 */

/**
 * When the single-ball rule applies in a hall.
 *
 * - `always`: play with 1 ball, no ball kids required
 * - `singleSubHall`: only when exceptionally one sub-hall is available ("*)" in the document),
 *   otherwise play with 3 balls (with ball kids)
 * - `refereeAtPartition`: only when the 1st referee stands on the partition wall side
 */
export type SingleBallCondition = 'always' | 'singleSubHall' | 'refereeAtPartition'

export interface SingleBallHall {
  /** City name (primary match field) */
  city: string
  /** Keywords to match in hall name (secondary verification) */
  hallKeywords: string[]
  /** When the single-ball rule applies in this hall */
  condition: SingleBallCondition
}

/**
 * List of sports halls where NLB games can be played with only 1 ball.
 */
export const SINGLE_BALL_HALLS: SingleBallHall[] = [
  { city: 'Däniken', hallKeywords: ['Erlimatt'], condition: 'singleSubHall' },
  { city: 'Guntershausen', hallKeywords: ['Turnhalle'], condition: 'always' },
  { city: 'Laufen', hallKeywords: ['Gymnasium'], condition: 'singleSubHall' },
  { city: 'Liesberg', hallKeywords: ['Seemättli', 'MZH'], condition: 'always' },
  { city: 'Luzern', hallKeywords: ['Bahnhofhalle'], condition: 'singleSubHall' },
  { city: 'Olten', hallKeywords: ['Giroud', 'Olma'], condition: 'singleSubHall' },
  { city: 'Ruswil', hallKeywords: ['Dorfhalle'], condition: 'always' },
  {
    city: 'Subingen',
    hallKeywords: ['3fach', '3-fach', 'Dreifach'],
    condition: 'refereeAtPartition',
  },
  { city: 'Thônex', hallKeywords: ['Sous-Moulin'], condition: 'singleSubHall' },
]

/** Leagues where single-ball hall rules apply */
export const SINGLE_BALL_LEAGUES = ['NLA', 'NLB'] as const

/** PDF document paths by language */
export const SINGLE_BALL_PDF_PATHS = {
  de: '/documents/single-ball-halls-de.pdf',
  en: '/documents/single-ball-halls-de.pdf', // English uses German version
  fr: '/documents/single-ball-halls-fr.pdf',
  it: '/documents/single-ball-halls-de.pdf', // Italian uses German version
} as const
