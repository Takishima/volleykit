import { useCallback, memo } from 'react'

import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'
import type { ScoreSheetShareMode } from '@/shared/stores/settings/types'

import { SettingsItem } from './SettingsItem'

interface PreferencesSectionProps {
  preventZoom: boolean
  onSetPreventZoom: (enabled: boolean) => void
  scoreSheetShareMode: ScoreSheetShareMode
  onSetScoreSheetShareMode: (mode: ScoreSheetShareMode) => void
}

function PreferencesSectionComponent({
  preventZoom,
  onSetPreventZoom,
  scoreSheetShareMode,
  onSetScoreSheetShareMode,
}: PreferencesSectionProps) {
  const { t } = useTranslation()

  const handleTogglePreventZoom = useCallback(() => {
    onSetPreventZoom(!preventZoom)
  }, [preventZoom, onSetPreventZoom])

  return (
    <>
      {/* Language selection */}
      <div data-tour="language-switcher">
        <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2">
          {t('settings.language')}
        </div>
        <LanguageSwitcher variant="grid" />
      </div>

      {/* Separator */}
      <div className="border-t border-border-subtle dark:border-border-subtle-dark" />

      {/* Score sheet share mode */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
          {t('settings.scoreSheetShare.title')}
        </div>
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('settings.scoreSheetShare.description')}
        </p>
        <div className="flex gap-2">
          {(['email', 'download'] as const).map((mode) => (
            <label
              key={mode}
              aria-label={t(`settings.scoreSheetShare.${mode}`)}
              className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                scoreSheetShareMode === mode
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-text-primary dark:text-text-primary-dark'
                  : 'border-border-default dark:border-border-default-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-subtle-dark'
              }`}
            >
              <input
                type="radio"
                name="score-sheet-share"
                value={mode}
                checked={scoreSheetShareMode === mode}
                onChange={() => onSetScoreSheetShareMode(mode)}
                className="sr-only"
              />
              <div className="text-center">
                <div>{t(`settings.scoreSheetShare.${mode}`)}</div>
                <div className="text-xs text-text-muted dark:text-text-muted-dark">
                  {t(`settings.scoreSheetShare.${mode}Description`)}
                </div>
              </div>
            </label>
          ))}
        </div>
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

        <SettingsItem
          label={t('settings.accessibility.preventZoom')}
          description={t('settings.accessibility.preventZoomDescription')}
          status={
            preventZoom
              ? t('settings.accessibility.preventZoomEnabled')
              : t('settings.accessibility.preventZoomDisabled')
          }
        >
          <ToggleSwitch
            checked={preventZoom}
            onChange={handleTogglePreventZoom}
            label={t('settings.accessibility.preventZoom')}
          />
        </SettingsItem>
      </div>
    </>
  )
}

export const PreferencesSection = memo(PreferencesSectionComponent)
