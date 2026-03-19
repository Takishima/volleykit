/**
 * Polyfills required for the test environment.
 * This file must be imported BEFORE any other imports that might use these APIs.
 */

// Polyfill BroadcastChannel for MSW in happy-dom environment
// MSW 2.x uses BroadcastChannel internally for WebSocket mocking
if (typeof globalThis.BroadcastChannel === 'undefined') {
  globalThis.BroadcastChannel = class BroadcastChannel {
    name: string
    constructor(name: string) {
      this.name = name
    }
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    onmessage = null
    onmessageerror = null
  } as unknown as typeof BroadcastChannel
}
