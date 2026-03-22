import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
        setLocale(locale)
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
