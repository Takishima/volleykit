/**
 * Tests for the association guard: the server session must be confirmed to be
 * on the selected association before any scoped request, and any write makes
 * that confirmation stale.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  API_METHOD_SCOPES,
  getConfirmedServerAssociation,
  invalidateServerAssociation,
  noteServerAssociation,
  withAssociationGuard,
} from './association-guard'
import { api as rawApi } from './real-api'

type RawApi = typeof rawApi

/** A raw client whose every classified method records its call */
function createRawClient() {
  const client = {} as Record<keyof RawApi, ReturnType<typeof vi.fn>>
  for (const name of Object.keys(API_METHOD_SCOPES) as (keyof RawApi)[]) {
    client[name] = vi.fn().mockResolvedValue(`${name}-result`)
  }
  return client
}

function setup(expectedOccupationId: string | null = 'occupation-b') {
  const raw = createRawClient()
  let expected = expectedOccupationId
  const guarded = withAssociationGuard(raw as unknown as RawApi, () => expected)
  return {
    raw,
    guarded,
    setExpected: (id: string | null) => {
      expected = id
    },
  }
}

/** Lets every queued microtask and timer callback run before asserting on "not called" */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/** Waits until the given mock has been called at least once */
const calledOnce = (mock: ReturnType<typeof vi.fn>) =>
  vi.waitFor(() => expect(mock).toHaveBeenCalled())

/** Deferred promise helper for controlling the switch request */
function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('API_METHOD_SCOPES', () => {
  it('classifies every method of the real API client', () => {
    const rawMethods = Object.keys(rawApi).sort()
    const classified = Object.keys(API_METHOD_SCOPES).sort()

    expect(classified).toEqual(rawMethods)
  })

  it('has exactly one switch method', () => {
    const switches = Object.entries(API_METHOD_SCOPES).filter(([, scope]) => scope === 'switch')

    expect(switches).toEqual([['switchRoleAndAttribute', 'switch']])
  })
})

