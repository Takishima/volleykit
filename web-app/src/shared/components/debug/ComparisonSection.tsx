/* eslint-disable @typescript-eslint/no-magic-numbers -- Debug panel uses inline styles with pixel values */
import { EXPECTED_VERSION, type PersistedState } from './debug-utils'

export function DiscrepanciesAlert({ discrepancies }: { discrepancies: string[] }) {
  if (discrepancies.length === 0) return null

  return (
    <div
      style={{
        marginBottom: '6px',
        padding: '6px',
        backgroundColor: '#3d2a00',
        borderRadius: '4px',
        border: '1px solid #6b4500',
      }}
      role="alert"
    >
      <div style={{ color: '#ffaa00', fontWeight: 'bold', marginBottom: '4px' }}>
        ⚠️ State Discrepancies Detected
      </div>
      {discrepancies.map((discrepancy) => (
        <div key={discrepancy} style={{ color: '#ffcc66', fontSize: '9px' }}>
          • {discrepancy}
        </div>
      ))}
    </div>
  )
}

export function ComparisonTable({
  status,
  isDemoMode,
  user,
  occupationsCount,
  groupedCount,
  eligibleCount,
  activeOccupationId,
  csrfToken,
  persistedVersion,
  persistedWasAuth,
  persistedState,
  persistedOccupationsCount,
  persistedGroupedCount,
  persistedEligibleCount,
}: {
  status: string
  isDemoMode: boolean
  user: unknown
  occupationsCount: number
  groupedCount: number
  eligibleCount: number
  activeOccupationId: string | null
  csrfToken: string | null
  persistedVersion: number | undefined
  persistedWasAuth: boolean
  persistedState: PersistedState | null
  persistedOccupationsCount: number
  persistedGroupedCount: number
  persistedEligibleCount: number
}) {
  return (
    <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: '#666', textAlign: 'left' }}>
          <th style={{ padding: '2px 4px' }}>Field</th>
          <th style={{ padding: '2px 4px' }}>Live</th>
          <th style={{ padding: '2px 4px' }}>Persisted</th>
          <th style={{ padding: '2px 4px' }}>Match</th>
        </tr>
      </thead>
      <tbody>
        <CompareRow
          label="version"
          live={String(EXPECTED_VERSION)}
          persisted={String(persistedVersion ?? '?')}
        />
        <CompareRow
          label="status"
          live={status}
          persisted={persistedWasAuth ? 'authenticated' : 'idle'}
        />
        <CompareRow
          label="isDemoMode"
          live={String(isDemoMode)}
          persisted={String(persistedState?.state?.isDemoMode ?? '?')}
        />
        <CompareRow
          label="user exists"
          live={String(!!user)}
          persisted={String(!!persistedState?.state?.user)}
        />
        <CompareRow
          label="occupations.length"
          live={String(occupationsCount)}
          persisted={String(persistedOccupationsCount)}
        />
        <CompareRow
          label="grouped.length"
          live={String(groupedCount)}
          persisted={String(persistedGroupedCount)}
        />
        <CompareRow
          label="eligible.length"
          live={String(eligibleCount)}
          persisted={String(persistedEligibleCount)}
        />
        <CompareRow
          label="activeOccupationId"
          live={activeOccupationId?.substring(0, 12) ?? 'null'}
          persisted={persistedState?.state?.activeOccupationId?.substring(0, 12) ?? 'null'}
        />
        <CompareRow
          label="csrfToken"
          live={csrfToken ? 'set' : 'null'}
          persisted={persistedState?.state?.csrfToken ? 'set' : 'null'}
        />
      </tbody>
    </table>
  )
}

function CompareRow({
  label,
  live,
  persisted,
}: {
  label: string
  live: string
  persisted: string
}) {
  const match = live === persisted
  return (
    <tr style={{ borderBottom: '1px solid #1a1a2e' }}>
      <td style={{ padding: '2px 4px', color: '#888' }}>{label}</td>
      <td style={{ padding: '2px 4px', color: '#00d4ff' }}>{live}</td>
      <td style={{ padding: '2px 4px', color: '#ffaa00' }}>{persisted}</td>
      <td style={{ padding: '2px 4px', color: match ? '#4eff4e' : '#ff6b6b' }}>
        {match ? '✓' : '✗'}
      </td>
    </tr>
  )
}
