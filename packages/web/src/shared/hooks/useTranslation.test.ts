import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { useLanguageStore } from '@/shared/stores/language'

import { useTranslation } from './useTranslation'

describe('useTranslation', () => {
  beforeEach(() => {
    // Reset to default locale before each test
    act(() => {
      useLanguageStore.getState().changeLocale('de')
    })
  })

  it('returns translation function and current locale', () => {
    const { result } = renderHook(() => useTranslation())

    expect(result.current.t).toBeDefined()
    expect(typeof result.current.t).toBe('function')
    expect(result.current.locale).toBe('de')
  })

  it('triggers re-render when locale changes', () => {
    const { result } = renderHook(() => useTranslation())

    expect(result.current.locale).toBe('de')

    act(() => {
      useLanguageStore.getState().changeLocale('fr')
    })

    expect(result.current.locale).toBe('fr')
  })

  it('triggers re-render for all supported locales', () => {
    const { result } = renderHook(() => useTranslation())

    const locales = ['de', 'fr', 'it', 'en'] as const

    locales.forEach((locale) => {
      act(() => {
        useLanguageStore.getState().changeLocale(locale)
      })

      expect(result.current.locale).toBe(locale)
    })
  })

  it('translation function returns correct translations', () => {
    const { result } = renderHook(() => useTranslation())

    // Test German (default)
    expect(result.current.t('auth.login')).toBe('Anmelden')

    // Change to French
    act(() => {
      useLanguageStore.getState().changeLocale('fr')
    })
    expect(result.current.t('auth.login')).toBe('Connexion')

    // Change to Italian
    act(() => {
      useLanguageStore.getState().changeLocale('it')
    })
    expect(result.current.t('auth.login')).toBe('Accesso')

    // Change to English
    act(() => {
      useLanguageStore.getState().changeLocale('en')
    })
    expect(result.current.t('auth.login')).toBe('Login')
  })
})
