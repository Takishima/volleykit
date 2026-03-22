/**
 * Typed error classes for network-level failures.
 *
 * These allow the UI (error boundaries, toast handlers) to distinguish between
 * "device is offline", "server is unreachable", and "service unavailable (kill switch)"
 * and show appropriate user-facing messages.
 */

/**
 * Thrown when fetch() fails with a TypeError (DNS failure, connection refused, etc.).
 * The `isOnline` flag distinguishes "device offline" from "server unreachable".
 */
export class NetworkError extends Error {
  readonly isOnline: boolean

  constructor(isOnline: boolean) {
    const message = isOnline
      ? 'Cannot reach the server. The server may be down or blocked by your network.'
      : 'You are offline. Please check your internet connection.'
    super(message)
    this.name = 'NetworkError'
    this.isOnline = isOnline
  }
}

/**
 * Thrown when the API returns 503 Service Unavailable.
 * Typically indicates the Worker kill switch is active.
 * The UI should direct users to volleymanager.volleyball.ch.
 */
export class ServiceUnavailableError extends Error {
  constructor() {
    super('Service temporarily unavailable')
    this.name = 'ServiceUnavailableError'
  }
}
