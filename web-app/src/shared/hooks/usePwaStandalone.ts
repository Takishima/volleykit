import { useState, useEffect } from 'react'

/**
 * Check if running as installed PWA (standalone mode).
 * Extracted for reuse across components.
 */
function checkStandalone(): boolean {
  // iOS Safari specific: navigator.standalone property
  // Must check this FIRST as it's the only reliable method for iOS Safari PWA
  if ('standalone' in window.navigator) {
    const nav = window.navigator as Navigator & { standalone: boolean }
    if (nav.standalone === true) {
      return true
    }
  }

  // Standard way: CSS display-mode media query (works for Chrome/Android PWAs)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true
  }

  // Fallback: Check if running in minimal-ui mode (some PWAs use this)
  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return true
  }

  return false
}

/**
 * Hook to detect if running as installed PWA (standalone mode).
 * Used to enable PWA-specific features like pull-to-refresh.
 *
 * @returns true if running as installed PWA, false if in browser
 */
export function usePwaStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(() => checkStandalone())

  useEffect(() => {
    // Listen for display-mode changes (e.g., user installs PWA mid-session)
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    const minimalUiQuery = window.matchMedia('(display-mode: minimal-ui)')

    const handler = () => setIsStandalone(checkStandalone())

    standaloneQuery.addEventListener('change', handler)
    minimalUiQuery.addEventListener('change', handler)

    return () => {
      standaloneQuery.removeEventListener('change', handler)
      minimalUiQuery.removeEventListener('change', handler)
    }
  }, [])

  return isStandalone
}

/**
 * Non-hook version for use in non-React contexts or initial render.
 * Prefer usePwaStandalone() hook in components.
 */
export function isPwaStandalone(): boolean {
  return checkStandalone()
}
