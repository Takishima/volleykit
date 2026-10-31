import { describe, it, expect, beforeEach } from 'vitest'

import { getLocale } from '@/i18n'
import { readPersistedState } from '@/test/persisted-state'

import { useLanguageStore } from './language'

type LanguageState = ReturnType<typeof useLanguageStore.getState>

describe('Language Store', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset store state
    useLanguageStore.setState({ locale: getLocale() })
  })

  it('initializes with current locale from i18n', () => {
    const { locale } = useLanguageStore.getState()
    expect(locale).toBe(getLocale())
  })

  it('changes locale when changeLocale is called', () => {
    const { changeLocale } = useLanguageStore.getState()

    changeLocale('fr')
    expect(useLanguageStore.getState().locale).toBe('fr')

    changeLocale('it')
    expect(useLanguageStore.getState().locale).toBe('it')

    changeLocale('de')
    expect(useLanguageStore.getState().locale).toBe('de')

    changeLocale('en')
    expect(useLanguageStore.getState().locale).toBe('en')
  })

  it('persists locale to localStorage', () => {
    const { changeLocale } = useLanguageStore.getState()

    changeLocale('fr')

    // Check that localStorage was updated
    const persisted = readPersistedState<Pick<LanguageState, 'locale'>>('volleykit-language')
    expect(persisted.locale).toBe('fr')
  })

  it('updates i18n locale when changeLocale is called', () => {
    const { changeLocale } = useLanguageStore.getState()

    changeLocale('it')
    expect(getLocale()).toBe('it')

    changeLocale('de')
    expect(getLocale()).toBe('de')
  })
})
