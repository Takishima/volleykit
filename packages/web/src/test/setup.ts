// Polyfills must be imported first (via setupFiles order in vite.config.ts)
import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { preloadTranslations } from '@/i18n'
import { preloadDateLocales } from '@/shared/hooks/useDateFormat'

import { server } from './msw/server'

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
