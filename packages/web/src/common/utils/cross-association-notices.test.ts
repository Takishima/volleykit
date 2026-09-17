import { describe, it, expect } from 'vitest'

import { buildNoticeKey, toLocalDateKey } from './cross-association-notices'

describe('buildNoticeKey', () => {
  it('builds notice keys with date and day relation', () => {
    expect(buildNoticeKey('SVRZ', '2026-09-16', 'today')).toBe('SVRZ:2026-09-16:today')
    expect(buildNoticeKey('SVRBA', '2026-09-17', 'tomorrow')).toBe('SVRBA:2026-09-17:tomorrow')
  })
})

describe('toLocalDateKey', () => {
  it('extracts the local calendar date from an ISO string', () => {
    const date = new Date(2026, 8, 16, 20, 30)
    expect(toLocalDateKey(date.toISOString())).toBe('2026-09-16')
  })

  it('pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5, 10, 0)
    expect(toLocalDateKey(date.toISOString())).toBe('2026-01-05')
  })
})
