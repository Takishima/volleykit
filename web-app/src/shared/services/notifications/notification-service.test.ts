import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { notificationService } from './notification-service'

// Helper to create a mock Notification class with configurable permission
function createMockNotification(permission: NotificationPermission = 'default') {
  // Use a proper class for the mock to work with `new` operator
  class MockNotification {
    title: string
    options: NotificationOptions
    close = vi.fn()

    constructor(title: string, options?: NotificationOptions) {
      this.title = title
      this.options = options ?? {}
    }

    static permission: NotificationPermission = permission
    static requestPermission = vi.fn().mockResolvedValue(permission)
  }

  // Create a spy wrapper around the class to track calls
  const MockNotificationSpy = vi.fn().mockImplementation(function (
    this: MockNotification,
    title: string,
    options?: NotificationOptions
  ) {
    return new MockNotification(title, options)
  }) as unknown as typeof Notification

  Object.defineProperty(MockNotificationSpy, 'permission', {
    value: permission,
    configurable: true,
    writable: true,
  })

  MockNotificationSpy.requestPermission = vi.fn().mockResolvedValue(permission)

  return MockNotificationSpy
}

describe('notificationService', () => {
  let originalNotification: typeof Notification | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    notificationService.cancelAllScheduledNotifications()
    // Store original Notification
    originalNotification = window.Notification
    // Set up a default mock Notification
    window.Notification = createMockNotification('default')
  })

  afterEach(() => {
    vi.useRealTimers()
    notificationService.cancelAllScheduledNotifications()
    // Restore original Notification
    if (originalNotification) {
      window.Notification = originalNotification
    }
  })

  describe('isSupported', () => {
    it('returns true when Notification API is available', () => {
      expect(notificationService.isSupported()).toBe(true)
    })

    it('returns false when Notification API is not available', () => {
      // @ts-expect-error - Temporarily remove Notification
      delete window.Notification

      expect(notificationService.isSupported()).toBe(false)
    })
  })

  describe('getPermission', () => {
    it('returns current notification permission', () => {
      const permission = notificationService.getPermission()
      expect(['granted', 'denied', 'default']).toContain(permission)
    })

    it('returns denied when notifications not supported', () => {
      // @ts-expect-error - Temporarily remove Notification
      delete window.Notification

      expect(notificationService.getPermission()).toBe('denied')
    })
  })

  describe('requestPermission', () => {
    it('returns denied when notifications not supported', async () => {
      // @ts-expect-error - Temporarily remove Notification
      delete window.Notification

      const result = await notificationService.requestPermission()
      expect(result).toBe('denied')
    })

    it('returns current permission without re-prompting if already granted', async () => {
      window.Notification = createMockNotification('granted')

      const result = await notificationService.requestPermission()
      expect(result).toBe('granted')
    })

    it('returns current permission without re-prompting if already denied', async () => {
      window.Notification = createMockNotification('denied')

      const result = await notificationService.requestPermission()
      expect(result).toBe('denied')
    })
  })

  describe('scheduleNotification', () => {
    it('schedules a notification for future time', () => {
      const now = Date.now()
      const futureTime = now + 5000 // 5 seconds from now

      const scheduled = notificationService.scheduleNotification(
        'test-1',
        { title: 'Test', body: 'Test body' },
        futureTime
      )

      expect(scheduled).not.toBeNull()
      expect(scheduled?.id).toBe('test-1')
      expect(scheduled?.scheduledTime).toBe(futureTime)

      const all = notificationService.getScheduledNotifications()
      expect(all).toHaveLength(1)
    })

    it('returns null for past times', () => {
      const pastTime = Date.now() - 1000

      const scheduled = notificationService.scheduleNotification(
        'test-past',
        { title: 'Test', body: 'Test body' },
        pastTime
      )

      expect(scheduled).toBeNull()
    })

    it('returns null for times more than 24 hours in advance', () => {
      const farFuture = Date.now() + 25 * 60 * 60 * 1000 // 25 hours

      const scheduled = notificationService.scheduleNotification(
        'test-far',
        { title: 'Test', body: 'Test body' },
        farFuture
      )

      expect(scheduled).toBeNull()
    })

    it('cancels existing notification with same ID before scheduling new one', () => {
      const now = Date.now()

      notificationService.scheduleNotification(
        'test-id',
        { title: 'First', body: 'First body' },
        now + 5000
      )

      notificationService.scheduleNotification(
        'test-id',
        { title: 'Second', body: 'Second body' },
        now + 10000
      )

      const all = notificationService.getScheduledNotifications()
      expect(all).toHaveLength(1)
      expect(all[0]?.scheduledTime).toBe(now + 10000)
    })
  })

  describe('cancelScheduledNotification', () => {
    it('cancels a specific scheduled notification', () => {
      const now = Date.now()

      notificationService.scheduleNotification('test-1', { title: 'Test 1', body: 'Body 1' }, now + 5000)
      notificationService.scheduleNotification('test-2', { title: 'Test 2', body: 'Body 2' }, now + 10000)

      expect(notificationService.getScheduledNotifications()).toHaveLength(2)

      notificationService.cancelScheduledNotification('test-1')

      const remaining = notificationService.getScheduledNotifications()
      expect(remaining).toHaveLength(1)
      expect(remaining[0]?.id).toBe('test-2')
    })

    it('does nothing for non-existent ID', () => {
      const now = Date.now()

      notificationService.scheduleNotification('test-1', { title: 'Test', body: 'Body' }, now + 5000)

      notificationService.cancelScheduledNotification('non-existent')

      expect(notificationService.getScheduledNotifications()).toHaveLength(1)
    })
  })

  describe('cancelAllScheduledNotifications', () => {
    it('cancels all scheduled notifications', () => {
      const now = Date.now()

      notificationService.scheduleNotification('test-1', { title: 'T1', body: 'B1' }, now + 5000)
      notificationService.scheduleNotification('test-2', { title: 'T2', body: 'B2' }, now + 10000)
      notificationService.scheduleNotification('test-3', { title: 'T3', body: 'B3' }, now + 15000)

      expect(notificationService.getScheduledNotifications()).toHaveLength(3)

      notificationService.cancelAllScheduledNotifications()

      expect(notificationService.getScheduledNotifications()).toHaveLength(0)
    })
  })

  describe('getScheduledNotifications', () => {
    it('returns empty array when no notifications scheduled', () => {
      expect(notificationService.getScheduledNotifications()).toEqual([])
    })

    it('returns all scheduled notifications', () => {
      const now = Date.now()

      notificationService.scheduleNotification('a', { title: 'A', body: 'A' }, now + 1000)
      notificationService.scheduleNotification('b', { title: 'B', body: 'B' }, now + 2000)

      const notifications = notificationService.getScheduledNotifications()
      expect(notifications).toHaveLength(2)
      expect(notifications.map((n) => n.id)).toContain('a')
      expect(notifications.map((n) => n.id)).toContain('b')
    })
  })

  describe('showNotification', () => {
    it('returns error when notifications not supported', async () => {
      // @ts-expect-error - Temporarily remove Notification
      delete window.Notification

      const result = await notificationService.showNotification({
        title: 'Test',
        body: 'Test body',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not supported')
    })

    it('returns error when permission not granted', async () => {
      window.Notification = createMockNotification('denied')

      const result = await notificationService.showNotification({
        title: 'Test',
        body: 'Test body',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not granted')
    })

    it('shows notification when permission granted', async () => {
      window.Notification = createMockNotification('granted')

      // Mock service worker to ensure fallback to Notification constructor is used
      const originalServiceWorker = navigator.serviceWorker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { controller: null },
        configurable: true,
      })

      const result = await notificationService.showNotification({
        title: 'Test',
        body: 'Test body',
      })

      expect(result.success).toBe(true)
      expect(window.Notification).toHaveBeenCalledWith('Test', expect.objectContaining({ body: 'Test body' }))

      // Restore service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true,
      })
    })
  })
})
