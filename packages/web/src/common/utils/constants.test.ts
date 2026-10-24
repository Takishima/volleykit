import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

import { useLanguageStore } from '@/common/stores/language'

import { getHelpSiteUrl } from './constants'

describe('getHelpSiteUrl', () => {
  beforeEach(() => {
    // Reset the language store to default locale before each test
    useLanguageStore.setState({ locale: 'en' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns help URL with correct base path for production', () => {
    // Production: origin is volleykit.ch, BASE_URL is /
    vi.stubGlobal('window', {
      location: { origin: 'https://volleykit.ch' },
    })
    vi.stubEnv('BASE_URL', '/')

    const url = getHelpSiteUrl()

    expect(url).toBe('https://volleykit.ch/help/?lang=en')
  })

  it('returns help URL with correct base path for PR preview', () => {
    // PR preview: origin is volleykit.ch, BASE_URL is /pr-123/
    vi.stubGlobal('window', {
      location: { origin: 'https://volleykit.ch' },
    })
    vi.stubEnv('BASE_URL', '/pr-123/')

    const url = getHelpSiteUrl()

    expect(url).toBe('https://volleykit.ch/pr-123/help/?lang=en')
  })

  it('returns help URL for local development', () => {
    // Local dev: origin is localhost, BASE_URL is /
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5173',
      },
    })
    vi.stubEnv('BASE_URL', '/')

    const url = getHelpSiteUrl()

    expect(url).toBe('http://localhost:5173/help/?lang=en')
  })

  it('handles missing window (SSR) gracefully', () => {
    // SSR/Node: window is undefined
    vi.stubGlobal('window', undefined)
    vi.stubEnv('BASE_URL', '/')

    const url = getHelpSiteUrl()

    expect(url).toBe('/help/?lang=en')
  })

  it('includes the current language in the URL', () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://volleykit.ch' },
    })
    vi.stubEnv('BASE_URL', '/')

    // Set German as the current language
    useLanguageStore.setState({ locale: 'de' })

    const url = getHelpSiteUrl()

    expect(url).toBe('https://volleykit.ch/help/?lang=de')
  })

  it('includes French language when selected', () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://volleykit.ch' },
    })
    vi.stubEnv('BASE_URL', '/')

    useLanguageStore.setState({ locale: 'fr' })

    const url = getHelpSiteUrl()

    expect(url).toBe('https://volleykit.ch/help/?lang=fr')
  })
})
