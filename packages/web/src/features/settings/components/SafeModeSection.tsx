import { useState, useCallback, lazy, Suspense, memo } from 'react'

import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'

import { SettingsItem } from './SettingsItem'

const SafeModeWarningModal = lazy(() =>
  import('@/shared/components/SafeModeWarningModal').then((m) => ({
    default: m.SafeModeWarningModal,
  }))
)

interface SafeModeSectionProps {
  isSafeModeEnabled: boolean
  onSetSafeMode: (enabled: boolean) => void
}

function SafeModeSectionComponent({ isSafeModeEnabled, onSetSafeMode }: SafeModeSectionProps) {
  const { t } = useTranslation()
  const [showSafeModeWarning, setShowSafeModeWarning] = useState(false)

  const handleToggleSafeMode = useCallback(() => {
    if (isSafeModeEnabled) {
      setShowSafeModeWarning(true)
    } else {
      onSetSafeMode(true)
    }
  }, [isSafeModeEnabled, onSetSafeMode])

  const handleCloseSafeModeWarning = useCallback(() => {
    setShowSafeModeWarning(false)
  }, [])

  const handleConfirmDisableSafeMode = useCallback(() => {
    onSetSafeMode(false)
  }, [onSetSafeMode])

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('settings.safeModeDescription')}
        </p>

        <SettingsItem
          label={isSafeModeEnabled ? t('settings.safeModeEnabled') : t('settings.safeModeDisabled')}
          status={!isSafeModeEnabled ? t('settings.safeModeDangerous') : undefined}
          statusVariant="warning"
        >
          <ToggleSwitch
            checked={isSafeModeEnabled}
            onChange={handleToggleSafeMode}
            label={t('settings.safeMode')}
            variant="success"
          />
        </SettingsItem>
      </div>

      {/* Safe Mode Warning Modal */}
      {showSafeModeWarning && (
        <Suspense fallback={null}>
          <SafeModeWarningModal
            isOpen={showSafeModeWarning}
            onClose={handleCloseSafeModeWarning}
            onConfirm={handleConfirmDisableSafeMode}
          />
        </Suspense>
      )}
    </>
  )
}

export const SafeModeSection = memo(SafeModeSectionComponent)
