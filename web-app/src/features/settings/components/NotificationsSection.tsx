import { useCallback, useState, memo } from 'react'

import { Bell, Check } from 'lucide-react'

import { Button } from '@/shared/components/Button'
import { Card, CardContent, CardHeader } from '@/shared/components/Card'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'
import {
  unifiedNotificationService,
  REMINDER_TIME_OPTIONS,
  type ReminderTime,
} from '@/shared/services/notifications'

interface NotificationsSectionProps {
  notificationsEnabled: boolean
  reminderTimes: ReminderTime[]
  onSetNotificationsEnabled: (enabled: boolean) => void
  onSetReminderTimes: (times: ReminderTime[]) => void
}

function NotificationsSectionComponent({
  notificationsEnabled,
  reminderTimes,
  onSetNotificationsEnabled,
  onSetReminderTimes,
}: NotificationsSectionProps) {
  const { t } = useTranslation()
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    unifiedNotificationService.getNativePermission()
  )
  const [isRequesting, setIsRequesting] = useState(false)

  const isNativeSupported = unifiedNotificationService.isNativeSupported()
  const isNativeAvailable = unifiedNotificationService.isNativeAvailable()
  const isGranted = permissionStatus === 'granted'
  const isDenied = permissionStatus === 'denied'

  // Native permission is needed if native is supported but not yet granted/denied
  const canRequestNativePermission = isNativeSupported && !isGranted && !isDenied

  const handleRequestPermission = useCallback(async () => {
    setIsRequesting(true)
    try {
      const result = await unifiedNotificationService.requestNativePermission()
      setPermissionStatus(result)
      if (result === 'granted') {
        onSetNotificationsEnabled(true)
      }
    } finally {
      setIsRequesting(false)
    }
  }, [onSetNotificationsEnabled])

  const handleToggleNotifications = useCallback(() => {
    // If native is available or we've already requested permission, just toggle
    if (isNativeAvailable || isDenied || !isNativeSupported) {
      onSetNotificationsEnabled(!notificationsEnabled)
      return
    }

    // If native is supported but permission not yet requested, request it
    if (canRequestNativePermission && !notificationsEnabled) {
      handleRequestPermission()
    } else {
      onSetNotificationsEnabled(!notificationsEnabled)
    }
  }, [
    isNativeAvailable,
    isNativeSupported,
    isDenied,
    canRequestNativePermission,
    notificationsEnabled,
    onSetNotificationsEnabled,
    handleRequestPermission,
  ])

  const handleToggleReminderTime = useCallback(
    (time: ReminderTime) => {
      const newTimes = reminderTimes.includes(time)
        ? reminderTimes.filter((t) => t !== time)
        : [...reminderTimes, time]
      // Ensure at least one time is selected
      if (newTimes.length > 0) {
        onSetReminderTimes(newTimes)
      }
    },
    [reminderTimes, onSetReminderTimes]
  )

  // Determine what type of notifications will be used
  const notificationType = isNativeAvailable
    ? t('settings.notifications.usingBrowser')
    : t('settings.notifications.usingInApp')

  return (
    <Card>
      <CardHeader>
        <h2 className="font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {t('settings.notifications.title')}
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-text-muted dark:text-text-muted-dark">
          {t('settings.notifications.description')}
        </p>

        {/* Main notification toggle */}
        <div className="flex items-center justify-between py-2">
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              {t('settings.notifications.gameReminders')}
            </div>
            <div className="text-xs text-text-muted dark:text-text-muted-dark mt-1">
              {t('settings.notifications.gameRemindersDescription')}
            </div>
          </div>

          <ToggleSwitch
            checked={notificationsEnabled}
            onChange={handleToggleNotifications}
            label={t('settings.notifications.gameReminders')}
          />
        </div>

        {/* Permission request button - only show if native is supported but not yet requested */}
        {canRequestNativePermission && !notificationsEnabled && (
          <Button onClick={handleRequestPermission} disabled={isRequesting} variant="secondary">
            {isRequesting
              ? t('settings.notifications.requesting')
              : t('settings.notifications.enableNotifications')}
          </Button>
        )}

        {/* Permission denied info - show that we'll use in-app instead */}
        {isDenied && (
          <div className="rounded-md bg-info-50 dark:bg-info-900/20 p-3">
            <p className="text-sm text-info-700 dark:text-info-300">
              {t('settings.notifications.browserDeniedUsingInApp')}
            </p>
          </div>
        )}

        {/* Show what type of notifications are being used when enabled */}
        {notificationsEnabled && (
          <>
            <div className="text-xs text-text-muted dark:text-text-muted-dark">
              {notificationType}
            </div>

            {/* Reminder time selection */}
            <div className="space-y-3 pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
              <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                {t('settings.notifications.reminderTimes')}
              </div>
              <div className="flex flex-wrap gap-2">
                {REMINDER_TIME_OPTIONS.map((time) => {
                  const isSelected = reminderTimes.includes(time)
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleToggleReminderTime(time)}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                        transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                        ${
                          isSelected
                            ? 'bg-primary-600 text-white'
                            : 'bg-surface-muted dark:bg-surface-subtle-dark text-text-secondary dark:text-text-secondary-dark hover:bg-surface-subtle dark:hover:bg-surface-muted-dark'
                        }
                      `}
                      aria-pressed={isSelected}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      {t(`settings.notifications.reminderTime.${time}`)}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-text-muted dark:text-text-muted-dark">
                {t('settings.notifications.reminderTimesHint')}
              </p>
            </div>
          </>
        )}

        {/* Foreground-only note */}
        <div className="text-xs text-text-muted dark:text-text-muted-dark pt-2 border-t border-border-subtle dark:border-border-subtle-dark">
          {t('settings.notifications.foregroundNote')}
        </div>
      </CardContent>
    </Card>
  )
}

export const NotificationsSection = memo(NotificationsSectionComponent)
