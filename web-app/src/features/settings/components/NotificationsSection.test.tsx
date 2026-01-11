import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import * as notificationService from '@/shared/services/notifications'

import { NotificationsSection } from './NotificationsSection'

vi.mock('@/shared/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/shared/services/notifications', () => ({
  unifiedNotificationService: {
    isNativeSupported: vi.fn(() => true),
    isNativeAvailable: vi.fn(() => false),
    getNativePermission: vi.fn(() => 'default'),
    requestNativePermission: vi.fn(),
  },
  REMINDER_TIME_OPTIONS: ['1h', '2h', '1d'],
}))

const defaultProps = {
  notificationsEnabled: false,
  reminderTimes: ['1h'] as ('1h' | '2h' | '1d')[],
  onSetNotificationsEnabled: vi.fn(),
  onSetReminderTimes: vi.fn(),
}

describe('NotificationsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(notificationService.unifiedNotificationService.isNativeSupported).mockReturnValue(true)
    vi.mocked(notificationService.unifiedNotificationService.isNativeAvailable).mockReturnValue(false)
    vi.mocked(notificationService.unifiedNotificationService.getNativePermission).mockReturnValue('default')
  })

  describe('notification toggle', () => {
    it('shows toggle switch for game reminders', () => {
      render(<NotificationsSection {...defaultProps} />)

      expect(screen.getByText('settings.notifications.gameReminders')).toBeInTheDocument()
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('requests permission when toggle clicked and native not yet requested', () => {
      render(<NotificationsSection {...defaultProps} />)

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      // When native not yet requested, should request permission first
      expect(notificationService.unifiedNotificationService.requestNativePermission).toHaveBeenCalled()
    })

    it('toggles notifications directly when native is available', () => {
      vi.mocked(notificationService.unifiedNotificationService.isNativeAvailable).mockReturnValue(true)
      const onSetNotificationsEnabled = vi.fn()

      render(
        <NotificationsSection
          {...defaultProps}
          notificationsEnabled={false}
          onSetNotificationsEnabled={onSetNotificationsEnabled}
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(onSetNotificationsEnabled).toHaveBeenCalledWith(true)
    })

    it('toggles notifications directly when native is denied (falls back to in-app)', () => {
      vi.mocked(notificationService.unifiedNotificationService.getNativePermission).mockReturnValue('denied')
      const onSetNotificationsEnabled = vi.fn()

      render(
        <NotificationsSection
          {...defaultProps}
          notificationsEnabled={false}
          onSetNotificationsEnabled={onSetNotificationsEnabled}
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(onSetNotificationsEnabled).toHaveBeenCalledWith(true)
    })

    it('toggles notifications directly when native is not supported (falls back to in-app)', () => {
      vi.mocked(notificationService.unifiedNotificationService.isNativeSupported).mockReturnValue(false)
      const onSetNotificationsEnabled = vi.fn()

      render(
        <NotificationsSection
          {...defaultProps}
          notificationsEnabled={false}
          onSetNotificationsEnabled={onSetNotificationsEnabled}
        />
      )

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)

      expect(onSetNotificationsEnabled).toHaveBeenCalledWith(true)
    })
  })

  describe('permission request', () => {
    it('shows enable notifications button when native permission can be requested', () => {
      render(<NotificationsSection {...defaultProps} />)

      expect(screen.getByText('settings.notifications.enableNotifications')).toBeInTheDocument()
    })

    it('does not show enable button when native is not supported', () => {
      vi.mocked(notificationService.unifiedNotificationService.isNativeSupported).mockReturnValue(false)

      render(<NotificationsSection {...defaultProps} />)

      expect(screen.queryByText('settings.notifications.enableNotifications')).not.toBeInTheDocument()
    })

    it('does not show enable button when notifications already enabled', () => {
      render(<NotificationsSection {...defaultProps} notificationsEnabled={true} />)

      expect(screen.queryByText('settings.notifications.enableNotifications')).not.toBeInTheDocument()
    })

    it('requests permission when button clicked', async () => {
      vi.mocked(notificationService.unifiedNotificationService.requestNativePermission).mockResolvedValue(
        'granted'
      )

      render(<NotificationsSection {...defaultProps} />)

      const button = screen.getByText('settings.notifications.enableNotifications')
      fireEvent.click(button)

      expect(notificationService.unifiedNotificationService.requestNativePermission).toHaveBeenCalled()
    })

    it('enables notifications after permission granted', async () => {
      vi.mocked(notificationService.unifiedNotificationService.requestNativePermission).mockResolvedValue(
        'granted'
      )
      const onSetNotificationsEnabled = vi.fn()

      render(
        <NotificationsSection {...defaultProps} onSetNotificationsEnabled={onSetNotificationsEnabled} />
      )

      const button = screen.getByText('settings.notifications.enableNotifications')
      await fireEvent.click(button)

      await vi.waitFor(() => {
        expect(onSetNotificationsEnabled).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('when native permission denied', () => {
    beforeEach(() => {
      vi.mocked(notificationService.unifiedNotificationService.getNativePermission).mockReturnValue('denied')
    })

    it('shows browser denied info message', () => {
      render(<NotificationsSection {...defaultProps} />)

      expect(screen.getByText('settings.notifications.browserDeniedUsingInApp')).toBeInTheDocument()
    })

    it('does not show enable button', () => {
      render(<NotificationsSection {...defaultProps} />)

      expect(screen.queryByText('settings.notifications.enableNotifications')).not.toBeInTheDocument()
    })
  })

  describe('when notifications enabled', () => {
    it('shows browser notification indicator when native is available', () => {
      vi.mocked(notificationService.unifiedNotificationService.isNativeAvailable).mockReturnValue(true)

      render(<NotificationsSection {...defaultProps} notificationsEnabled={true} />)

      expect(screen.getByText('settings.notifications.usingBrowser')).toBeInTheDocument()
    })

    it('shows in-app indicator when native not available', () => {
      vi.mocked(notificationService.unifiedNotificationService.isNativeAvailable).mockReturnValue(false)

      render(<NotificationsSection {...defaultProps} notificationsEnabled={true} />)

      expect(screen.getByText('settings.notifications.usingInApp')).toBeInTheDocument()
    })

    it('shows reminder time options', () => {
      render(<NotificationsSection {...defaultProps} notificationsEnabled={true} />)

      expect(screen.getByText('settings.notifications.reminderTimes')).toBeInTheDocument()
      expect(screen.getByText('settings.notifications.reminderTime.1h')).toBeInTheDocument()
      expect(screen.getByText('settings.notifications.reminderTime.2h')).toBeInTheDocument()
      expect(screen.getByText('settings.notifications.reminderTime.1d')).toBeInTheDocument()
    })

    it('shows selected reminder times as pressed', () => {
      render(
        <NotificationsSection
          {...defaultProps}
          notificationsEnabled={true}
          reminderTimes={['1h', '1d']}
        />
      )

      const button1h = screen.getByText('settings.notifications.reminderTime.1h').closest('button')
      const button2h = screen.getByText('settings.notifications.reminderTime.2h').closest('button')
      const button1d = screen.getByText('settings.notifications.reminderTime.1d').closest('button')

      expect(button1h).toHaveAttribute('aria-pressed', 'true')
      expect(button2h).toHaveAttribute('aria-pressed', 'false')
      expect(button1d).toHaveAttribute('aria-pressed', 'true')
    })

    it('adds reminder time when unselected time clicked', () => {
      const onSetReminderTimes = vi.fn()

      render(
        <NotificationsSection
          {...defaultProps}
          notificationsEnabled={true}
          reminderTimes={['1h']}
          onSetReminderTimes={onSetReminderTimes}
        />
      )

      const button2h = screen.getByText('settings.notifications.reminderTime.2h')
      fireEvent.click(button2h)

      expect(onSetReminderTimes).toHaveBeenCalledWith(['1h', '2h'])
    })

    it('removes reminder time when selected time clicked', () => {
      const onSetReminderTimes = vi.fn()

      render(
        <NotificationsSection
          {...defaultProps}
          notificationsEnabled={true}
          reminderTimes={['1h', '2h']}
          onSetReminderTimes={onSetReminderTimes}
        />
      )

      const button1h = screen.getByText('settings.notifications.reminderTime.1h')
      fireEvent.click(button1h)

      expect(onSetReminderTimes).toHaveBeenCalledWith(['2h'])
    })

    it('does not remove last reminder time', () => {
      const onSetReminderTimes = vi.fn()

      render(
        <NotificationsSection
          {...defaultProps}
          notificationsEnabled={true}
          reminderTimes={['1h']}
          onSetReminderTimes={onSetReminderTimes}
        />
      )

      const button1h = screen.getByText('settings.notifications.reminderTime.1h')
      fireEvent.click(button1h)

      // Should not be called since it would result in empty array
      expect(onSetReminderTimes).not.toHaveBeenCalled()
    })
  })

  it('shows foreground note', () => {
    render(<NotificationsSection {...defaultProps} />)

    expect(screen.getByText('settings.notifications.foregroundNote')).toBeInTheDocument()
  })
})
