/**
 * Player Deduplication Utility
 *
 * Removes duplicate players from a team's roster. Manuscript scoresheets
 * typically list libero players twice: once in the main player list and
 * again in a separate LIBERO section. This utility keeps the first
 * occurrence of each player.
 */

import type { ParsedPlayer, ParsedTeam } from '../types'

/**
 * Deduplicate players in a team's roster.
 *
 * Two players are considered duplicates if they share the same rawName
 * (case-insensitive). Shirt numbers are NOT used for deduplication because
 * OCR errors can assign the same number to different players.
 */
export function deduplicatePlayers(team: ParsedTeam): void {
  const seenNames = new Set<string>()
  const deduped: ParsedPlayer[] = []

  for (const player of team.players) {
    const nameKey = player.rawName.toLowerCase().trim()

    if (!nameKey || !seenNames.has(nameKey)) {
      deduped.push(player)
      if (nameKey) seenNames.add(nameKey)
    }
  }

  team.players = deduped
}
