import { useTranslation } from '@/common/hooks/useTranslation'
import type { Language } from '@/common/utils/pdf-report-data'

// Language names are intentionally hardcoded as self-names (endonyms) so that
// each language is always displayed in its own script regardless of app locale.
const LANGUAGES: ReadonlyArray<{ code: Language; name: string }> = [
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
]

interface LanguageSelectorProps {
  language: Language
  setLanguage: (lang: Language) => void
  disabled: boolean
}

export function LanguageSelector({ language, setLanguage, disabled }: LanguageSelectorProps) {
  const { t } = useTranslation()

  return (
    <fieldset className="mb-4" data-testid="report-language-selector">
      <legend className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-2">
        {t('pdf.selectLanguage')}
      </legend>
      <div className="flex gap-2">
        {LANGUAGES.map(({ code, name }) => (
          <label
            key={code}
            className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
              language === code
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-text-primary dark:text-text-primary-dark'
                : 'border-border-default dark:border-border-default-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
            }`}
          >
            <input
              type="radio"
              name="report-lang"
              value={code}
              checked={language === code}
              onChange={() => setLanguage(code)}
              className="sr-only"
              disabled={disabled}
            />
            {name}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
