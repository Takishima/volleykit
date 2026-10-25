import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { logger } from '@/common/utils/logger'
import { setLocale, setLocaleImmediate, getLocale, type Locale } from '@/i18n'

interface LanguageState {
  locale: Locale
  changeLocale: (locale: Locale) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: getLocale(),
      changeLocale: (locale: Locale) => {
        setLocale(locale).catch((error: unknown) =>
          logger.error('Failed to load translations for locale:', error)
        )
        set({ locale })
      },
    }),
    {
      name: 'volleykit-language',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state?.locale) {
          setLocaleImmediate(state.locale)
        }
      },
    }
  )
)
