/**
 * Tests for how the session check feeds the association guard.
 *
 * VolleyManager keeps the active association in the server session. The
 * dashboard exposes it as `activeAttributeValue`; the session check records it
 * so the guard can switch the server back to the persisted selection before
 * the first scoped request, instead of a reload silently keeping the UI and the
 * data on different associations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { getConfirmedServerAssociation, invalidateServerAssociation } from '@/api/association-guard'
import type { AuthState } from '@/common/stores/auth'

const mockSwitchRoleAndAttribute = vi.fn()

vi.mock('@/api/client', async () => {
  // The guard itself stays real so the tests can observe what the check recorded
  const guard =
    await vi.importActual<typeof import('@/api/association-guard')>('@/api/association-guard')
  return {
    api: {
      switchRoleAndAttribute: (...args: unknown[]) => mockSwitchRoleAndAttribute(...args),
    },
    noteServerAssociation: guard.noteServerAssociation,
    captureSessionToken: vi.fn(),
    CAPTURE_SESSION_TOKEN_HEADER: 'X-Capture-Session-Token',
    clearSession: vi.fn(),
    getSessionHeaders: () => ({}),
    getSessionToken: () => 'session-token',
    setCsrfToken: vi.fn(),
  }
})

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

describe('performApiSessionCheck and the association guard', () => {
  beforeEach(() => {
    mockSwitchRoleAndAttribute.mockReset().mockResolvedValue(undefined)
    invalidateServerAssociation()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records the association the server session really has active', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SV))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    const valid = await performApiSessionCheck(get, set)

    expect(valid).toBe(true)
    expect(getConfirmedServerAssociation()).toBe(OCCUPATION_SV)
  })

  it('keeps the persisted selection in the store even when the server drifted', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SV))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    await performApiSessionCheck(get, set)

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'authenticated', activeOccupationId: OCCUPATION_SVRZ })
    )
  })

  it('leaves the repair to the guard instead of switching during the check', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SV))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    await performApiSessionCheck(get, set)

    expect(mockSwitchRoleAndAttribute).not.toHaveBeenCalled()
  })

  it('records an unknown server association when the dashboard does not expose it', async () => {
    stubDashboard(dashboardHtml(null))
    const { get, set } = createStore(OCCUPATION_SVRZ)

    await performApiSessionCheck(get, set)

    expect(getConfirmedServerAssociation()).toBeNull()
  })

  it('falls back to the first occupation when the persisted one is no longer eligible', async () => {
    stubDashboard(dashboardHtml(OCCUPATION_SVRZ))
    const { get, set } = createStore('occupation-gone')

    await performApiSessionCheck(get, set)

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ activeOccupationId: OCCUPATION_SV }))
    expect(getConfirmedServerAssociation()).toBe(OCCUPATION_SVRZ)
  })
})
