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

import { toLocalDateKey } from '@/common/utils/cross-association-notices'

const CROSS_ASSOCIATION_GAMES_STORE_VERSION = 1

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
      version: CROSS_ASSOCIATION_GAMES_STORE_VERSION,
    }
  )
)
