/**
 * Hook for filtering calendar assignments by association.
 *
 * Extracts unique associations from calendar data and provides
 * filtering functionality similar to the association switcher in API mode.
 */

import { useState, useMemo, useCallback } from 'react';
import type { CalendarAssignment } from '@/api/calendar-api';

/** Special value meaning "show all associations" */
export const ALL_ASSOCIATIONS = '__all__';

export interface UseCalendarAssociationFilterResult {
  /** List of unique associations found in calendar data */
  associations: string[];

  /** Currently selected association filter (or ALL_ASSOCIATIONS) */
  selectedAssociation: string;

  /** Set the selected association filter */
  setSelectedAssociation: (association: string) => void;

  /** Filter calendar assignments by the selected association */
  filterByAssociation: <T extends { association: string | null }>(
    items: T[]
  ) => T[];

  /** Whether there are multiple associations to filter */
  hasMultipleAssociations: boolean;
}

/**
 * Hook for filtering calendar assignments by regional association.
 *
 * @param calendarData - Array of calendar assignments to extract associations from
 * @returns Filter state and helpers for association-based filtering
 *
 * @example
 * ```tsx
 * function CalendarAssignmentsPage() {
 *   const { data: calendarData } = useCalendarAssignments();
 *   const {
 *     associations,
 *     selectedAssociation,
 *     setSelectedAssociation,
 *     filterByAssociation,
 *     hasMultipleAssociations,
 *   } = useCalendarAssociationFilter(calendarData ?? []);
 *
 *   const filteredData = filterByAssociation(calendarData ?? []);
 *
 *   return (
 *     <>
 *       {hasMultipleAssociations && (
 *         <AssociationDropdown
 *           associations={associations}
 *           selected={selectedAssociation}
 *           onChange={setSelectedAssociation}
 *         />
 *       )}
 *       <AssignmentList data={filteredData} />
 *     </>
 *   );
 * }
 * ```
 */
export function useCalendarAssociationFilter(
  calendarData: CalendarAssignment[]
): UseCalendarAssociationFilterResult {
  const [selectedAssociation, setSelectedAssociation] =
    useState<string>(ALL_ASSOCIATIONS);

  // Extract unique associations from calendar data
  const associations = useMemo(() => {
    const uniqueAssociations = new Set<string>();

    for (const item of calendarData) {
      if (item.association) {
        uniqueAssociations.add(item.association);
      }
    }

    // Sort alphabetically for consistent ordering
    return Array.from(uniqueAssociations).sort();
  }, [calendarData]);

  const hasMultipleAssociations = associations.length >= 2;

  // Derive effective selection: if selected association is no longer available,
  // treat as "all" without modifying state (derived during render)
  const effectiveSelection = useMemo(() => {
    if (
      selectedAssociation !== ALL_ASSOCIATIONS &&
      !associations.includes(selectedAssociation)
    ) {
      return ALL_ASSOCIATIONS;
    }
    return selectedAssociation;
  }, [associations, selectedAssociation]);

  const filterByAssociation = useCallback(
    <T extends { association: string | null }>(items: T[]): T[] => {
      if (effectiveSelection === ALL_ASSOCIATIONS) {
        return items;
      }
      return items.filter((item) => item.association === effectiveSelection);
    },
    [effectiveSelection]
  );

  return {
    associations,
    selectedAssociation: effectiveSelection,
    setSelectedAssociation,
    filterByAssociation,
    hasMultipleAssociations,
  };
}
