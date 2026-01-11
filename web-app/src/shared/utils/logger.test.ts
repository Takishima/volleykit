import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { logger, createLogger } from './logger'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should have debug method', () => {
    expect(typeof logger.debug).toBe('function')
    logger.debug('test message', 123)
  })

  it('should have info method', () => {
    expect(typeof logger.info).toBe('function')
    logger.info('info message')
  })

  it('should have warn method', () => {
    expect(typeof logger.warn).toBe('function')
    logger.warn('warning message')
  })

  it('should have error method', () => {
    expect(typeof logger.error).toBe('function')
    logger.error('error message')
  })
})

describe('createLogger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create a logger with context prefix', () => {
    const log = createLogger('TestContext')
    expect(typeof log.debug).toBe('function')
    expect(typeof log.info).toBe('function')
    expect(typeof log.warn).toBe('function')
    expect(typeof log.error).toBe('function')
  })

  it('should include context in debug calls', () => {
    const log = createLogger('TestContext')
    log.debug('test message', { data: 123 })
    expect(console.log).toHaveBeenCalledWith('[VolleyKit][TestContext]', 'test message', {
      data: 123,
    })
  })

  it('should include context in info calls', () => {
    const log = createLogger('TestContext')
    log.info('info message')
    expect(console.info).toHaveBeenCalledWith('[VolleyKit][TestContext]', 'info message')
  })

  it('should include context in warn calls', () => {
    const log = createLogger('TestContext')
    log.warn('warning message')
    expect(console.warn).toHaveBeenCalledWith('[VolleyKit][TestContext]', 'warning message')
  })

  it('should include context in error calls', () => {
    const log = createLogger('TestContext')
    log.error('error message', new Error('test'))
    expect(console.error).toHaveBeenCalledWith(
      '[VolleyKit][TestContext]',
      'error message',
      expect.any(Error)
    )
  })

  it('should create independent loggers with different contexts', () => {
    const logA = createLogger('ContextA')
    const logB = createLogger('ContextB')

    logA.debug('message A')
    logB.debug('message B')

    expect(console.log).toHaveBeenCalledWith('[VolleyKit][ContextA]', 'message A')
    expect(console.log).toHaveBeenCalledWith('[VolleyKit][ContextB]', 'message B')
  })
})
