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
  notificationService: {
    isSupported: vi.fn(() => true),
    getPermission: vi.fn(() => 'default'),
    requestPermission: vi.fn(),
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
    vi.mocked(notificationService.notificationService.isSupported).mockReturnValue(true)
    vi.mocked(notificationService.notificationService.getPermission).mockReturnValue('default')
  })

  describe('when notifications not supported', () => {
    it('shows not supported message', () => {
      vi.mocked(notificationService.notificationService.isSupported).mockReturnValue(false)

      render(<NotificationsSection {...defaultProps} />)

      expect(screen.getByText('settings.notifications.notSupported')).toBeInTheDocument()
    })
  })

  describe('when permission not yet requested', () => {
    it('shows enable notifications button', () => {
      render(<NotificationsSection {...defaultProps} />)

      expect(screen.getByText('settings.notifications.enableNotifications')).toBeInTheDocument()
    })

    it('requests permission when button clicked', async () => {
      vi.mocked(notificationService.notificationService.requestPermission).mockResolvedValue(
        'granted'
      )

      render(<NotificationsSection {...defaultProps} />)

      const button = screen.getByText('settings.notifications.enableNotifications')
      fireEvent.click(button)

      expect(notificationService.notificationService.requestPermission).toHaveBeenCalled()
    })

    it('enables notifications after permission granted', async () => {
      vi.mocked(notificationService.notificationService.requestPermission).mockResolvedValue(
        'granted'
      )
      const onSetNotificationsEnabled = vi.fn()

      render(
        <NotificationsSection {...defaultProps} onSetNotificationsEnabled={onSetNotificationsEnabled} />
      )

      const button = screen.getByText('settings.notifications.enableNotifications')
      await fireEvent.click(button)

      // Wait for async permission request to complete
      await vi.waitFor(() => {
        expect(onSetNotificationsEnabled).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('when permission denied', () => {
    it('shows permission denied warning', () => {
      vi.mocked(notificationService.notificationService.getPermission).mockReturnValue('denied')

      render(<NotificationsSection {...defaultProps} />)

      expect(screen.getByText('settings.notifications.permissionDenied')).toBeInTheDocument()
    })

    it('does not show enable button', () => {
      vi.mocked(notificationService.notificationService.getPermission).mockReturnValue('denied')

      render(<NotificationsSection {...defaultProps} />)

      expect(
        screen.queryByText('settings.notifications.enableNotifications')
      ).not.toBeInTheDocument()
    })
  })

  describe('when permission granted', () => {
    beforeEach(() => {
      vi.mocked(notificationService.notificationService.getPermission).mockReturnValue('granted')
    })

    it('shows toggle switch for game reminders', () => {
      render(<NotificationsSection {...defaultProps} />)

      expect(screen.getByText('settings.notifications.gameReminders')).toBeInTheDocument()
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('toggles notifications on switch click', () => {
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

    describe('when notifications enabled', () => {
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
  })

  it('shows foreground note in all states', () => {
    vi.mocked(notificationService.notificationService.getPermission).mockReturnValue('granted')

    render(<NotificationsSection {...defaultProps} />)

    expect(screen.getByText('settings.notifications.foregroundNote')).toBeInTheDocument()
  })
})
