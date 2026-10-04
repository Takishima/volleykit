import { describe, it, expect, vi } from 'vitest'

import { reassertActiveAssociation } from './active-association'

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn() }))

vi.mock('@/common/utils/logger', () => ({
  createLogger: () => ({ warn: mockWarn }),
}))

describe('reassertActiveAssociation', () => {
  it('switches the server session to the selected occupation in API mode', async () => {
    const apiClient = { switchRoleAndAttribute: vi.fn().mockResolvedValue(undefined) }

    await reassertActiveAssociation(apiClient, 'api', 'occupation-1')

    expect(apiClient.switchRoleAndAttribute).toHaveBeenCalledWith('occupation-1')
  })

  it('does nothing in demo mode so demo data is not regenerated', async () => {
    const apiClient = { switchRoleAndAttribute: vi.fn() }

    await reassertActiveAssociation(apiClient, 'demo', 'demo-referee-sv')

    expect(apiClient.switchRoleAndAttribute).not.toHaveBeenCalled()
  })

  it('does nothing in calendar mode', async () => {
    const apiClient = { switchRoleAndAttribute: vi.fn() }

    await reassertActiveAssociation(apiClient, 'calendar', 'occupation-1')

    expect(apiClient.switchRoleAndAttribute).not.toHaveBeenCalled()
  })

  it('does nothing without a selected occupation', async () => {
    const apiClient = { switchRoleAndAttribute: vi.fn() }

    await reassertActiveAssociation(apiClient, 'api', null)

    expect(apiClient.switchRoleAndAttribute).not.toHaveBeenCalled()
  })

  it('logs and swallows a failed switch so the preceding write still counts', async () => {
    const error = new Error('network down')
    const apiClient = { switchRoleAndAttribute: vi.fn().mockRejectedValue(error) }

    await expect(
      reassertActiveAssociation(apiClient, 'api', 'occupation-1')
    ).resolves.toBeUndefined()

    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('re-assert'), error)
  })
})
