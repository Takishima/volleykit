import { describe, it, expect } from 'vitest'

import { isValidICalCode, extractICalCode } from './ical-validation'

describe('isValidICalCode', () => {
  it('accepts valid 6-character alphanumeric codes', () => {
    expect(isValidICalCode('ABC123')).toBe(true)
    expect(isValidICalCode('abcdef')).toBe(true)
    expect(isValidICalCode('123456')).toBe(true)
    expect(isValidICalCode('A1b2C3')).toBe(true)
  })

  it('rejects codes shorter than 6 characters', () => {
    expect(isValidICalCode('ABC12')).toBe(false)
    expect(isValidICalCode('')).toBe(false)
    expect(isValidICalCode('A')).toBe(false)
  })

  it('rejects codes longer than 6 characters', () => {
    expect(isValidICalCode('ABC1234')).toBe(false)
    expect(isValidICalCode('ABCDEFGH')).toBe(false)
  })

  it('rejects codes with special characters', () => {
    expect(isValidICalCode('ABC-12')).toBe(false)
    expect(isValidICalCode('ABC 12')).toBe(false)
    expect(isValidICalCode('ABC_12')).toBe(false)
    expect(isValidICalCode('ABC!@#')).toBe(false)
  })
})

describe('extractICalCode', () => {
  it('extracts code from valid iCal referee path', () => {
    expect(extractICalCode('/iCal/referee/ABC123')).toBe('ABC123')
  })

  it('returns null for non-matching paths', () => {
    expect(extractICalCode('/other/path')).toBeNull()
    expect(extractICalCode('/iCal/referee')).toBeNull()
    expect(extractICalCode('/iCal/referee/')).toBeNull()
    expect(extractICalCode('/')).toBeNull()
    expect(extractICalCode('')).toBeNull()
  })

  it('returns null for paths with extra segments after code', () => {
    expect(extractICalCode('/iCal/referee/ABC123/extra')).toBeNull()
  })

  it('extracts any non-slash characters as code (validation is separate)', () => {
    expect(extractICalCode('/iCal/referee/toolong123')).toBe('toolong123')
    expect(extractICalCode('/iCal/referee/X')).toBe('X')
  })
})