describe('withAssociationGuard', () => {
  beforeEach(() => {
    invalidateServerAssociation()
  })

  describe('reads', () => {
    it('switches the server to the selected occupation before the first read', async () => {
      const { raw, guarded } = setup('occupation-b')

      const result = await guarded.searchAssignments({})

      expect(raw.switchRoleAndAttribute).toHaveBeenCalledWith('occupation-b')
      expect(raw.switchRoleAndAttribute.mock.invocationCallOrder[0]!).toBeLessThan(
        raw.searchAssignments.mock.invocationCallOrder[0]!
      )
      expect(result).toBe('searchAssignments-result')
      expect(getConfirmedServerAssociation()).toBe('occupation-b')
    })

    it('does not switch when the server is already confirmed on the selection', async () => {
      const { raw, guarded } = setup('occupation-b')
      noteServerAssociation('occupation-b')

      await guarded.searchCompensations({})
      await guarded.getActiveSeason()

      expect(raw.switchRoleAndAttribute).not.toHaveBeenCalled()
    })

    it('switches when the server is known to be on another occupation', async () => {
      const { raw, guarded } = setup('occupation-b')
      noteServerAssociation('occupation-a')

      await guarded.searchExchanges({})

      expect(raw.switchRoleAndAttribute).toHaveBeenCalledWith('occupation-b')
    })

    it('does nothing special when no occupation is selected locally', async () => {
      const { raw, guarded } = setup(null)

      await guarded.searchAssignments({})

      expect(raw.switchRoleAndAttribute).not.toHaveBeenCalled()
      expect(raw.searchAssignments).toHaveBeenCalled()
    })

    it('shares one switch request between concurrent reads', async () => {
      const { raw, guarded } = setup('occupation-b')
      const gate = deferred()
      raw.switchRoleAndAttribute.mockReturnValue(gate.promise)

      const reads = Promise.all([
        guarded.searchAssignments({}),
        guarded.searchCompensations({}),
        guarded.getAssociationSettings(),
      ])
      await calledOnce(raw.switchRoleAndAttribute)
      await flush()
      expect(raw.searchAssignments).not.toHaveBeenCalled()

      gate.resolve()
      await reads

      expect(raw.switchRoleAndAttribute).toHaveBeenCalledTimes(1)
      expect(raw.searchAssignments).toHaveBeenCalledTimes(1)
      expect(raw.searchCompensations).toHaveBeenCalledTimes(1)
      expect(raw.getAssociationSettings).toHaveBeenCalledTimes(1)
    })

    it('fails the read instead of reading the wrong association when the switch fails', async () => {
      const { raw, guarded } = setup('occupation-b')
      raw.switchRoleAndAttribute.mockRejectedValue(new Error('500'))

      await expect(guarded.searchAssignments({})).rejects.toThrow('500')

      expect(raw.searchAssignments).not.toHaveBeenCalled()
      expect(getConfirmedServerAssociation()).toBeNull()
    })

    it('follows a selection that changes while a switch is in flight', async () => {
      const { raw, guarded, setExpected } = setup('occupation-b')
      const firstSwitch = deferred()
      raw.switchRoleAndAttribute.mockReturnValueOnce(firstSwitch.promise)

      const read = guarded.searchAssignments({})
      await calledOnce(raw.switchRoleAndAttribute)
      setExpected('occupation-c')
      firstSwitch.resolve()
      await read

      expect(raw.switchRoleAndAttribute.mock.calls.map(([id]) => id)).toEqual([
        'occupation-b',
        'occupation-c',
      ])
      expect(getConfirmedServerAssociation()).toBe('occupation-c')
    })
  })

  describe('writes', () => {
    it('confirms the association before the write and forgets it afterwards', async () => {
      const { raw, guarded } = setup('occupation-b')

      await guarded.updateCompensation('comp-1', { distanceInMetres: 5000 })

      expect(raw.switchRoleAndAttribute).toHaveBeenCalledWith('occupation-b')
      expect(raw.switchRoleAndAttribute.mock.invocationCallOrder[0]!).toBeLessThan(
        raw.updateCompensation.mock.invocationCallOrder[0]!
      )
      expect(getConfirmedServerAssociation()).toBeNull()
    })

    it('re-asserts the association on the read that follows a write', async () => {
      const { raw, guarded } = setup('occupation-b')
      noteServerAssociation('occupation-b')

      await guarded.updateCompensation('comp-1', { distanceInMetres: 5000 })
      await guarded.searchAssignments({})

      expect(raw.switchRoleAndAttribute).toHaveBeenCalledTimes(1)
      const order = [
        raw.updateCompensation.mock.invocationCallOrder[0]!,
        raw.switchRoleAndAttribute.mock.invocationCallOrder[0]!,
        raw.searchAssignments.mock.invocationCallOrder[0]!,
      ]
      expect(order).toEqual([...order].sort((a, b) => a - b))
    })

    it('forgets the association even when the write fails', async () => {
      const { raw, guarded } = setup('occupation-b')
      noteServerAssociation('occupation-b')
      raw.addToExchange.mockRejectedValue(new Error('conflict'))

      await expect(guarded.addToExchange('conv-1')).rejects.toThrow('conflict')

      expect(getConfirmedServerAssociation()).toBeNull()
    })

    it('treats every classified write the same way', async () => {
      const writes = Object.entries(API_METHOD_SCOPES)
        .filter(([, scope]) => scope === 'write')
        .map(([name]) => name as keyof RawApi)

      for (const name of writes) {
        invalidateServerAssociation()
        const { raw, guarded } = setup('occupation-b')
        noteServerAssociation('occupation-b')

        await (guarded[name] as (...args: unknown[]) => Promise<unknown>)()

        expect(raw[name], name).toHaveBeenCalledTimes(1)
        expect(getConfirmedServerAssociation(), name).toBeNull()
      }
    })
  })

  describe('reads during writes', () => {
    it('waits for an in-flight write and re-asserts the association afterwards', async () => {
      const { raw, guarded } = setup('occupation-b')
      noteServerAssociation('occupation-b')
      const write = deferred<string>()
      raw.updateCompensation.mockReturnValue(write.promise)

      const writing = guarded.updateCompensation('comp-1', { distanceInMetres: 5000 })
      await calledOnce(raw.updateCompensation)
      const reading = guarded.searchAssignments({})
      await flush()
      // The read must not trust the confirmation the write is about to void
      expect(raw.searchAssignments).not.toHaveBeenCalled()
      expect(raw.switchRoleAndAttribute).not.toHaveBeenCalled()

      write.resolve('saved')
      await Promise.all([writing, reading])

      const order = [
        raw.updateCompensation.mock.invocationCallOrder[0]!,
        raw.switchRoleAndAttribute.mock.invocationCallOrder[0]!,
        raw.searchAssignments.mock.invocationCallOrder[0]!,
      ]
      expect(order).toEqual([...order].sort((a, b) => a - b))
      expect(getConfirmedServerAssociation()).toBe('occupation-b')
    })

    it('still lets the read through when the awaited write fails', async () => {
      const { raw, guarded } = setup('occupation-b')
      noteServerAssociation('occupation-b')
      const write = deferred<string>()
      raw.updateCompensation.mockReturnValue(write.promise)

      const writing = guarded.updateCompensation('comp-1', { distanceInMetres: 5000 })
      await calledOnce(raw.updateCompensation)
      const reading = guarded.searchAssignments({})
      write.reject(new Error('conflict'))

      await expect(writing).rejects.toThrow('conflict')
      await expect(reading).resolves.toBe('searchAssignments-result')
      expect(raw.switchRoleAndAttribute).toHaveBeenCalledWith('occupation-b')
    })
  })

  describe('switch', () => {
    it('queues an explicit switch behind a switch a read started', async () => {
      const { raw, guarded } = setup('occupation-a')
      const readSwitch = deferred()
      raw.switchRoleAndAttribute.mockReturnValueOnce(readSwitch.promise)

      const reading = guarded.searchAssignments({})
      await calledOnce(raw.switchRoleAndAttribute)
      const switching = guarded.switchRoleAndAttribute('occupation-b')
      await flush()
      // The explicit switch must not race the one in flight on the server session
      expect(raw.switchRoleAndAttribute).toHaveBeenCalledTimes(1)

      readSwitch.resolve()
      await Promise.all([reading, switching])

      expect(raw.switchRoleAndAttribute.mock.calls.map(([id]) => id)).toEqual([
        'occupation-a',
        'occupation-b',
      ])
      expect(getConfirmedServerAssociation()).toBe('occupation-b')
    })

    it('runs an explicit switch even when the switch ahead of it failed', async () => {
      const { raw, guarded } = setup('occupation-a')
      const readSwitch = deferred()
      raw.switchRoleAndAttribute.mockReturnValueOnce(readSwitch.promise)

      const reading = guarded.searchAssignments({})
      await calledOnce(raw.switchRoleAndAttribute)
      const switching = guarded.switchRoleAndAttribute('occupation-b')
      readSwitch.reject(new Error('500'))

      await expect(reading).rejects.toThrow('500')
      await expect(switching).resolves.toBeUndefined()
      expect(getConfirmedServerAssociation()).toBe('occupation-b')
    })

    it('confirms the switched occupation', async () => {
      const { raw, guarded } = setup('occupation-b')

      await guarded.switchRoleAndAttribute('occupation-a')

      expect(raw.switchRoleAndAttribute).toHaveBeenCalledWith('occupation-a')
      expect(getConfirmedServerAssociation()).toBe('occupation-a')
    })

    it('keeps the association unknown when the switch fails', async () => {
      const { raw, guarded } = setup('occupation-b')
      raw.switchRoleAndAttribute.mockRejectedValue(new Error('500'))

      await expect(guarded.switchRoleAndAttribute('occupation-a')).rejects.toThrow('500')

      expect(getConfirmedServerAssociation()).toBeNull()
    })
  })

  describe('noteServerAssociation', () => {
    it('seeds the confirmed association from an external observation', () => {
      noteServerAssociation('occupation-a')
      expect(getConfirmedServerAssociation()).toBe('occupation-a')

      noteServerAssociation(null)
      expect(getConfirmedServerAssociation()).toBeNull()
    })
  })
})
