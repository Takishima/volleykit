import { describe, it, expect } from 'vitest'

import { formatTravelTime, formatTravelTimeCompact } from './format-travel-time'

const units = { minutesUnit: 'min', hoursUnit: 'h' }

describe('formatTravelTime', () => {
  it('formats minutes under 60 with minutes unit', () => {
    expect(formatTravelTime(30, units)).toBe('30min')
    expect(formatTravelTime(45, units)).toBe('45min')
    expect(formatTravelTime(59, units)).toBe('59min')
  })

  it('formats exactly 60 minutes as 1 hour', () => {
    expect(formatTravelTime(60, units)).toBe('1h')
  })

  it('formats multiple hours without remaining minutes', () => {
    expect(formatTravelTime(120, units)).toBe('2h')
    expect(formatTravelTime(180, units)).toBe('3h')
  })

  it('formats hours and minutes combined', () => {
    expect(formatTravelTime(90, units)).toBe('1h 30min')
    expect(formatTravelTime(75, units)).toBe('1h 15min')
    expect(formatTravelTime(150, units)).toBe('2h 30min')
  })

  it('applies prefix when provided', () => {
    expect(formatTravelTime(30, units, '≤')).toBe('≤30min')
    expect(formatTravelTime(60, units, '≤')).toBe('≤1h')
    expect(formatTravelTime(90, units, '≤')).toBe('≤1h 30min')
  })

  it('handles edge case of 0 minutes', () => {
    expect(formatTravelTime(0, units)).toBe('0min')
  })

  it('uses provided unit labels', () => {
    const germanUnits = { minutesUnit: ' Min.', hoursUnit: ' Std.' }
    expect(formatTravelTime(30, germanUnits)).toBe('30 Min.')
    expect(formatTravelTime(90, germanUnits)).toBe('1 Std. 30 Min.')
  })
})

describe('formatTravelTimeCompact', () => {
  it('formats minutes less than 60', () => {
    expect(formatTravelTimeCompact(15)).toBe("15'")
    expect(formatTravelTimeCompact(45)).toBe("45'")
    expect(formatTravelTimeCompact(59)).toBe("59'")
  })

  it('formats exact hours', () => {
    expect(formatTravelTimeCompact(60)).toBe('1h')
    expect(formatTravelTimeCompact(120)).toBe('2h')
    expect(formatTravelTimeCompact(180)).toBe('3h')
  })

  it('formats hours and minutes', () => {
    expect(formatTravelTimeCompact(75)).toBe("1h15'")
    expect(formatTravelTimeCompact(90)).toBe("1h30'")
    expect(formatTravelTimeCompact(145)).toBe("2h25'")
  })

  it('handles edge cases', () => {
    expect(formatTravelTimeCompact(0)).toBe("0'")
    expect(formatTravelTimeCompact(1)).toBe("1'")
    expect(formatTravelTimeCompact(61)).toBe("1h1'")
  })
})
