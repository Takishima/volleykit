/**
 * Tests for the session check's association drift repair.
 *
 * VolleyManager keeps the active association in the server session. When a
 * write resets it, a reload must push the persisted selection back to the
 * server instead of silently keeping the UI and the data out of sync.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { AuthState } from '@/common/stores/auth'

const mockSwitchRoleAndAttribute = vi.fn()

vi.mock('@/api/client', () => ({
  api: {
    switchRoleAndAttribute: (...args: unknown[]) => mockSwitchRoleAndAttribute(...args),
  },
  captureSessionToken: vi.fn(),
  CAPTURE_SESSION_TOKEN_HEADER: 'X-Capture-Session-Token',
  clearSession: vi.fn(),
  getSessionHeaders: () => ({}),
  getSessionToken: () => 'session-token',
  setCsrfToken: vi.fn(),
}))

vi.mock('@/api/constants', () => ({
  getApiBaseUrl: () => 'https://proxy.test',
}))

vi.mock('@/common/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const { performApiSessionCheck } = await import('./api-auth-flow')

const OCCUPATION_SV = 'occupation-sv'
const OCCUPATION_SVRZ = 'occupation-svrz'

function refereeAttribute(id: string, shortName: string) {
  return {
    __identity: id,
    attributeIdentifier: 'Indoorvolleyball.RefAdmin:AbstractAssociation',
    roleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
    inflatedValue: { __identity: `assoc-${shortName}`, name: shortName, shortName },
  }
}

/** Dashboard HTML as served by VolleyManager, with the active party embedded as JSON */
function dashboardHtml(serverActiveOccupationId: string | null): string {
  const activeParty: Record<string, unknown> = {
    __identity: 'person-1',
    firstName: 'Test',
    lastName: 'Referee',
    groupedEligibleAttributeValues: [
      refereeAttribute(OCCUPATION_SV, 'SV'),
      refereeAttribute(OCCUPATION_SVRZ, 'SVRZ'),
    ],
    activeRoleIdentifier: 'Indoorvolleyball.RefAdmin:Referee',
  }
  if (serverActiveOccupationId) {
    activeParty.activeAttributeValue = refereeAttribute(serverActiveOccupationId, 'X')
  }
  const encoded = JSON.stringify(activeParty).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  return `<html data-csrf-token="csrf-1"><head><script>
    window.activeParty = JSON.parse('${encoded}');
  </script></head><body>Dashboard</body></html>`
}

function stubDashboard(html: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(html, { status: 200, headers: { 'Content-Type': 'text/html' } }))
  )
}

function createStore(persistedActiveOccupationId: string | null) {
  const state = {
    user: null,
    activeOccupationId: persistedActiveOccupationId,
    csrfToken: null,
    eligibleAttributeValues: null,
    groupedEligibleAttributeValues: null,
    eligibleRoles: null,
  } as unknown as AuthState
  const set = vi.fn()
  return { get: () => state, set }
}

describe('performApiSessionCheck association drift repair', () => {
  beforeEach(() => {
    mockSwitchRoleAndAttribute.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('re-asserts the persisted association when the server session drifted', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SV))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    const valid = await performApiSessionCheck(get, set)

    expect(valid).toBe(true)
    expect(mockSwitchRoleAndAttribute).toHaveBeenCalledTimes(1)
    expect(mockSwitchRoleAndAttribute).toHaveBeenCalledWith(OCCUPATION_SVRZ)
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'authenticated', activeOccupationId: OCCUPATION_SVRZ })
    )
  })

  it('repairs the server before the store reports the session as authenticated', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SV))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    await performApiSessionCheck(get, set)

    const switchOrder = mockSwitchRoleAndAttribute.mock.invocationCallOrder[0]
    const setOrder = set.mock.invocationCallOrder[0]
    expect(switchOrder).toBeLessThan(setOrder!)
  })

  it('leaves the server alone when it already has the persisted association active', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SVRZ))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    const valid = await performApiSessionCheck(get, set)

    expect(valid).toBe(true)
    expect(mockSwitchRoleAndAttribute).not.toHaveBeenCalled()
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ activeOccupationId: OCCUPATION_SVRZ })
    )
  })

  it('re-asserts when the dashboard does not expose the active attribute', async () => {
    stubDashboard(dashboardHtml(null))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    await performApiSessionCheck(get, set)

    expect(mockSwitchRoleAndAttribute).toHaveBeenCalledWith(OCCUPATION_SVRZ)
  })

  it('falls back to the first occupation when the persisted one is no longer eligible', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SVRZ))
    const { get, set } = createStore('occupation-gone')

    await performApiSessionCheck(get, set)

    expect(mockSwitchRoleAndAttribute).toHaveBeenCalledWith(OCCUPATION_SV)
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ activeOccupationId: OCCUPATION_SV }))
  })

  it('keeps the session valid when the re-assert request fails', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SV))
    mockSwitchRoleAndAttribute.mockRejectedValue(new Error('500'))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    const valid = await performApiSessionCheck(get, set)

    expect(valid).toBe(true)
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: 'authenticated' }))
  })
})
