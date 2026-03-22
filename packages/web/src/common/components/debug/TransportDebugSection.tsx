/* eslint-disable @typescript-eslint/no-magic-numbers -- Debug panel uses inline styles with pixel values */
import { useActiveAssociationCode } from '@/common/hooks/useActiveAssociation'
import { isOjpConfigured } from '@/common/services/transport'
import { useAuthStore } from '@/common/stores/auth'
import { useSettingsStore } from '@/common/stores/settings'

/**
 * Debug section for transport toggle conditions.
 * Shows home location, API configuration, and association status.
 */
export function TransportDebugSection() {
  const homeLocation = useSettingsStore((state) => state.homeLocation)
  const associationCode = useActiveAssociationCode()
  const dataSource = useAuthStore((state) => state.dataSource)
  const isDemoMode = dataSource === 'demo'
  const isCalendarMode = dataSource === 'calendar'
  const ojpConfigured = isOjpConfigured()
  const apiKeyPresent = Boolean(import.meta.env.VITE_OJP_API_KEY)

  // Compute the same conditions as TransportSection
  const hasHomeLocation = Boolean(homeLocation)
  const hasAssociation = Boolean(associationCode)
  const isAvailable = isDemoMode || isCalendarMode || ojpConfigured
  const canEnable = hasHomeLocation && isAvailable && hasAssociation

  return (
    <div style={{ fontSize: '10px' }}>
      <div
        style={{
          marginBottom: '8px',
          padding: '8px',
          backgroundColor: '#111122',
          borderRadius: '4px',
          border: '1px solid #333',
        }}
      >
        <div style={{ color: '#00d4ff', fontWeight: 'bold', marginBottom: '8px' }}>
          Toggle Conditions
        </div>
        <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ display: 'none' }}>
              <th>Condition</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '4px', color: '#888' }}>Home Location</td>
              <td style={{ padding: '4px', color: hasHomeLocation ? '#4eff4e' : '#ff6b6b' }}>
                {hasHomeLocation ? '✓ Set' : '✗ Not set'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '4px', color: '#888' }}>Association Code</td>
              <td style={{ padding: '4px', color: hasAssociation ? '#4eff4e' : '#ff6b6b' }}>
                {associationCode ?? '✗ None'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '4px', color: '#888' }}>API Available</td>
              <td style={{ padding: '4px', color: isAvailable ? '#4eff4e' : '#ff6b6b' }}>
                {isAvailable ? '✓ Yes' : '✗ No'}
              </td>
            </tr>
            <tr style={{ borderTop: '2px solid #333' }}>
              <td style={{ padding: '4px', color: '#888', fontWeight: 'bold' }}>
                Can Enable Toggle
              </td>
              <td
                style={{
                  padding: '4px',
                  color: canEnable ? '#4eff4e' : '#ff6b6b',
                  fontWeight: 'bold',
                }}
              >
                {canEnable ? '✓ Yes' : '✗ No'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginBottom: '8px',
          padding: '8px',
          backgroundColor: '#111122',
          borderRadius: '4px',
          border: '1px solid #333',
        }}
      >
        <div style={{ color: '#00d4ff', fontWeight: 'bold', marginBottom: '8px' }}>API Details</div>
        <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ display: 'none' }}>
              <th>Setting</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '4px', color: '#888' }}>VITE_OJP_API_KEY</td>
              <td style={{ padding: '4px', color: apiKeyPresent ? '#4eff4e' : '#ff6b6b' }}>
                {apiKeyPresent ? '✓ Present' : '✗ Missing'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '4px', color: '#888' }}>isOjpConfigured()</td>
              <td style={{ padding: '4px', color: ojpConfigured ? '#4eff4e' : '#ff6b6b' }}>
                {ojpConfigured ? '✓ true' : '✗ false'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '4px', color: '#888' }}>Demo Mode</td>
              <td style={{ padding: '4px', color: isDemoMode ? '#ffaa00' : '#888' }}>
                {isDemoMode ? 'Yes (bypasses API check)' : 'No'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #222' }}>
              <td style={{ padding: '4px', color: '#888' }}>Calendar Mode</td>
              <td style={{ padding: '4px', color: isCalendarMode ? '#ffaa00' : '#888' }}>
                {isCalendarMode ? 'Yes (bypasses API check)' : 'No'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {homeLocation && (
        <div
          style={{
            padding: '8px',
            backgroundColor: '#111122',
            borderRadius: '4px',
            border: '1px solid #333',
          }}
        >
          <div style={{ color: '#00d4ff', fontWeight: 'bold', marginBottom: '8px' }}>
            Home Location Details
          </div>
          <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ display: 'none' }}>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '4px', color: '#888' }}>Latitude</td>
                <td style={{ padding: '4px', color: '#e0e0e0' }}>
                  {homeLocation.latitude.toFixed(6)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '4px', color: '#888' }}>Longitude</td>
                <td style={{ padding: '4px', color: '#e0e0e0' }}>
                  {homeLocation.longitude.toFixed(6)}
                </td>
              </tr>
              {homeLocation.label && (
                <tr style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '4px', color: '#888' }}>Label</td>
                  <td style={{ padding: '4px', color: '#e0e0e0' }}>{homeLocation.label}</td>
                </tr>
              )}
              <tr style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '4px', color: '#888' }}>Source</td>
                <td style={{ padding: '4px', color: '#e0e0e0' }}>{homeLocation.source}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
