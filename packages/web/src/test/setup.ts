// Polyfills must be imported first (via setupFiles order in vite.config.ts)
import '@testing-library/jest-dom'
import { configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { preloadDateLocales } from '@/common/hooks/useDateFormat'
import { preloadTranslations } from '@/i18n'

import { server } from './msw/server'

/**
 * Timeout for waitFor/findBy* assertions.
 *
 * Testing Library defaults to 1s, which several suites that render lazy()
 * trees can exceed on a loaded CI runner purely from chunk resolution —
 * a timeout, not a real failure. Cold resolution was measured at ~1.2s under
 * heavy CPU contention, so 3s gives that headroom while staying below the
 * 10s testTimeout in vite.config.ts. Keeping RTL's timeout the shorter of the
 * two means it wins the race and reports the DOM instead of Vitest reporting
 * a bare test timeout.
 */
const ASYNC_UTIL_TIMEOUT_MS = 3000

configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS })

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

// Reset handlers after each test to ensure test isolation
afterEach(() => {
  server.resetHandlers()
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
