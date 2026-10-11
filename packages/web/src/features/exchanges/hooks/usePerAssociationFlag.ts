import { useCallback, useMemo } from 'react'

/**
 * Reads a boolean preference stored per association and offers a toggle for it.
 *
 * Several exchange filters ("hide own", "hide not takeable") are kept as an
 * association-code -> boolean map in the settings store. This hook resolves
 * the current association's value, falling back to `defaultValue` when the
 * association has no entry yet, and flips it through the store setter.
 *
 * @param map - The per-association map from the settings store
 * @param setter - The store setter that writes one association's value
 * @param associationCode - The active association, or undefined when none is active
 * @param defaultValue - The value to report while the association has no entry
 * @returns The resolved value and a toggle (a no-op without an association)
 */
export function usePerAssociationFlag(
  map: Record<string, boolean>,
  setter: (associationCode: string, enabled: boolean) => void,
  associationCode: string | undefined,
  defaultValue: boolean
): [value: boolean, toggle: () => void] {
  const value = useMemo(() => {
    if (associationCode && map[associationCode] !== undefined) {
      return map[associationCode]
    }
    return defaultValue
  }, [associationCode, map, defaultValue])

  const toggle = useCallback(() => {
    if (associationCode) {
      setter(associationCode, !value)
    }
  }, [associationCode, setter, value])

  return [value, toggle]
}
