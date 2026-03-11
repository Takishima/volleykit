import { useCallback, memo } from 'react'

import { Card, CardContent, CardHeader } from '@/shared/components/Card'
import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { ValidationReferenceMode } from '@/shared/stores/settings'

interface PreferencesSectionProps {
  preventZoom: boolean
  onSetPreventZoom: (enabled: boolean) => void
  validationReferenceMode: ValidationReferenceMode
  onSetValidationReferenceMode: (mode: ValidationReferenceMode) => void
}

function PreferencesSectionComponent({
  preventZoom,
  onSetPreventZoom,
  validationReferenceMode,
  onSetValidationReferenceMode,
}: PreferencesSectionProps) {
  const { t } = useTranslation()

  const handleTogglePreventZoom = useCallback(() => {
    onSetPreventZoom(!preventZoom)
  }, [preventZoom, onSetPreventZoom])

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark">
          {t('settings.preferences.title')}
        </h2>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Language selection */}
        <div data-tour="language-switcher">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2">
            {t('settings.language')}
          </div>
          <LanguageSwitcher variant="grid" />
        </div>

        {/* Separator */}
        <div className="border-t border-border-subtle dark:border-border-subtle-dark" />

        {/* Validation: Reference Mode */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {t('settings.validation.title')}
          </div>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {t('settings.validation.description')}
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSetValidationReferenceMode('quick-compare')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                validationReferenceMode === 'quick-compare'
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                  : 'bg-surface-subtle dark:bg-surface-subtle-dark border-border-default dark:border-border-default-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark'
              }`}
            >
              {t('settings.validation.quickCompare')}
            </button>
            <button
              type="button"
              onClick={() => onSetValidationReferenceMode('split-view')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                validationReferenceMode === 'split-view'
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                  : 'bg-surface-subtle dark:bg-surface-subtle-dark border-border-default dark:border-border-default-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark'
              }`}
            >
              {t('settings.validation.splitView')}
            </button>
          </div>

          <p className="text-xs text-text-muted dark:text-text-muted-dark">
            {validationReferenceMode === 'quick-compare'
              ? t('settings.validation.quickCompareDescription')
              : t('settings.validation.splitViewDescription')}
          </p>
        </div>

        {/* Separator */}
        <div className="border-t border-border-subtle dark:border-border-subtle-dark" />

        {/* Accessibility: Prevent Zoom Toggle */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {t('settings.accessibility.title')}
          </div>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {t('settings.accessibility.description')}
          </p>

          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                {t('settings.accessibility.preventZoom')}
              </div>
              <div className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
                {t('settings.accessibility.preventZoomDescription')}
              </div>
            </div>

            <ToggleSwitch
              checked={preventZoom}
              onChange={handleTogglePreventZoom}
              label={t('settings.accessibility.preventZoom')}
            />
          </div>

          <div className="text-xs text-text-muted dark:text-text-muted-dark">
            {preventZoom
              ? t('settings.accessibility.preventZoomEnabled')
              : t('settings.accessibility.preventZoomDisabled')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const PreferencesSection = memo(PreferencesSectionComponent)
