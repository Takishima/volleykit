import { useState, useCallback } from 'react';
import type { ParsedGameSheet, ParsedTeam } from '../types';
import type { EasterEggType } from '../components/EasterEggModal';

interface EasterEggState {
  /** Whether an Easter egg modal is open */
  isOpen: boolean;
  /** The type of Easter egg to display (null if none) */
  type: EasterEggType | null;
}

interface UseEasterEggDetectionReturn {
  /** Current Easter egg state */
  easterEgg: EasterEggState;
  /** Check parsed OCR data for Easter egg conditions */
  checkForEasterEggs: (data: ParsedGameSheet) => void;
  /** Close the Easter egg modal */
  dismissEasterEgg: () => void;
}

/**
 * Count officials with a specific role in a team
 */
function countOfficialsByRole(team: ParsedTeam, role: string): number {
  return team.officials.filter((o) => o.role === role).length;
}

/**
 * Check if a team has an AC3 (third assistant coach)
 */
function hasAC3(team: ParsedTeam): boolean {
  return team.officials.some((o) => o.role === 'AC3');
}

/**
 * Check if a team has multiple doctors (2+ with M role)
 */
function hasMultipleDoctors(team: ParsedTeam): boolean {
  return countOfficialsByRole(team, 'M') >= 2;
}

/**
 * Hook for detecting Easter egg conditions in OCR results.
 *
 * Detects:
 * - AC3: A team has a third assistant coach
 * - multipleDoctors: A team has 2+ medical staff
 *
 * @example
 * ```tsx
 * const { easterEgg, checkForEasterEggs, dismissEasterEgg } = useEasterEggDetection();
 *
 * // After OCR processing completes
 * useEffect(() => {
 *   if (parsedData) {
 *     checkForEasterEggs(parsedData);
 *   }
 * }, [parsedData, checkForEasterEggs]);
 *
 * return (
 *   <>
 *     {easterEgg.isOpen && easterEgg.type && (
 *       <EasterEggModal
 *         isOpen={easterEgg.isOpen}
 *         type={easterEgg.type}
 *         onClose={dismissEasterEgg}
 *       />
 *     )}
 *   </>
 * );
 * ```
 */
export function useEasterEggDetection(): UseEasterEggDetectionReturn {
  const [easterEgg, setEasterEgg] = useState<EasterEggState>({
    isOpen: false,
    type: null,
  });

  const checkForEasterEggs = useCallback((data: ParsedGameSheet) => {
    // Check for AC3 in either team
    if (hasAC3(data.teamA) || hasAC3(data.teamB)) {
      setEasterEgg({ isOpen: true, type: 'ac3' });
    } else if (hasMultipleDoctors(data.teamA) || hasMultipleDoctors(data.teamB)) {
      // Check for multiple doctors in either team
      setEasterEgg({ isOpen: true, type: 'multipleDoctors' });
    }
  }, []);

  const dismissEasterEgg = useCallback(() => {
    setEasterEgg({ isOpen: false, type: null });
  }, []);

  return {
    easterEgg,
    checkForEasterEggs,
    dismissEasterEgg,
  };
}
