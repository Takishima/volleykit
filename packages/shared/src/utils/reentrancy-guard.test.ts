import { describe, it, expect, vi } from 'vitest'

import { runUnlessInProgress } from './reentrancy-guard'

describe('runUnlessInProgress', () => {
  it('runs the action and releases the guard afterwards', () => {
    const guard = { current: false }
    const action = vi.fn()

    runUnlessInProgress(guard, action)

    expect(action).toHaveBeenCalledTimes(1)
    expect(guard.current).toBe(false)
  })

  it('skips a re-entrant call while the action is running', () => {
    const guard = { current: false }
    const inner = vi.fn()
    const action = vi.fn(() => runUnlessInProgress(guard, inner))

    runUnlessInProgress(guard, action)

    expect(action).toHaveBeenCalledTimes(1)
    expect(inner).not.toHaveBeenCalled()
  })

  it('releases the guard when the action throws', () => {
    const guard = { current: false }

    expect(() =>
      runUnlessInProgress(guard, () => {
        throw new Error('boom')
      })
    ).toThrow('boom')
    expect(guard.current).toBe(false)
  })
})
