import { describe, it, expect, vi, afterEach } from 'vitest'

import { clearApiResponseCaches } from './sw-cache'
import { API_RESPONSE_CACHE_NAMES } from './sw-cache-config'

describe('clearApiResponseCaches', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deletes every API response cache', async () => {
    const deleteCache = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('caches', { delete: deleteCache })

    await clearApiResponseCaches()

    expect(deleteCache).toHaveBeenCalledTimes(API_RESPONSE_CACHE_NAMES.length)
    for (const name of API_RESPONSE_CACHE_NAMES) {
      expect(deleteCache).toHaveBeenCalledWith(name)
    }
  })

  it('resolves without CacheStorage support', async () => {
    vi.stubGlobal('caches', undefined)

    await expect(clearApiResponseCaches()).resolves.toBeUndefined()
  })

  it('propagates deletion failures to the caller', async () => {
    vi.stubGlobal('caches', { delete: vi.fn().mockRejectedValue(new Error('quota')) })

    await expect(clearApiResponseCaches()).rejects.toThrow('quota')
  })
})
