import { useCallback, useState, memo } from 'react'

import { Bell, BellOff, Check } from 'lucide-react'

import { Button } from '@/shared/components/Button'
import { Card, CardContent, CardHeader } from '@/shared/components/Card'
import { ToggleSwitch } from '@/shared/components/ToggleSwitch'
import { useTranslation } from '@/shared/hooks/useTranslation'
import {
  notificationService,
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
    notificationService.getPermission()
  )
  const [isRequesting, setIsRequesting] = useState(false)

  const isSupported = notificationService.isSupported()
  const isGranted = permissionStatus === 'granted'
  const isDenied = permissionStatus === 'denied'

  const handleRequestPermission = useCallback(async () => {
    setIsRequesting(true)
    try {
      const result = await notificationService.requestPermission()
      setPermissionStatus(result)
      if (result === 'granted') {
        onSetNotificationsEnabled(true)
      }
    } finally {
      setIsRequesting(false)
    }
  }, [onSetNotificationsEnabled])

  const handleToggleNotifications = useCallback(() => {
    if (!isGranted) {
      handleRequestPermission()
    } else {
      onSetNotificationsEnabled(!notificationsEnabled)
    }
  }, [isGranted, notificationsEnabled, onSetNotificationsEnabled, handleRequestPermission])

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

  // Show unsupported message if browser doesn't support notifications
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
            <BellOff className="h-5 w-5" aria-hidden="true" />
            {t('settings.notifications.title')}
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            {t('settings.notifications.notSupported')}
          </p>
        </CardContent>
      </Card>
    )
  }

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

        {/* Permission denied warning */}
        {isDenied && (
          <div className="rounded-md bg-warning-50 dark:bg-warning-900/20 p-3">
            <p className="text-sm text-warning-700 dark:text-warning-300">
              {t('settings.notifications.permissionDenied')}
            </p>
          </div>
        )}

        {/* Request permission button (when not granted) */}
        {!isGranted && !isDenied && (
          <Button onClick={handleRequestPermission} disabled={isRequesting} variant="secondary">
            {isRequesting
              ? t('settings.notifications.requesting')
              : t('settings.notifications.enableNotifications')}
          </Button>
        )}

        {/* Notification toggle (when permission granted) */}
        {isGranted && (
          <>
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

            {/* Reminder time selection */}
            {notificationsEnabled && (
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
            )}
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
