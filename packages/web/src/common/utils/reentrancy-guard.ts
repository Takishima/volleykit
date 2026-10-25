import type { RefObject } from 'react'

/**
 * Runs `action` unless a previous run is still in progress, so a double
 * activation (e.g. a double click) cannot trigger it twice.
 * The guard is released even when the action throws.
 */
export function runUnlessInProgress(inProgress: RefObject<boolean>, action: () => void): void {
  if (inProgress.current) return
  inProgress.current = true
  try {
    action()
  } finally {
    inProgress.current = false
  }
}
