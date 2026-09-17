/**
 * Hook for cross-association game notices.
 *
 * The VolleyManager API is session-scoped: assignments can only be fetched
 * for the currently active occupation. The referee's public iCal feed,
 * however, covers ALL associations at once (the calendar code is unique
 * per referee, not per association) and is already extracted during API
 * login. This hook fetches that feed and reports games happening today or
 * tomorrow in associations other than the active one, so the UI can
 * surface a subtle reminder overlay.
 */

import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { isToday, isTomorrow, parseISO } from 'date-fns'
import { useShallow } from 'zustand/react/shallow'

import type { CalendarAssignment } from '@/common/services/calendar/calendar-api'
import { calendarAssignmentsOptions } from '@/common/services/calendar/calendar-queries'
import { useAuthStore, type Occupation } from '@/common/stores/auth'
import { useCrossAssociationGamesStore } from '@/common/stores/cross-association-games'
import { buildNoticeKey, toLocalDateKey } from '@/common/utils/cross-association-notices'

/** Re-evaluate notices once per minute so elapsed time is reflected */
const NOTICE_REFRESH_INTERVAL_MS = 60_000

export interface CrossAssociationGameNotice {
  /** Occupation to switch to when the notice is activated */
  occupationId: string
  /** Association the upcoming game belongs to */
  associationCode: string
  /** ISO start date of the game */
  gameDate: string
  /** Whether the game is today or tomorrow */
  day: 'today' | 'tomorrow'
  /** Stable key used for rendering and dismissal */
  noticeKey: string
}

/** Classifies an upcoming game's start time; games already started are ignored. */
function classifyDay(startTime: string, now: number): 'today' | 'tomorrow' | null {
  const date = parseISO(startTime)
  if (Number.isNaN(date.getTime()) || date.getTime() < now) return null
  if (isToday(date)) return 'today'
  if (isTomorrow(date)) return 'tomorrow'
  return null
}

/**
 * Derives one notice per non-active association that has a game today or
 * tomorrow. When an association has games on both days, today wins. The
 * feed is a referee feed, so a referee occupation is preferred when an
 * association carries several occupation types.
 */
function buildNotices(
  assignments: CalendarAssignment[],
  occupations: Occupation[],
  activeCode: string,
  dismissedNotices: string[],
  now: number
): CrossAssociationGameNotice[] {
  const byAssociation = new Map<string, CrossAssociationGameNotice>()

  for (const assignment of assignments) {
    const code = assignment.association
    if (!code || code === activeCode) continue

    const candidates = occupations.filter((o) => o.associationCode === code)
    const occupation = candidates.find((o) => o.type === 'referee') ?? candidates[0]
    if (!occupation) continue

    const day = classifyDay(assignment.startTime, now)
    if (!day) continue

    const existing = byAssociation.get(code)
    if (existing && !(existing.day === 'tomorrow' && day === 'today')) continue

    byAssociation.set(code, {
      occupationId: occupation.id,
      associationCode: code,
      gameDate: assignment.startTime,
      day,
      noticeKey: buildNoticeKey(code, toLocalDateKey(assignment.startTime), day),
    })
  }

  return [...byAssociation.values()].filter(
    (notice) => !dismissedNotices.includes(notice.noticeKey)
  )
}

/**
 * Returns one notice per non-active association that has a game today or
 * tomorrow, excluding notices the user has dismissed. Only active in API
 * mode (demo has no real calendar feed; calendar mode has no switcher).
 */
export function useCrossAssociationGameNotices(): CrossAssociationGameNotice[] {
  const { user, activeOccupationId, dataSource, calendarCode } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      activeOccupationId: state.activeOccupationId,
      dataSource: state.dataSource,
      calendarCode: state.calendarCode,
    }))
  )
  const dismissedNotices = useCrossAssociationGamesStore((state) => state.dismissedNotices)

  // Tick once per minute so a finished game's notice disappears and
  // "tomorrow" flips to "today" after midnight without a reload.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const intervalId = setInterval(() => setNow(Date.now()), NOTICE_REFRESH_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [])

  const occupations = user?.occupations
  const distinctAssociationCount = new Set(
    (occupations ?? []).map((o) => o.associationCode).filter(Boolean)
  ).size
  const enabled = dataSource === 'api' && !!calendarCode && distinctAssociationCount >= 2

  const { data: assignments } = useQuery({
    ...calendarAssignmentsOptions(calendarCode),
    enabled,
  })

  return useMemo(() => {
    if (!enabled || !assignments?.length || !occupations) return []

    const activeOccupation = occupations.find((o) => o.id === activeOccupationId) ?? occupations[0]
    const activeCode = activeOccupation?.associationCode
    if (!activeCode) return []

    return buildNotices(assignments, occupations, activeCode, dismissedNotices, now)
  }, [enabled, assignments, occupations, activeOccupationId, dismissedNotices, now])
}
