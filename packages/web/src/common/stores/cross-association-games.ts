/**
 * Store for dismissed cross-association game notices.
 *
 * The notices themselves are derived from the referee's public iCal feed
 * (see useCrossAssociationGameNotices); this store only remembers which
 * notices the user dismissed. Dismissals are persisted and automatically
 * pruned once the game's date has passed, so a notice dismissed as
 * "tomorrow" reappears when the game is actually today.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Builds the dismissal key for a notice. Includes the game's local date and
 * the today/tomorrow relation, so each stage of the reminder can be
 * dismissed independently.
 */
export function buildNoticeKey(
  associationCode: string,
  gameDateKey: string,
  day: 'today' | 'tomorrow'
): string {
  return `${associationCode}:${gameDateKey}:${day}`
}

/** Extracts the local calendar date (yyyy-mm-dd) from an ISO date string. */
export function toLocalDateKey(isoDate: string): string {
  const date = new Date(isoDate)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Keeps only dismissal keys whose game date is today or later. */
function pruneDismissedNotices(dismissed: string[]): string[] {
  const todayKey = toLocalDateKey(new Date().toISOString())
  return dismissed.filter((key) => {
    const dateKey = key.split(':')[1]
    return dateKey !== undefined && dateKey >= todayKey
  })
}

interface CrossAssociationGamesState {
  /** Notice keys the user dismissed (see buildNoticeKey) */
  dismissedNotices: string[]

  /** Hide a notice until its key becomes stale */
  dismissNotice: (noticeKey: string) => void
}

export const useCrossAssociationGamesStore = create<CrossAssociationGamesState>()(
  persist(
    (set) => ({
      dismissedNotices: [],

      dismissNotice: (noticeKey) =>
        set((state) => ({
          dismissedNotices: state.dismissedNotices.includes(noticeKey)
            ? state.dismissedNotices
            : [...pruneDismissedNotices(state.dismissedNotices), noticeKey],
        })),
    }),
    {
      name: 'volleykit-cross-association-games',
    }
  )
)
