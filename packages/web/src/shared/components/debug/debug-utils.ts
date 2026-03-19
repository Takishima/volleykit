/**
 * Shared utilities, types, hooks, and constants for the debug panel.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export const STORAGE_KEY = 'volleykit-auth'
export const EXPECTED_VERSION = 2 // AUTH_STORE_VERSION from auth.ts
const COPY_FEEDBACK_DURATION_MS = 2000

/** Type for persisted occupation data in localStorage */
export interface PersistedOccupation {
  id: string
  type: string
  associationCode?: string
  clubName?: string
}

/** Type for persisted attribute value in localStorage */
export interface PersistedAttributeValue {
  __identity?: string
  roleIdentifier?: string
  type?: string
  inflatedValue?: {
    shortName?: string
    name?: string
  }
}

export interface PersistedState {
  version?: number
  state?: {
    user?: {
      id?: string
      firstName?: string
      lastName?: string
      occupations?: PersistedOccupation[]
    } | null
    csrfToken?: string | null
    _wasAuthenticated?: boolean
    isDemoMode?: boolean
    activeOccupationId?: string | null
    eligibleAttributeValues?: PersistedAttributeValue[] | null
    groupedEligibleAttributeValues?: PersistedAttributeValue[] | null
  }
}

export function getPersistedState(): PersistedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as PersistedState
  } catch {
    return null
  }
}

export function useDebugVisibility(refreshPersistedState: () => void) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const checkVisibility = () => {
      const urlParams = new URLSearchParams(window.location.search)
      // Accept ?debug, ?debug=1, ?debug=true, or legacy ?debug=associations
      const debugValue = urlParams.get('debug')
      const hasDebugParam = debugValue !== null && debugValue !== 'false' && debugValue !== '0'
      const hasGlobalFlag =
        (window as unknown as { __VK_DEBUG?: boolean }).__VK_DEBUG === true ||
        (window as unknown as { __VK_DEBUG_ASSOCIATIONS?: boolean }).__VK_DEBUG_ASSOCIATIONS ===
          true
      if (hasDebugParam || hasGlobalFlag) {
        setIsVisible(true)
        refreshPersistedState()
      }
    }

    checkVisibility()

    const handleToggle = () => {
      setIsVisible((v) => {
        if (!v) refreshPersistedState()
        return !v
      })
    }

    // Handle both the custom event and a direct show event
    const handleShow = () => {
      setIsVisible(true)
      refreshPersistedState()
    }

    window.addEventListener('vk-debug-toggle', handleToggle)
    window.addEventListener('vk-debug-show', handleShow)

    return () => {
      window.removeEventListener('vk-debug-toggle', handleToggle)
      window.removeEventListener('vk-debug-show', handleShow)
    }
  }, [refreshPersistedState])

  return { isVisible, setIsVisible }
}

export function detectDiscrepancies(
  persistedState: PersistedState | null,
  liveState: { status: string; occupationsCount: number; groupedCount: number }
): string[] {
  const discrepancies: string[] = []
  const persistedVersion = persistedState?.version
  const persistedOccupationsCount = persistedState?.state?.user?.occupations?.length ?? 0
  const persistedGroupedCount = persistedState?.state?.groupedEligibleAttributeValues?.length ?? 0
  const persistedWasAuth = persistedState?.state?._wasAuthenticated ?? false

  if (persistedVersion !== undefined && persistedVersion !== EXPECTED_VERSION) {
    discrepancies.push(
      `Version mismatch: persisted=${persistedVersion}, expected=${EXPECTED_VERSION}`
    )
  }
  if (persistedOccupationsCount !== liveState.occupationsCount) {
    discrepancies.push(
      `Occupations: persisted=${persistedOccupationsCount}, live=${liveState.occupationsCount}`
    )
  }
  if (persistedGroupedCount !== liveState.groupedCount) {
    discrepancies.push(
      `Grouped: persisted=${persistedGroupedCount}, live=${liveState.groupedCount}`
    )
  }
  if (persistedWasAuth !== (liveState.status === 'authenticated')) {
    discrepancies.push(
      `Auth: persisted=${persistedWasAuth}, live=${liveState.status === 'authenticated'}`
    )
  }
  return discrepancies
}

/** Safely copy text to clipboard with fallback for mobile/iframe contexts */
export function copyToClipboard(text: string): Promise<boolean> {
  // Try modern clipboard API first
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false)
  }

  // Fallback: create temporary textarea
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return Promise.resolve(success)
  } catch {
    return Promise.resolve(false)
  }
}

/** Custom hook for copy with visual feedback */
export function useCopyWithFeedback() {
  const [copied, setCopied] = useState<string | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleCopy = useCallback(async (value: string, label: string) => {
    const success = await copyToClipboard(value)
    if (success) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setCopied(label)
      timeoutRef.current = setTimeout(() => setCopied(null), COPY_FEEDBACK_DURATION_MS)
    }
  }, [])

  return { copied, handleCopy }
}
