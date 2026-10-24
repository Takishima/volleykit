// Polyfills must be imported first (via setupFiles order in vite.config.ts)
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

import { preloadDateLocales } from '@/common/hooks/useDateFormat'
import { preloadTranslations } from '@/i18n'

import { server } from './msw/server'
import { ASYNC_UTIL_TIMEOUT_MS } from './timeouts'

configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS })

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'bypass' })
})

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers()
  // Restore vi.stubEnv() here rather than relying on `unstubEnvs` in
  // vite.config.ts: under the vmThreads pool that config hook runs on a
  // different `vitest` instance than the test file's and finds nothing to
  // restore. process.env is shared by every file a worker runs next, so a
  // leaked stub (e.g. VITE_API_PROXY_URL) turns later files' API calls
  // cross-origin and their CORS preflights escape msw. Setup files load on
  // the test file's own instance, like the resetHandlers() above.
  vi.unstubAllEnvs()
})

// Clean up after all tests
afterAll(() => {
  server.close()
})

// Preload all translations and date locales before each test file runs.
// This ensures synchronous availability of localized strings during tests.
beforeAll(async () => {
  await Promise.all([preloadTranslations(), preloadDateLocales()])
})

globalThis.ResizeObserver = class ResizeObserver {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    const width = (target as HTMLElement).offsetWidth || 0
    const height = (target as HTMLElement).offsetHeight || 0

    const contentRect = {
      width,
      height,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      x: 0,
      y: 0,
      toJSON() {
        return {
          width: this.width,
          height: this.height,
          top: this.top,
          left: this.left,
          bottom: this.bottom,
          right: this.right,
          x: this.x,
          y: this.y,
        }
      },
    }

    const entry = {
      target,
      contentRect,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as unknown as ResizeObserverEntry

    setTimeout(() => {
      this.callback([entry], this)
    }, 0)
  }

  unobserve() {}
  disconnect() {}
}
