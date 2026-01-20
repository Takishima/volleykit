import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { authLogger, getAuthLogs, clearAuthLogs, onAuthLogsChange } from './auth-log-buffer'

describe('authLogger', () => {
  beforeEach(() => {
    clearAuthLogs()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    clearAuthLogs()
  })

  describe('logging methods', () => {
    it('should have debug method that adds entry to buffer', () => {
      authLogger.debug('test debug message')

      const logs = getAuthLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]!.level).toBe('debug')
      expect(logs[0]!.message).toBe('test debug message')
    })

    it('should have info method that adds entry to buffer', () => {
      authLogger.info('test info message')

      const logs = getAuthLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]!.level).toBe('info')
      expect(logs[0]!.message).toBe('test info message')
    })

    it('should have warn method that adds entry to buffer', () => {
      authLogger.warn('test warning message')

      const logs = getAuthLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]!.level).toBe('warn')
      expect(logs[0]!.message).toBe('test warning message')
    })

    it('should have error method that adds entry to buffer', () => {
      authLogger.error('test error message')

      const logs = getAuthLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0]!.level).toBe('error')
      expect(logs[0]!.message).toBe('test error message')
    })

    it('should store additional data with log entry', () => {
      const testData = { userId: 123, action: 'login' }
      authLogger.info('login attempt', testData)

      const logs = getAuthLogs()
      expect(logs[0]!.data).toEqual(testData)
    })

    it('should store timestamp with log entry', () => {
      const before = Date.now()
      authLogger.debug('timed message')
      const after = Date.now()

      const logs = getAuthLogs()
      expect(logs[0]!.timestamp).toBeGreaterThanOrEqual(before)
      expect(logs[0]!.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('getAuthLogs', () => {
    it('should return empty array when no logs exist', () => {
      expect(getAuthLogs()).toEqual([])
    })

    it('should return logs in order they were added (oldest first)', () => {
      authLogger.debug('first')
      authLogger.info('second')
      authLogger.warn('third')

      const logs = getAuthLogs()
      expect(logs).toHaveLength(3)
      expect(logs[0]!.message).toBe('first')
      expect(logs[1]!.message).toBe('second')
      expect(logs[2]!.message).toBe('third')
    })

    it('should return stable reference until logs change', () => {
      authLogger.debug('test')

      const logs1 = getAuthLogs()
      const logs2 = getAuthLogs()

      expect(logs1).toBe(logs2)
    })

    it('should return new reference after logs change', () => {
      authLogger.debug('first')
      const logs1 = getAuthLogs()

      authLogger.debug('second')
      const logs2 = getAuthLogs()

      expect(logs1).not.toBe(logs2)
    })
  })

  describe('clearAuthLogs', () => {
    it('should clear all log entries', () => {
      authLogger.debug('message 1')
      authLogger.info('message 2')
      authLogger.warn('message 3')

      expect(getAuthLogs()).toHaveLength(3)

      clearAuthLogs()

      expect(getAuthLogs()).toEqual([])
    })

    it('should notify subscribers when cleared', () => {
      const callback = vi.fn()
      onAuthLogsChange(callback)

      authLogger.debug('message')
      callback.mockClear()

      clearAuthLogs()

      expect(callback).toHaveBeenCalledTimes(1)
    })
  })

  describe('onAuthLogsChange', () => {
    it('should notify subscriber when log is added', () => {
      const callback = vi.fn()
      onAuthLogsChange(callback)

      authLogger.debug('test message')

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should notify subscriber for each log added', () => {
      const callback = vi.fn()
      onAuthLogsChange(callback)

      authLogger.debug('first')
      authLogger.info('second')
      authLogger.warn('third')

      expect(callback).toHaveBeenCalledTimes(3)
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = onAuthLogsChange(callback)

      authLogger.debug('before unsubscribe')
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()

      authLogger.debug('after unsubscribe')
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should support multiple subscribers', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      onAuthLogsChange(callback1)
      onAuthLogsChange(callback2)

      authLogger.debug('test')

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('should only unsubscribe the specific callback', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsubscribe1 = onAuthLogsChange(callback1)
      onAuthLogsChange(callback2)

      unsubscribe1()

      authLogger.debug('test')

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })

  describe('circular buffer behavior', () => {
    it('should keep only the last 50 entries', () => {
      // Add 55 entries
      for (let i = 0; i < 55; i++) {
        authLogger.debug(`message ${i}`)
      }

      const logs = getAuthLogs()
      expect(logs).toHaveLength(50)
      // First 5 should have been removed (0-4)
      expect(logs[0]!.message).toBe('message 5')
      expect(logs[49]!.message).toBe('message 54')
    })

    it('should remove oldest entries first', () => {
      // Fill the buffer
      for (let i = 0; i < 50; i++) {
        authLogger.debug(`old ${i}`)
      }

      // Add one more
      authLogger.info('new entry')

      const logs = getAuthLogs()
      expect(logs).toHaveLength(50)
      expect(logs[0]!.message).toBe('old 1')
      expect(logs[49]!.message).toBe('new entry')
      expect(logs[49]!.level).toBe('info')
    })
  })
})
