import { useCallback, memo } from 'react'

import { LanguageSwitcher } from '@/shared/components/LanguageSwitcher'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { SettingsItem } from './SettingsItem'

interface PreferencesSectionProps {
  preventZoom: boolean
  onSetPreventZoom: (enabled: boolean) => void
}

function PreferencesSectionComponent({ preventZoom, onSetPreventZoom }: PreferencesSectionProps) {
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
