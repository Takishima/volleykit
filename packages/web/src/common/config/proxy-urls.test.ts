import { describe, it, expect } from 'vitest'

import { parseProxyUrls } from './proxy-urls'

const PRIMARY = 'https://api.volleykit.ch'
const FALLBACK_A = 'https://volleykit-proxy.takishima.workers.dev'
const FALLBACK_B = 'https://backup.volleykit.ch'

describe('parseProxyUrls', () => {
  it('lists the primary first, then the fallbacks in order', () => {
    expect(parseProxyUrls(PRIMARY, `${FALLBACK_A},${FALLBACK_B}`)).toEqual([
      PRIMARY,
      FALLBACK_A,
      FALLBACK_B,
    ])
  })

  it('trims whitespace and drops empty entries', () => {
    expect(parseProxyUrls(` ${PRIMARY} `, ` ${FALLBACK_A} , ,${FALLBACK_B},`)).toEqual([
      PRIMARY,
      FALLBACK_A,
      FALLBACK_B,
    ])
  })

  it('deduplicates while preserving order', () => {
    expect(parseProxyUrls(PRIMARY, `${FALLBACK_A},${PRIMARY},${FALLBACK_A}`)).toEqual([
      PRIMARY,
      FALLBACK_A,
    ])
  })

  it('returns only the fallbacks when no primary is configured', () => {
    expect(parseProxyUrls(undefined, FALLBACK_A)).toEqual([FALLBACK_A])
    expect(parseProxyUrls('', FALLBACK_A)).toEqual([FALLBACK_A])
  })

  it('returns an empty list when nothing is configured', () => {
    expect(parseProxyUrls(undefined, undefined)).toEqual([])
    expect(parseProxyUrls('', '')).toEqual([])
  })

  it('throws naming the offending entry when a URL cannot be parsed', () => {
    expect(() => parseProxyUrls('not a url', FALLBACK_A)).toThrow('Invalid proxy URL "not a url"')
    expect(() => parseProxyUrls(PRIMARY, `${FALLBACK_A},//broken`)).toThrow(
      'Invalid proxy URL "//broken"'
    )
  })
})
