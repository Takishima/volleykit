/* eslint-disable @typescript-eslint/no-magic-numbers -- Debug panel uses inline styles with pixel values */
import type { Occupation } from '@/common/stores/auth'

export function OccupationsTable({ occupations }: { occupations: Occupation[] | undefined }) {
  if (!occupations || occupations.length === 0) {
    return (
      <div style={{ color: '#ff6b6b', padding: '4px' }}>
        ⚠️ EMPTY - This prevents dropdown from showing!
      </div>
    )
  }

  return (
    <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: '#666', textAlign: 'left' }}>
          <th>#</th>
          <th>id</th>
          <th>type</th>
          <th>assocCode</th>
          <th>clubName</th>
        </tr>
      </thead>
      <tbody>
        {occupations.map((occ, index) => (
          <tr key={occ.id} style={{ borderBottom: '1px solid #222' }}>
            <td style={{ padding: '2px' }}>{index}</td>
            <td style={{ padding: '2px', color: '#888' }}>{occ.id.substring(0, 10)}...</td>
            <td style={{ padding: '2px', color: occ.type === 'referee' ? '#4eff4e' : '#888' }}>
              {occ.type}
            </td>
            <td style={{ padding: '2px', color: '#00d4ff' }}>{occ.associationCode ?? '(none)'}</td>
            <td style={{ padding: '2px', color: '#888' }}>{occ.clubName ?? '(none)'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
