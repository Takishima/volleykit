/**
 * Debug panel for diagnosing production issues.
 * Shows user identity, transport toggle conditions, state comparison, and localStorage data.
 *
 * Usage:
 * - URL parameter: Add ?debug to URL (or ?debug=1)
 * - Console: window.dispatchEvent(new Event('vk-debug-show'))
 * - Toggle: window.dispatchEvent(new Event('vk-debug-toggle'))
 *
 * NOTE: This component uses inline styles intentionally to:
 * 1. Keep debug UI visually distinct from the app
 * 2. Avoid polluting Tailwind CSS with debug-only classes
 * 3. Ensure styles work regardless of app theme/CSS state
 */

import { useState, useCallback } from 'react'

import { useShallow } from 'zustand/react/shallow'

import { useAuthStore } from '@/shared/stores/auth'

import { AuthLogsSection } from './AuthLogsSection'
import { ComparisonTable, DiscrepanciesAlert } from './ComparisonSection'
import {
  getPersistedState,
  useDebugVisibility,
  detectDiscrepancies,
  type PersistedState,
} from './debug-utils'
import { DebugHeader } from './DebugHeader'
import { OccupationsTable } from './OccupationsSection'
import { RawStorageSection } from './RawStorageSection'
import { Section } from './Section'
import { TransportDebugSection } from './TransportDebugSection'
import { UserIdentitySection } from './UserIdentitySection'

export function DebugPanel() {
  const [persistedState, setPersistedState] = useState<PersistedState | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['identity', 'status'])
  )

  const {
    status,
    user,
    activeOccupationId,
    csrfToken,
    dataSource,
    eligibleAttributeValues,
    groupedEligibleAttributeValues,
  } = useAuthStore(
    useShallow((state) => ({
      status: state.status,
      user: state.user,
      activeOccupationId: state.activeOccupationId,
      csrfToken: state.csrfToken,
      dataSource: state.dataSource,
      eligibleAttributeValues: state.eligibleAttributeValues,
      groupedEligibleAttributeValues: state.groupedEligibleAttributeValues,
    }))
  )
  const isDemoMode = dataSource === 'demo'

  const refreshPersistedState = useCallback(() => {
    setPersistedState(getPersistedState())
  }, [])

  const { isVisible, setIsVisible } = useDebugVisibility(refreshPersistedState)

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (!isVisible) {
    return null
  }

  const occupationsCount = user?.occupations?.length ?? 0
  const groupedCount = groupedEligibleAttributeValues?.length ?? 0

  // Persisted state analysis
  const persistedVersion = persistedState?.version
  const persistedOccupationsCount = persistedState?.state?.user?.occupations?.length ?? 0
  const persistedGroupedCount = persistedState?.state?.groupedEligibleAttributeValues?.length ?? 0
  const persistedEligibleCount = persistedState?.state?.eligibleAttributeValues?.length ?? 0
  const persistedWasAuth = persistedState?.state?._wasAuthenticated ?? false

  const discrepancies = detectDiscrepancies(persistedState, {
    status,
    occupationsCount,
    groupedCount,
  })

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '70px',
        left: '4px',
        right: '4px',
        maxHeight: '70vh',
        overflow: 'auto',
        backgroundColor: '#0d0d1a',
        color: '#e0e0e0',
        padding: '8px',
        borderRadius: '8px',
        fontSize: '10px',
        fontFamily: 'ui-monospace, monospace',
        zIndex: 9999,
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
        border: '1px solid #333',
      }}
    >
      <DebugHeader onRefresh={refreshPersistedState} onClose={() => setIsVisible(false)} />

      {/* User Identity - Most important for debugging */}
      <Section
        id="identity"
        title="User Identity"
        expanded={expandedSections.has('identity')}
        onToggle={() => toggleSection('identity')}
      >
        <UserIdentitySection
          user={user}
          activeOccupationId={activeOccupationId}
          isDemoMode={isDemoMode}
        />
      </Section>

      {/* Transport Toggle Debug */}
      <Section
        id="transport"
        title="Transport Toggle"
        expanded={expandedSections.has('transport')}
        onToggle={() => toggleSection('transport')}
      >
        <TransportDebugSection />
      </Section>

      <DiscrepanciesAlert discrepancies={discrepancies} />

      <Section
        id="comparison"
        title="Live State vs Persisted"
        expanded={expandedSections.has('comparison')}
        onToggle={() => toggleSection('comparison')}
      >
        <ComparisonTable
          status={status}
          isDemoMode={isDemoMode}
          user={user}
          occupationsCount={occupationsCount}
          groupedCount={groupedCount}
          eligibleCount={eligibleAttributeValues?.length ?? 0}
          activeOccupationId={activeOccupationId}
          csrfToken={csrfToken}
          persistedVersion={persistedVersion}
          persistedWasAuth={persistedWasAuth}
          persistedState={persistedState}
          persistedOccupationsCount={persistedOccupationsCount}
          persistedGroupedCount={persistedGroupedCount}
          persistedEligibleCount={persistedEligibleCount}
        />
      </Section>

      <Section
        id="occupations"
        title={`Occupations (${occupationsCount})`}
        expanded={expandedSections.has('occupations')}
        onToggle={() => toggleSection('occupations')}
      >
        <OccupationsTable occupations={user?.occupations} />
      </Section>

      <Section
        id="raw"
        title="Raw localStorage"
        expanded={expandedSections.has('raw')}
        onToggle={() => toggleSection('raw')}
      >
        <RawStorageSection persistedState={persistedState} />
      </Section>

      <Section
        id="auth-logs"
        title="Auth Logs"
        expanded={expandedSections.has('auth-logs')}
        onToggle={() => toggleSection('auth-logs')}
      >
        <AuthLogsSection />
      </Section>
    </div>
  )
}
