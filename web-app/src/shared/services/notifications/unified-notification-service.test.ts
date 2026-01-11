import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useToastStore } from '@/shared/stores/toast'

import { notificationService } from './notification-service'
import { unifiedNotificationService } from './unified-notification-service'

// Mock the native notification service
vi.mock('./notification-service', () => ({
  notificationService: {
    isSupported: vi.fn(),
    getPermission: vi.fn(),
    requestPermission: vi.fn(),
    showNotification: vi.fn(),
    scheduleNotification: vi.fn(),
    cancelScheduledNotification: vi.fn(),
    cancelAllScheduledNotifications: vi.fn(),
    getScheduledNotifications: vi.fn(),
  },
}))

describe('unifiedNotificationService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Reset all mocks
    vi.mocked(notificationService.isSupported).mockReturnValue(true)
    vi.mocked(notificationService.getPermission).mockReturnValue('granted')
    vi.mocked(notificationService.requestPermission).mockResolvedValue('granted')
    vi.mocked(notificationService.showNotification).mockResolvedValue({ success: true })
    vi.mocked(notificationService.scheduleNotification).mockReturnValue(null)
    vi.mocked(notificationService.getScheduledNotifications).mockReturnValue([])
    // Clear toast store
    useToastStore.getState().clearToasts()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    useToastStore.getState().clearToasts()
  })

  describe('isNativeSupported', () => {
    it('returns true when native notifications are supported', () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(true)
      expect(unifiedNotificationService.isNativeSupported()).toBe(true)
    })

    it('returns false when native notifications are not supported', () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(false)
      expect(unifiedNotificationService.isNativeSupported()).toBe(false)
    })
  })

  describe('isNativeAvailable', () => {
    it('returns true when native is supported and permission granted', () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(true)
      vi.mocked(notificationService.getPermission).mockReturnValue('granted')
      expect(unifiedNotificationService.isNativeAvailable()).toBe(true)
    })

    it('returns false when native is not supported', () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(false)
      vi.mocked(notificationService.getPermission).mockReturnValue('granted')
      expect(unifiedNotificationService.isNativeAvailable()).toBe(false)
    })

    it('returns false when permission not granted', () => {
      vi.mocked(notificationService.isSupported).mockReturnValue(true)
      vi.mocked(notificationService.getPermission).mockReturnValue('denied')
      expect(unifiedNotificationService.isNativeAvailable()).toBe(false)
    })
  })

  describe('getNativePermission', () => {
    it('delegates to native notification service', () => {
      vi.mocked(notificationService.getPermission).mockReturnValue('default')
      expect(unifiedNotificationService.getNativePermission()).toBe('default')
    })
  })

  describe('requestNativePermission', () => {
    it('delegates to native notification service', async () => {
      vi.mocked(notificationService.requestPermission).mockResolvedValue('granted')
      const result = await unifiedNotificationService.requestNativePermission()
      expect(result).toBe('granted')
      expect(notificationService.requestPermission).toHaveBeenCalled()
    })
  })

  describe('showNative', () => {
    it('delegates to native notification service', async () => {
      vi.mocked(notificationService.showNotification).mockResolvedValue({ success: true })
      const result = await unifiedNotificationService.showNative({
        title: 'Test',
        body: 'Test body',
      })
      expect(result.success).toBe(true)
      expect(notificationService.showNotification).toHaveBeenCalledWith({
        title: 'Test',
        body: 'Test body',
      })
    })
  })

  describe('showInApp', () => {
    it('shows toast notification with title and body combined', () => {
      const id = unifiedNotificationService.showInApp({
        title: 'Test Title',
        body: 'Test body',
        type: 'info',
      })
      expect(id).toBeDefined()

      const toasts = useToastStore.getState().toasts
      expect(toasts).toHaveLength(1)
      expect(toasts[0]?.message).toBe('Test Title: Test body')
      expect(toasts[0]?.type).toBe('info')
    })

    it('shows toast with custom duration', () => {
      unifiedNotificationService.showInApp({
        title: 'Test',
        body: 'Test body',
        duration: 10000,
      })

      const toasts = useToastStore.getState().toasts
      expect(toasts[0]?.duration).toBe(10000)
    })

    it('defaults to info type', () => {
      unifiedNotificationService.showInApp({
        title: 'Test',
        body: 'Test body',
      })

      const toasts = useToastStore.getState().toasts
      expect(toasts[0]?.type).toBe('info')
    })
  })

  describe('notify', () => {
    describe('with channel: native', () => {
      it('only shows native notification', async () => {
        vi.mocked(notificationService.showNotification).mockResolvedValue({ success: true })

        const result = await unifiedNotificationService.notify({
          title: 'Test',
          body: 'Test body',
          channel: 'native',
        })

        expect(result.success).toBe(true)
        expect(result.channels.native).toBe(true)
        expect(result.channels.inApp).toBeUndefined()
        expect(notificationService.showNotification).toHaveBeenCalled()
        expect(useToastStore.getState().toasts).toHaveLength(0)
      })
    })

    describe('with channel: in-app', () => {
      it('only shows in-app notification', async () => {
        const result = await unifiedNotificationService.notify({
          title: 'Test',
          body: 'Test body',
          channel: 'in-app',
        })

        expect(result.success).toBe(true)
        expect(result.channels.inApp).toBe(true)
        expect(result.channels.native).toBeUndefined()
        expect(notificationService.showNotification).not.toHaveBeenCalled()
        expect(useToastStore.getState().toasts).toHaveLength(1)
      })
    })

    describe('with channel: all', () => {
      it('shows both native and in-app notifications', async () => {
        vi.mocked(notificationService.showNotification).mockResolvedValue({ success: true })

        const result = await unifiedNotificationService.notify({
          title: 'Test',
          body: 'Test body',
          channel: 'all',
        })

        expect(result.success).toBe(true)
        expect(result.channels.native).toBe(true)
        expect(result.channels.inApp).toBe(true)
        expect(notificationService.showNotification).toHaveBeenCalled()
        expect(useToastStore.getState().toasts).toHaveLength(1)
      })
    })

    describe('with default channel (no explicit channel)', () => {
      it('uses native when available and falls back to in-app when not', async () => {
        // Native available
        vi.mocked(notificationService.isSupported).mockReturnValue(true)
        vi.mocked(notificationService.getPermission).mockReturnValue('granted')
        vi.mocked(notificationService.showNotification).mockResolvedValue({ success: true })

        const result = await unifiedNotificationService.notify({
          title: 'Test',
          body: 'Test body',
        })

        expect(result.success).toBe(true)
        expect(result.channels.native).toBe(true)
        // In-app should not be used when native is available
        expect(result.channels.inApp).toBeUndefined()
      })

      it('uses in-app when native is not available', async () => {
        // Native not available
        vi.mocked(notificationService.isSupported).mockReturnValue(true)
        vi.mocked(notificationService.getPermission).mockReturnValue('denied')

        const result = await unifiedNotificationService.notify({
          title: 'Test',
          body: 'Test body',
        })

        expect(result.success).toBe(true)
        expect(result.channels.inApp).toBe(true)
        expect(result.channels.native).toBeUndefined()
      })
    })
  })

  describe('schedule', () => {
    it('schedules a notification for future time', () => {
      const now = Date.now()
      const triggerTime = now + 5000

      const result = unifiedNotificationService.schedule(
        'test-id',
        { title: 'Test', body: 'Test body' },
        triggerTime
      )

      expect(result).not.toBeNull()
      expect(result?.id).toBe('test-id')
      expect(result?.scheduledTime).toBe(triggerTime)
    })

    it('returns null for past times', () => {
      const pastTime = Date.now() - 1000

      const result = unifiedNotificationService.schedule(
        'test-past',
        { title: 'Test', body: 'Test body' },
        pastTime
      )

      expect(result).toBeNull()
    })

    it('returns null for times more than 24 hours in advance', () => {
      const farFuture = Date.now() + 25 * 60 * 60 * 1000

      const result = unifiedNotificationService.schedule(
        'test-far',
        { title: 'Test', body: 'Test body' },
        farFuture
      )

      expect(result).toBeNull()
    })
  })

  describe('cancelScheduled', () => {
    it('cancels unified and native scheduled notifications', () => {
      const now = Date.now()
      unifiedNotificationService.schedule('test-id', { title: 'Test', body: 'Test' }, now + 5000)

      unifiedNotificationService.cancelScheduled('test-id')

      expect(notificationService.cancelScheduledNotification).toHaveBeenCalledWith('test-id')
    })
  })

  describe('cancelAllScheduled', () => {
    it('cancels all scheduled notifications', () => {
      const now = Date.now()
      unifiedNotificationService.schedule('test-1', { title: 'T1', body: 'B1' }, now + 5000)
      unifiedNotificationService.schedule('test-2', { title: 'T2', body: 'B2' }, now + 10000)

      unifiedNotificationService.cancelAllScheduled()

      expect(notificationService.cancelAllScheduledNotifications).toHaveBeenCalled()
    })
  })

  describe('getScheduled', () => {
    it('returns combined unified and native scheduled notifications', () => {
      vi.mocked(notificationService.getScheduledNotifications).mockReturnValue([
        { id: 'native-1', assignmentId: 'a1', scheduledTime: 1000, timeoutId: 123 as unknown as ReturnType<typeof setTimeout> },
      ])

      const now = Date.now()
      unifiedNotificationService.schedule('unified-1', { title: 'U1', body: 'B1' }, now + 5000)

      const scheduled = unifiedNotificationService.getScheduled()

      expect(scheduled.length).toBeGreaterThanOrEqual(1)
    })
  })
})
