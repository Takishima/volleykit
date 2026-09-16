import { describe, it, expect, beforeEach } from 'vitest'

import {
  useCrossAssociationGamesStore,
  buildNoticeKey,
  toLocalDateKey,
} from './cross-association-games'

function isoDaysFromNow(days: number, hour = 18): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

beforeEach(() => {
  useCrossAssociationGamesStore.setState({ dismissedNotices: [] })
})

describe('buildNoticeKey / toLocalDateKey', () => {
  it('builds notice keys with date and day relation', () => {
    expect(buildNoticeKey('SVRZ', '2026-09-16', 'today')).toBe('SVRZ:2026-09-16:today')
  })

  it('extracts the local calendar date from an ISO string', () => {
    const date = new Date(2026, 8, 16, 20, 30)
    expect(toLocalDateKey(date.toISOString())).toBe('2026-09-16')
  })
})

describe('dismissNotice', () => {
  it('stores a dismissal only once', () => {
    const key = buildNoticeKey('SVRZ', toLocalDateKey(isoDaysFromNow(0)), 'today')

    useCrossAssociationGamesStore.getState().dismissNotice(key)
    useCrossAssociationGamesStore.getState().dismissNotice(key)

    expect(useCrossAssociationGamesStore.getState().dismissedNotices).toEqual([key])
  })

  it('keeps independent dismissals for different associations and days', () => {
    const todayKey = buildNoticeKey('SVRZ', toLocalDateKey(isoDaysFromNow(0)), 'today')
    const tomorrowKey = buildNoticeKey('SVRBA', toLocalDateKey(isoDaysFromNow(1)), 'tomorrow')

    useCrossAssociationGamesStore.getState().dismissNotice(todayKey)
    useCrossAssociationGamesStore.getState().dismissNotice(tomorrowKey)

    expect(useCrossAssociationGamesStore.getState().dismissedNotices).toEqual([
      todayKey,
      tomorrowKey,
    ])
  })

  it('prunes dismissals whose game date has passed', () => {
    const staleKey = buildNoticeKey('SVRZ', toLocalDateKey(isoDaysFromNow(-1)), 'today')
    const freshKey = buildNoticeKey('SVRBA', toLocalDateKey(isoDaysFromNow(0)), 'today')
    useCrossAssociationGamesStore.setState({ dismissedNotices: [staleKey] })

    useCrossAssociationGamesStore.getState().dismissNotice(freshKey)

    expect(useCrossAssociationGamesStore.getState().dismissedNotices).toEqual([freshKey])
  })
})
