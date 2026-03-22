/**
 * Tests for the offline action sync service.
 *
 * Tests the sync orchestration logic: processing pending actions,
 * handling errors, detecting session expiry, and stopping on auth failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { OfflineAction } from './action-types'

// Track calls to action-store functions
const mockActions: OfflineAction[] = []
const deletedIds: string[] = []
const failedActions: { id: string; error: string }[] = []
const syncingIds: string[] = []

vi.mock('./action-store', () => ({
  getPendingActions: vi.fn(async () => [...mockActions]),
  markActionSyncing: vi.fn(async (id: string) => {
    syncingIds.push(id)
    return true
  }),
  markActionFailed: vi.fn(async (id: string, error: string) => {
    failedActions.push({ id, error })
    return true
  }),
  deleteAction: vi.fn(async (id: string) => {
    deletedIds.push(id)
    return true
  }),
}))

// Mock API client
const mockApiClient = {
  updateCompensation: vi.fn(),
  applyForExchange: vi.fn(),
  addToExchange: vi.fn(),
  removeOwnExchange: vi.fn(),
}

vi.mock('@/api/client', () => ({
  getApiClient: vi.fn(() => mockApiClient),
}))

vi.mock('@/api/queryKeys', () => ({
  queryKeys: {
    compensations: { lists: () => ['compensations'] },
    assignments: { lists: () => ['assignments'] },
    exchanges: { lists: () => ['exchanges'] },
  },
}))

const { syncPendingActions } = await import('./action-sync')

function createTestAction(overrides: Partial<OfflineAction> = {}): OfflineAction {
  return {
    id: `action_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'updateCompensation',
    payload: { compensationId: 'comp-1', data: { distanceInMetres: 50 } },
    createdAt: Date.now(),
    status: 'pending',
    retryCount: 0,
    ...overrides,
  } as OfflineAction
}

describe('syncPendingActions', () => {
  beforeEach(() => {
    mockActions.length = 0
    deletedIds.length = 0
    failedActions.length = 0
    syncingIds.length = 0
    vi.clearAllMocks()
  })

  it('returns empty result when no pending actions', async () => {
    const result = await syncPendingActions()

    expect(result).toEqual({
      processed: 0,
      succeeded: 0,
      failed: 0,
      requiresReauth: false,
      results: [],
    })
  })

  it('syncs a pending updateCompensation action successfully', async () => {
    const action = createTestAction()
    mockActions.push(action)

    const result = await syncPendingActions()

    expect(result.processed).toBe(1)
    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(0)
    expect(deletedIds).toContain(action.id)
    expect(mockApiClient.updateCompensation).toHaveBeenCalledWith('comp-1', {
      distanceInMetres: 50,
    })
  })

  it('syncs applyForExchange action', async () => {
    const action = createTestAction({
      type: 'applyForExchange',
      payload: { exchangeId: 'ex-1' },
    } as Partial<OfflineAction>)
    mockActions.push(action)

    await syncPendingActions()

    expect(mockApiClient.applyForExchange).toHaveBeenCalledWith('ex-1')
  })

  it('syncs addToExchange action', async () => {
    const action = createTestAction({
      type: 'addToExchange',
      payload: { convocationId: 'conv-1' },
    } as Partial<OfflineAction>)
    mockActions.push(action)

    await syncPendingActions()

    expect(mockApiClient.addToExchange).toHaveBeenCalledWith('conv-1')
  })

  it('syncs removeOwnExchange action', async () => {
    const action = createTestAction({
      type: 'removeOwnExchange',
      payload: { convocationId: 'conv-2' },
    } as Partial<OfflineAction>)
    mockActions.push(action)

    await syncPendingActions()

    expect(mockApiClient.removeOwnExchange).toHaveBeenCalledWith('conv-2')
  })

  it('marks action as failed on API error', async () => {
    const action = createTestAction()
    mockActions.push(action)
    mockApiClient.updateCompensation.mockRejectedValueOnce(new Error('Network timeout'))

    const result = await syncPendingActions()

    expect(result.processed).toBe(1)
    expect(result.succeeded).toBe(0)
    expect(result.failed).toBe(1)
    expect(failedActions.some((f) => f.id === action.id)).toBe(true)
  })

  it('detects session expiry and sets requiresReauth', async () => {
    const action = createTestAction()
    mockActions.push(action)
    mockApiClient.updateCompensation.mockRejectedValueOnce(new Error('401 Unauthorized'))

    const result = await syncPendingActions()

    expect(result.requiresReauth).toBe(true)
    expect(result.failed).toBe(1)
  })

  it('stops processing remaining actions after session expiry', async () => {
    const action1 = createTestAction({ createdAt: 1000 })
    const action2 = createTestAction({ createdAt: 2000 })
    mockActions.push(action1, action2)
    mockApiClient.updateCompensation.mockRejectedValueOnce(new Error('Unauthorized'))

    const result = await syncPendingActions()

    // Only first action should be processed
    expect(result.processed).toBe(1)
    expect(result.requiresReauth).toBe(true)
    expect(syncingIds).toHaveLength(1)
  })

  it('detects conflict errors and marks action as failed', async () => {
    const action = createTestAction()
    mockActions.push(action)
    mockApiClient.updateCompensation.mockRejectedValueOnce(new Error('404 Not Found'))

    const result = await syncPendingActions()

    expect(result.failed).toBe(1)
    expect(result.requiresReauth).toBe(false)
    expect(failedActions.some((f) => f.id === action.id && f.error.includes('Conflict'))).toBe(true)
  })

  it('processes actions in createdAt order', async () => {
    const laterAction = createTestAction({ id: 'later', createdAt: 3000 })
    const earlierAction = createTestAction({ id: 'earlier', createdAt: 1000 })
    mockActions.push(laterAction, earlierAction)

    await syncPendingActions()

    // Earlier action should be processed first
    expect(syncingIds[0]).toBe('earlier')
    expect(syncingIds[1]).toBe('later')
  })

  it('processes multiple actions and reports aggregate results', async () => {
    const action1 = createTestAction({ createdAt: 1000 })
    const action2 = createTestAction({ createdAt: 2000 })
    const action3 = createTestAction({ createdAt: 3000 })
    mockActions.push(action1, action2, action3)

    // Second action fails
    mockApiClient.updateCompensation
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce(undefined)

    const result = await syncPendingActions()

    expect(result.processed).toBe(3)
    expect(result.succeeded).toBe(2)
    expect(result.failed).toBe(1)
  })

  it('invalidates queries after successful syncs when queryClient provided', async () => {
    const action = createTestAction()
    mockActions.push(action)

    const mockQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    }

    await syncPendingActions(mockQueryClient as unknown as Parameters<typeof syncPendingActions>[0])

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledTimes(3)
  })

  it('does not invalidate queries when all actions fail', async () => {
    const action = createTestAction()
    mockActions.push(action)
    mockApiClient.updateCompensation.mockRejectedValueOnce(new Error('fail'))

    const mockQueryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    }

    await syncPendingActions(mockQueryClient as unknown as Parameters<typeof syncPendingActions>[0])

    expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled()
  })
})
