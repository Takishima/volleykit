import type { Occupation } from '@/shared/stores/auth'

import { useCopyWithFeedback } from './debug-utils'

interface UserIdentitySectionProps {
  user: { id: string; firstName: string; lastName: string; occupations: Occupation[] } | null
  activeOccupationId: string | null
  isDemoMode: boolean
}

export function UserIdentitySection({
  user,
  activeOccupationId,
  isDemoMode,
}: UserIdentitySectionProps) {
  const { copied, handleCopy } = useCopyWithFeedback()
  const userId = user?.id
  const activeOccupation = user?.occupations?.find((o) => o.id === activeOccupationId)

  return (
    <div style={{ fontSize: '10px' }}>
      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div
          style={{
            marginBottom: '8px',
            padding: '4px 8px',
            backgroundColor: '#3d2a00',
            borderRadius: '4px',
            border: '1px solid #6b4500',
            color: '#ffaa00',
          }}
        >
          Demo Mode Active - UUIDs are simulated
        </div>
      )}

      {/* User UUID - Primary identifier */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>User UUID (user.id):</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code
            style={{
              backgroundColor: '#1a1a2e',
              padding: '6px 10px',
              borderRadius: '4px',
              color: userId ? '#4eff4e' : '#ff6b6b',
              fontSize: '11px',
              fontFamily: 'ui-monospace, monospace',
              wordBreak: 'break-all',
              flex: 1,
            }}
          >
            {userId ?? '(not set)'}
          </code>
          {userId && (
            <button
              onClick={() => handleCopy(userId, 'userId')}
              style={{
                padding: '4px 8px',
                fontSize: '9px',
                backgroundColor: copied === 'userId' ? '#0a2e0a' : '#1a1a2e',
                border: `1px solid ${copied === 'userId' ? '#1a5e1a' : '#444'}`,
                color: copied === 'userId' ? '#4eff4e' : '#888',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {copied === 'userId' ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
        <div style={{ color: '#666', fontSize: '8px', marginTop: '4px' }}>
          This should match submittedByPerson.__identity in exchanges you created
        </div>
      </div>

      {/* Active Occupation */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ color: '#888', marginBottom: '2px' }}>Active Occupation ID:</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code
            style={{
              backgroundColor: '#1a1a2e',
              padding: '6px 10px',
              borderRadius: '4px',
              color: activeOccupationId ? '#00d4ff' : '#ff6b6b',
              fontSize: '11px',
              fontFamily: 'ui-monospace, monospace',
              wordBreak: 'break-all',
              flex: 1,
            }}
          >
            {activeOccupationId ?? '(not set)'}
          </code>
          {activeOccupationId && (
            <button
              onClick={() => handleCopy(activeOccupationId, 'occupationId')}
              style={{
                padding: '4px 8px',
                fontSize: '9px',
                backgroundColor: copied === 'occupationId' ? '#0a2e0a' : '#1a1a2e',
                border: `1px solid ${copied === 'occupationId' ? '#1a5e1a' : '#444'}`,
                color: copied === 'occupationId' ? '#4eff4e' : '#888',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {copied === 'occupationId' ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
        {activeOccupation && (
          <div style={{ color: '#666', fontSize: '8px', marginTop: '4px' }}>
            {activeOccupation.type} @{' '}
            {activeOccupation.associationCode ?? activeOccupation.clubName ?? 'unknown'}
          </div>
        )}
      </div>

      {/* User Name */}
      {user && (user.firstName || user.lastName) && (
        <div>
          <div style={{ color: '#888', marginBottom: '2px' }}>User Name:</div>
          <div style={{ color: '#e0e0e0' }}>
            {user.firstName} {user.lastName}
          </div>
        </div>
      )}
    </div>
  )
}
